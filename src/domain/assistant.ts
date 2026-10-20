import type { Chat, Command, Filters, State } from "./types";
import { summary, readiness, money, scopedProperties } from "./selectors";
import { day } from "./seed";
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
  es: {
    outside:
      "Puedo consultar registros de demo, preparar respuestas, proponer precios, asignar inspecciones y crear tareas. No puedo acceder a servicios reales ni realizar solicitudes no admitidas.",
    choose:
      "¿Qué alojamiento quiere consultar? Elija una fuente o seleccione un alojamiento en los filtros.",
    ready: "La preparación se calcula a partir de estas evidencias:",
    draft:
      "Puedo preparar una respuesta contextual de demostración. Se crea un borrador; el envío sensible necesita aprobación.",
    pricing:
      "Puedo proponer una reducción del 8% para cinco noches disponibles, dentro de los límites. Las reservas confirmadas no cambian.",
    growth:
      "Puedo crear tres tareas vinculadas a 30 / 60 / 90 días. Es una hipótesis medible, no una promesa de ingresos.",
    assign:
      "Hay un inspector disponible en la zona. La asignación comprobará la capacidad del turno.",
    runs: "Estas son las ejecuciones de agentes filtradas. Abra las fuentes para consultar evidencia y resultados.",
  },
  it: {
    outside:
      "Posso consultare record demo, preparare risposte, proporre prezzi, assegnare ispezioni e creare attività. Non posso accedere a servizi reali o eseguire richieste non supportate.",
    choose:
      "Quale alloggio intendi? Scegli una fonte o seleziona un alloggio nei filtri.",
    ready: "La preparazione deriva dalle seguenti evidenze:",
    draft:
      "Posso preparare una risposta contestuale di esempio. Viene creata una bozza; l’invio sensibile richiede approvazione.",
    pricing:
      "Posso proporre una riduzione dell’8% per cinque notti disponibili, entro i limiti. Le prenotazioni confermate restano invariate.",
    growth:
      "Posso creare tre attività collegate a 30 / 60 / 90 giorni. È un’ipotesi misurabile, non una promessa di ricavi.",
    assign:
      "Ho trovato un ispettore disponibile nella zona. L’assegnazione ricontrollerà la capacità del turno.",
    runs: "Ecco le esecuzioni filtrate degli agenti. Apri le fonti per evidenze, regole e risultati.",
  },
};
export const demoAssistant: AssistantAdapter = {
  respond(state, filters, text) {
    const q = text.toLowerCase(),
      s = summary(state, filters),
      ps = scopedProperties(state, filters),
      lang = state.language,
      c = copy[lang],
      result: Chat = {
        id: `chat-a-${state.revision}`,
        role: "assistant",
        text: c.outside,
        sources: [],
      };
    let targets = ps.filter(
      (p) =>
        q.includes(p.name.toLowerCase()) ||
        (q.includes(p.city.toLowerCase()) &&
          (q.includes(p.type.toLowerCase()) ||
            q.includes("home") ||
            q.includes("casa") ||
            q.includes("alojamiento"))),
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
        {
          en: `Owner payable for the filtered period is ${money(s.owner, filters.currency, lang)} (display conversion). Native ledgers: `,
          es: `El importe al propietario del período filtrado es ${money(s.owner, filters.currency, lang)} (conversión de visualización). Libros nativos: `,
          it: `L’importo al proprietario per il periodo filtrato è ${money(s.owner, filters.currency, lang)} (conversione di visualizzazione). Registri nativi: `,
        }[lang] +
        s.native
          .map((l) => `${l.currency} ${money(l.owner, l.currency, lang)}`)
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
            lang === "es"
              ? "No hay una asignación viable. Revise la tarea y el turno."
              : lang === "it"
                ? "Non esiste un’assegnazione fattibile. Controlla attività e turno."
                : "No feasible assignment is available. Review the task and shift; I have not assigned anyone.";
      }
    } else if (
      /draft|reply|spanish|respuesta|responder|risposta|bozza/.test(q)
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
            language: /spanish|español|spagnol/.test(q)
              ? "es"
              : /italian|italiano/.test(q)
                ? "it"
                : lang,
          });
      }
    } else if (/price|prices|pricing|precio|prezz/.test(q)) {
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
    } else if (/source|fuente|fonte|alert/.test(q)) {
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
      /ready|attention|arrival|atención|llegad|pront|attenzione|arriv|not ready|performance|rendimiento|andamento/.test(
        q,
      )
    ) {
      if (first && targets.length === 1) {
        const r = readiness(state, first);
        result.text = `${first.name}: ${r.status}. ${c.ready} ${r.blockers.join("; ") || { en: "All required evidence is complete.", es: "Todas las evidencias están completas.", it: "Tutte le evidenze sono complete." }[lang]}`;
        result.sources = [
          first.id,
          ...state.issues
            .filter((i) => i.propertyId === first.id && !i.verified)
            .map((i) => i.id),
          ...state.tasks
            .filter((t) => t.propertyId === first.id && t.kind === "Inspection")
            .map((t) => t.id),
        ];
        if (/performance|rendimiento|andamento/.test(q))
          result.text =
            {
              en: "The current record supports reviewing channel fees and posted costs; it does not prove a causal performance decline. ",
              es: "Los registros permiten revisar comisiones y costes, pero no demuestran una caída causal. ",
              it: "I record consentono di esaminare commissioni e costi, senza dimostrare un calo causale. ",
            }[lang] + result.text;
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
        result.text = `${c.ready} ${risky.map((p) => `${p.name}: ${readiness(state, p).blockers.join(", ")}`).join(" · ") || { en: "No arrival blockers in the selected portfolio.", es: "No hay bloqueos de llegadas en la cartera seleccionada.", it: "Nessun blocco degli arrivi nel portafoglio selezionato." }[lang]}`;
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
