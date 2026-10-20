import type { Chat, Command, Filters, State } from "./types";
import { summary, readiness, money, scopedProperties } from "./selectors";
import { day } from "./seed";
const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const cityAliases: Record<string, string[]> = {
  London: ["londres", "londra"],
  Rome: ["roma"],
  Florence: ["florencia", "firenze"],
  Edinburgh: ["edimburgo"],
  Seville: ["sevilla", "siviglia"],
  Milan: ["milan", "milano"],
};
const homeTypes: Record<string, string[]> = {
  Townhouse: ["casa adosada", "casa a schiera"],
  Apartment: ["apartamento", "appartamento"],
  Villa: ["villa"],
  Cottage: ["casa rural", "cottage"],
};
export interface AssistantAdapter {
  respond: (state: State, filters: Filters, text: string) => Chat;
}
const copy = {
  en: {
    outside:
      "I can inspect demo records, prepare guest replies, propose rates, assign inspections and create tasks. I cannot access live services or perform unsupported requests. Try one of the suggested questions.",
    choose:
      "Which home do you mean? Choose a source below or select a property in the portfolio filters.",
    ready: "Readiness is derived from the following evidence:",
    draft:
      "I can prepare a contextual, scripted reply. The action creates a draft; sensitive sending still requires approval.",
    pricing:
      "I can propose an 8% reduction on up to five available nights next week, within the property bounds. Confirmed booking values remain unchanged.",
    growth:
      "I can create three linked 30 / 60 / 90 day tasks. This is a measurable hypothesis, not a promise of revenue.",
    assign:
      "I found an available inspector with the right service area. Assignment will revalidate shift capacity.",
    runs: "Here are the filtered agent runs. Open the sources for evidence, policy checks and outcomes.",
  },
};
export const demoAssistant: AssistantAdapter = {
  respond(state, filters, text) {
    const q = normalise(text),
      s = summary(state, filters),
      ps = scopedProperties(state, filters),
      lang = state.language,
      c = copy.en,
      result: Chat = {
        id: `chat-a-${state.revision}`,
        role: "assistant",
        text: c.outside,
        sources: [],
      };
    let targets = ps.filter(
      (p) =>
        q.includes(normalise(p.name)) ||
        ([p.city, ...(cityAliases[p.city] || [])].some((city) =>
          q.includes(normalise(city)),
        ) &&
          ([p.type, ...(homeTypes[p.type] || [])].some((type) =>
            q.includes(normalise(type)),
          ) ||
            q.includes("home") ||
            q.includes("casa") ||
            q.includes("alojamiento") ||
            q.includes("alloggio"))),
    );
    if (!targets.length && filters.propertyId)
      targets = ps.filter((p) => p.id === filters.propertyId);
    const contextual = state.chat
      .slice()
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          m.sources.some((id) => ps.some((p) => p.id === id)),
      );
    if (
      !targets.length &&
      /\bits\b|\bit\b|su |sua |its inspection/.test(q) &&
      contextual
    )
      targets = ps.filter((p) => contextual.sources.includes(p.id));
    const first = targets[0];
    const needsProperty = () => {
      if (targets.length === 1) return false;
      result.text = c.choose;
      result.sources = (targets.length ? targets : ps)
        .slice(0, 5)
        .map((p) => p.id);
      return true;
    };
    const action = (command: Command) =>
      (result.action = JSON.stringify(command));
    if (/owner payable|propietario|proprietario|earnings|finance/.test(q)) {
      result.text =
        `Owner payable for the filtered period is ${money(s.owner, filters.currency, "en")} (display conversion). Native ledgers: ` +
        s.native
          .map((l) => `${l.currency} ${money(l.owner, l.currency, "en")}`)
          .join(" · ");
      result.sources = s.properties.slice(0, 4).map((p) => p.id);
    } else if (
      /everything.*agents|agents.*today|agentes|agenti|activity|did today/.test(
        q,
      )
    ) {
      const runs = state.runs.filter(
        (r) =>
          r.time.slice(0, 10) === day(state.now) &&
          r.sources.some(
            (id) =>
              s.ids.includes(id) ||
              [
                ...state.issues,
                ...state.tasks,
                ...state.bills,
                ...state.inventory,
              ].some((x) => x.id === id && s.ids.includes(x.propertyId)),
          ),
      );
      result.text = `${c.runs} (${runs.length})`;
      result.sources = runs.slice(0, 6).map((r) => r.id);
    } else if (/assign|asigna|assegna/.test(q)) {
      if (!needsProperty()) {
        const task = state.tasks.find(
            (t) =>
              t.propertyId === first.id &&
              t.kind === "Inspection" &&
              t.status !== "Complete",
          ),
          staff = state.staff.find(
            (x) =>
              x.country === first.country &&
              (x.city === first.city || x.city === "All") &&
              x.skills.includes("Inspection") &&
              x.available &&
              state.tasks.filter(
                (t) =>
                  t.assignee === x.id &&
                  day(t.due) === day(state.now) &&
                  t.status !== "Complete",
              ).length < 4,
          );
        result.sources = [first.id, ...(task ? [task.id] : [])];
        if (task && staff) {
          result.text = `${c.assign} ${staff.name} → ${task.title}`;
          action({ type: "assignTask", id: task.id, staffId: staff.id });
        } else
          result.text =
            "No feasible assignment is available. Review the task and shift; I have not assigned anyone.";
      }
    } else if (
      /draft|reply|spanish|respuesta|responder|redacta|borrador|risposta|rispondi|bozza/.test(
        q,
      )
    ) {
      if (!needsProperty()) {
        const m = state.messages.find(
          (m) => m.propertyId === first.id && m.direction === "Inbound",
        );
        result.text = c.draft;
        result.sources = [first.id, ...(m ? [m.id] : [])];
        if (m)
          action({
            type: "draftReply",
            id: m.id,
            language: /spanish|espanol|spagnol/.test(q)
              ? "es"
              : /italian|italiano/.test(q)
                ? "it"
                : lang,
          });
      }
    } else if (/price|prices|pricing|precio|tarifa|prezz|tariff/.test(q)) {
      if (!needsProperty()) {
        result.text = c.pricing;
        result.sources = [first.id];
        action({ type: "proposePricing", propertyId: first.id });
      }
    } else if (
      /growth|crecimiento|crescita|create tasks|crear tareas|crea attivit/.test(
        q,
      )
    ) {
      if (!needsProperty()) {
        result.text = c.growth;
        result.sources = [first.id];
        action({ type: "growthPlan", propertyId: first.id });
      }
    } else if (/source|fuente|fonte|alert|origen|origine|aviso/.test(q)) {
      const selected =
        first || ps.find((p) => readiness(state, p).status !== "Ready");
      if (selected) {
        result.text = c.ready;
        result.sources = [
          selected.id,
          ...state.issues
            .filter((i) => i.propertyId === selected.id && !i.verified)
            .map((i) => i.id),
          ...state.tasks
            .filter(
              (t) => t.propertyId === selected.id && t.kind === "Inspection",
            )
            .map((t) => t.id),
        ];
      }
    } else if (
      /ready|attention|arrival|atencion|llegad|list[oa]|preparad|pront|attenzione|arriv|not ready|performance|rendimiento|andamento|prestazion/.test(
        q,
      )
    ) {
      if (first && targets.length === 1) {
        const r = readiness(state, first);
        result.text = `${first.name}: ${r.status}. ${c.ready} ${r.blockers.join("; ") || "All required evidence is complete."}`;
        result.sources = [
          first.id,
          ...state.issues
            .filter((i) => i.propertyId === first.id && !i.verified)
            .map((i) => i.id),
          ...state.tasks
            .filter((t) => t.propertyId === first.id && t.kind === "Inspection")
            .map((t) => t.id),
        ];
        if (/performance|rendimiento|andamento|prestazion/.test(q))
          result.text =
            "The current record supports reviewing channel fees and posted costs; it does not prove a causal performance decline. " +
            result.text;
      } else {
        const risky = ps.filter(
          (p) =>
            readiness(state, p).status !== "Ready" &&
            state.bookings.some(
              (b) =>
                b.propertyId === p.id &&
                b.start === day(state.now) &&
                b.status !== "Cancelled",
            ),
        );
        result.text = `${c.ready} ${risky.map((p) => `${p.name}: ${readiness(state, p).blockers.join(", ")}`).join(" · ") || "No arrival blockers in the selected portfolio."}`;
        result.sources = risky.map((p) => p.id);
      }
    }
    return result;
  },
};
export const suggestions = {
  en: [
    "What needs attention before today's arrivals?",
    "Why is the London townhouse not ready?",
    "What is our owner payable for this month?",
    "Show everything the agents did today.",
  ],
  es: [
    "¿Qué necesita atención antes de las llegadas?",
    "¿Por qué Willow Townhouse no está listo?",
    "¿Qué importe corresponde al propietario?",
    "¿Qué hicieron los agentes hoy?",
  ],
  it: [
    "Cosa richiede attenzione prima degli arrivi?",
    "Perché Willow Townhouse non è pronto?",
    "Qual è l’importo al proprietario?",
    "Cosa hanno fatto gli agenti oggi?",
  ],
};
