import { describe, expect, it, vi } from "vitest";
import market, { type MarketResponse } from "../api/market";
import {
  detectCountry,
  markets,
  PREFERENCE_KEY,
  readPreferences,
  resolvePreferences,
} from "../src/localization/preferences";
import {
  catalogue,
  hydrateMessages,
  localiseText,
  messageReference,
  renderMessage,
  serialiseState,
} from "../src/localization/catalogue";
import { makeSeed, SCENARIOS } from "../src/domain/seed";
import { execute } from "../src/domain/engine";
import { convert, dateTime, money, summary } from "../src/domain/selectors";
import { demoAssistant } from "../src/domain/assistant";
import type { Country, Filters, Language, State } from "../src/domain/types";
const filters: Filters = {
  country: "All",
  city: "",
  propertyId: "",
  team: "",
  from: "2026-10-01",
  to: "2026-10-31",
  currency: "GBP",
  search: "",
};
const resolve = (
  values: Partial<Parameters<typeof resolvePreferences>[0]> = {},
) =>
  resolvePreferences({
    search: "",
    saved: null,
    country: null,
    languages: [],
    ...values,
  });
function response(country?: string | string[], method = "GET") {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  const res: MarketResponse = {
    statusCode: 0,
    setHeader: (key, value) => {
      headers[key] = value;
    },
    end: (value) => {
      body = value;
    },
  };
  market(
    {
      method,
      headers: {
        "x-vercel-ip-country": country,
        "x-forwarded-for": "192.0.2.10",
      },
    },
    res,
  );
  return { headers, body, status: res.statusCode };
}
describe("Private Vercel detection", () => {
  it.each(["ES", "IT", "GB"])(
    "returns only %s and never a raw IP",
    (country) => {
      const r = response(country);
      expect(r.status).toBe(200);
      expect(JSON.parse(r.body!)).toEqual({ country });
      expect(r.body).not.toContain("192.0.2");
      expect(r.headers["Cache-Control"]).toContain("private, no-store");
      expect(r.headers["CDN-Cache-Control"]).toBe("no-store");
      expect(r.headers["Vercel-CDN-Cache-Control"]).toBe("no-store");
      expect(r.headers.Vary).toBe("x-vercel-ip-country");
    },
  );
  it.each([undefined, "FR", "US", "es", "ES,IT", ["ES", "IT"]])(
    "rejects missing/unsupported/malformed header %s",
    (country) =>
      expect(JSON.parse(response(country).body!)).toEqual({ country: null }),
  );
  it("does not carry a previous visitor's country into the next response", () => {
    expect(JSON.parse(response("ES").body!)).toEqual({ country: "ES" });
    expect(JSON.parse(response("IT").body!)).toEqual({ country: "IT" });
    expect(JSON.parse(response().body!)).toEqual({ country: null });
    expect(response("GB", "HEAD").body).toBeUndefined();
    expect(response("GB", "POST").status).toBe(405);
  });
  it("bounds a hanging lookup and gracefully handles network errors and absent headers", async () => {
    vi.useFakeTimers();
    const hanging = vi.fn(() => new Promise<Response>(() => {}));
    const pending = detectCountry(hanging, 50);
    await vi.advanceTimersByTimeAsync(50);
    expect(await pending).toBeNull();
    expect(hanging.mock.calls).toHaveLength(1);
    vi.useRealTimers();
    const request = vi.fn<typeof fetch>(
      async () => new Response('{"country":"ES"}'),
    );
    expect(await detectCountry(request)).toBe("ES");
    expect(request.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
    });
    expect(
      await detectCountry(async () => {
        throw Error("offline");
      }),
    ).toBeNull();
    expect(
      await detectCountry(async () => new Response('{"country":null}')),
    ).toBeNull();
  });
});
describe("Preference priority and migration", () => {
  const manual = {
    version: 2 as const,
    mode: "manual" as const,
    market: "uk" as const,
    language: "it" as const,
    currency: "GBP" as const,
  };
  it.each(["es", "it", "uk"] as const)(
    "valid %s outreach overrides manual/IP/browser preferences",
    (key) => {
      expect(
        resolve({
          search: `?utm=test&market=${key}&campaign=one`,
          saved: manual,
          country: "IT",
          languages: ["es-ES"],
        }),
      ).toMatchObject({
        market: key,
        language: markets[key].language,
        currency: markets[key].currency,
        source: "url",
      });
    },
  );
  it("manual selection wins over IP and retains independently selected language/currency", () =>
    expect(
      resolve({ saved: manual, country: "ES", languages: ["es"] }),
    ).toMatchObject({
      market: "uk",
      language: "it",
      currency: "GBP",
      source: "manual",
    }));
  it.each(["ES", "IT", "GB"])(
    "uses supported %s IP before browser language",
    (country) =>
      expect(resolve({ country, languages: ["fr-FR", "es-ES"] }).source).toBe(
        "ip",
      ),
  );
  it.each([
    ["FR", ["it-IT"], "it"],
    [null, ["fr", "es-MX"], "es"],
    [null, ["en-US"], "uk"],
    [null, ["fr"], "uk"],
  ])(
    "uses browser/final fallback for %s / %s",
    (country, languages, selected) =>
      expect(
        resolve({ country, languages: languages as string[] }).market,
      ).toBe(selected),
  );
  it("ignores invalid URL parameters, corrupt preferences and old automatically saved EN", () => {
    expect(resolve({ search: "?market=fr", country: "ES" }).market).toBe("es");
    const legacy = { language: "en" };
    expect(
      readPreferences({
        getItem: (key) =>
          key === PREFERENCE_KEY ? JSON.stringify(legacy) : "en",
      }),
    ).toBeNull();
    expect(
      resolve({
        saved: readPreferences({ getItem: () => JSON.stringify(legacy) }),
        country: "ES",
      }).language,
    ).toBe("es");
    expect(
      readPreferences({
        getItem: () => '{"version":2,"mode":"manual","market":"xx"}',
      }),
    ).toBeNull();
    expect(readPreferences({ getItem: () => "{broken" })).toBeNull();
    expect(
      resolve({ saved: { version: 2, mode: "automatic" }, country: "IT" })
        .market,
    ).toBe("it");
  });
});
describe("Financial and operational invariants", () => {
  it("formats UK/Spanish/Italian amounts with grouping and correct symbols", () => {
    expect(money(123456, "GBP", "en")).toBe("£1,234.56");
    expect(money(123456, "EUR", "es").replace(/\s/g, " ")).toBe("1.234,56 €");
    expect(money(123456, "EUR", "it").replace(/\s/g, " ")).toBe("1.234,56 €");
    expect(convert(10000, "EUR", "GBP")).toBe(8600);
    expect(convert(8600, "GBP", "EUR")).toBe(10000);
  });
  it("converts display totals without mutating native ledgers, quantities, bounds or deadlines", () => {
    const s = makeSeed(),
      before = JSON.stringify(s);
    const gbp = summary(s, filters),
      eur = summary(s, { ...filters, currency: "EUR" });
    expect(eur.native).toEqual(gbp.native);
    expect(eur.owner).toBe(
      eur.native.reduce(
        (sum, l) => sum + convert(l.owner, l.currency, "EUR"),
        0,
      ),
    );
    expect(eur.owner).not.toBe(gbp.owner);
    const translated = execute(s, {
      type: "settings",
      values: { language: "it" },
    });
    expect(summary(translated, filters)).toEqual(gbp);
    expect(translated.bookings).toEqual(s.bookings);
    expect(translated.rates).toEqual(s.rates);
    expect(translated.tasks).toEqual(s.tasks);
    expect(translated.properties).toEqual(s.properties);
    expect(JSON.stringify(s)).toBe(before);
    for (const language of ["en", "es", "it"]) {
      expect(
        dateTime("2026-10-20T08:00:00.000Z", language, "Europe/Madrid"),
      ).toContain("10:00");
      expect(
        dateTime("2026-10-20T08:00:00.000Z", language, "Europe/London"),
      ).toContain("09:00");
    }
  });
});
const prose = (s: State) =>
  [
    ...s.events.map((e) => e.title),
    ...s.runs.flatMap((r) => [
      r.trigger,
      r.evidence,
      r.policy,
      r.action,
      r.expected,
      r.result,
      r.verification,
    ]),
    ...s.tasks.flatMap((t) => [t.title, t.notes]),
    ...s.messages.map((m) => m.text),
    ...s.approvals.flatMap((a) => [a.title, ...a.evidence]),
  ].filter(
    (text) =>
      Boolean(text) &&
      !/^(?:issue|msg|inspect|p|rate|dup|bill|draft|arrival)-[\w-]+$/.test(
        text,
      ),
  );
describe("Complete dynamic copy and persistence", () => {
  it("has two non-empty translations and no message-code collisions", () => {
    const codes = new Set<string>();
    for (const [source, translations] of Object.entries(catalogue)) {
      expect(translations).toHaveLength(2);
      expect(translations.every(Boolean)).toBe(true);
      const code = messageReference(source)!.$message;
      expect(codes.has(code), source).toBe(false);
      codes.add(code);
    }
  });
  it.each(["en", "es", "it"] as Language[])(
    "runs every scenario in %s and translates generated evidence and events after restore",
    (language) => {
      const unmatched = new Set<string>();
      for (const country of ["UK", "Spain", "Italy"] as Country[])
        for (const scenario of SCENARIOS) {
          let s = execute(makeSeed(), {
            type: "settings",
            values: { language },
          });
          s = execute(s, { type: "startScenario", id: scenario.id, country });
          for (let step = 0; step < scenario.steps.length; step++) {
            s = execute(s, { type: "stepScenario" });
            const restored = hydrateMessages(
              JSON.parse(serialiseState(s)),
            ) as State;
            expect(restored.bookings).toEqual(s.bookings);
            expect(restored.tasks.map((t) => [t.id, t.due])).toEqual(
              s.tasks.map((t) => [t.id, t.due]),
            );
            // English engine prose remains canonical so replay/deduplication still work.
            expect(restored.events).toEqual(s.events);
            for (const text of prose(restored)) {
              const ref = messageReference(text);
              if (!ref) unmatched.add(text);
              else if (/[A-Za-z]{4}/.test(text)) {
                expect(renderMessage(ref, "es"), text).not.toBe(text);
                expect(renderMessage(ref, "it"), text).not.toBe(text);
              }
            }
            s = restored;
          }
          expect(s.scenario?.step).toBe(scenario.steps.length);
          const before = [s.tasks.length, s.approvals.length, s.runs.length];
          s = execute(s, { type: "stepScenario" });
          expect([s.tasks.length, s.approvals.length, s.runs.length]).toEqual(
            before,
          );
        }
      expect([...unmatched]).toEqual([]);
    },
    60000,
  );
  it("persists event/assistant text as codes and parameters and preserves user-authored text", () => {
    let s = execute(makeSeed(), { type: "runAgents" });
    s = execute(s, {
      type: "chat",
      message: {
        id: "user",
        role: "user",
        text: "Cleaning incomplete",
        sources: [],
      },
    });
    const raw = JSON.parse(serialiseState(s));
    expect(
      raw.events.every((e: { title: unknown }) => typeof e.title === "object"),
    ).toBe(true);
    expect(raw.chat[0].text).toBe("Cleaning incomplete");
    const hydrated = hydrateMessages(raw) as State;
    expect(hydrated.bookings).toEqual(s.bookings);
    expect(hydrated.rates).toEqual(s.rates);
    expect(hydrated.events).toEqual(s.events);
    for (let i = 0; i < s.messages.length; i++)
      for (const language of ["en", "es", "it"] as Language[])
        expect(localiseText(hydrated.messages[i].text, language)).toBe(
          localiseText(s.messages[i].text, language),
        );
    expect(hydrateMessages(JSON.parse(serialiseState(hydrated)))).toEqual(
      hydrated,
    );
    const ref = messageReference("Heating repair · Willow Townhouse")!;
    expect(renderMessage(ref, "es")).not.toContain("Heating repair");
    expect(localiseText("Inspection not signed off", "it")).not.toContain(
      "Inspection",
    );
  });
});
describe("Equivalent supported copilot questions", () => {
  it.each([
    [
      "en",
      "Draft a reply in Spanish",
      "Propose pricing",
      "Create growth tasks",
      "Assign an inspection",
      "What is our owner payable?",
      "Show everything the agents did today",
      "What needs attention before arrivals?",
    ],
    [
      "es",
      "Redacta una respuesta en español",
      "Propón tarifas",
      "Crea tareas de crecimiento",
      "Asigna una inspección",
      "¿Qué importe corresponde al propietario?",
      "¿Qué hicieron los agentes hoy?",
      "¿Qué necesita atención antes de las llegadas?",
    ],
    [
      "it",
      "Prepara una bozza di risposta",
      "Proponi tariffe",
      "Crea attività di crescita",
      "Assegna un’ispezione",
      "Qual è l’importo al proprietario?",
      "Cosa hanno fatto gli agenti oggi?",
      "Cosa richiede attenzione prima degli arrivi?",
    ],
  ])(
    "supports %s scripted intents and translates replies",
    (language, draft, pricing, growth, assign, finance, agents, attention) => {
      const s = makeSeed();
      s.language = language as Language;
      const scoped = { ...filters, country: "UK" as const, propertyId: "p-1" };
      for (const [question, command] of [
        [draft, "draftReply"],
        [pricing, "proposePricing"],
        [growth, "growthPlan"],
        [assign, "assignTask"],
      ]) {
        const result = demoAssistant.respond(s, scoped, question);
        expect(JSON.parse(result.action!), question).toMatchObject({
          type: command,
        });
        const ref = messageReference(result.text);
        expect(ref, result.text).not.toBeNull();
        if (language !== "en")
          expect(localiseText(result.text, language as Language)).not.toBe(
            result.text,
          );
      }
      for (const question of [finance, agents, attention]) {
        const result = demoAssistant.respond(s, scoped, question);
        expect(result.text).not.toContain("unsupported requests");
        expect(messageReference(result.text), result.text).not.toBeNull();
      }
    },
  );
});
describe("Older prose and translated supported suggestions", () => {
  it("recognises previously persisted foreign replies and renders them in another locale", () => {
    const legacy =
      "Puedo preparar una respuesta contextual de demostración. Se crea un borrador; el envío sensible necesita aprobación.";
    const ref = messageReference(legacy)!;
    expect(ref).not.toBeNull();
    expect(renderMessage(ref, "it")).not.toContain("Puedo");
    expect(renderMessage(ref, "en")).toContain("scripted reply");
    for (const language of ["en", "es", "it"] as Language[]) {
      let s = makeSeed();
      s.properties[1].clean = true;
      s.properties[1].photo = true;
      s.properties[1].inspection = true;
      s = execute(s, { type: "draftReply", id: "msg-2", language });
      const reply = s.messages.find((m) => m.id === `draft-msg-2-${language}`)!;
      const encoded = messageReference(reply.text)!;
      expect(encoded, reply.text).not.toBeNull();
      expect(renderMessage(encoded, "es")).not.toContain("Your home");
      expect(renderMessage(encoded, "it")).not.toContain("Su alojamiento");
    }
  });
  it("answers Spanish readiness and translated city/type questions with linked evidence", () => {
    const s = makeSeed();
    for (const question of [
      "¿Por qué Willow Townhouse no está listo?",
      "¿Por qué la casa adosada de Londres no está lista?",
      "Perché la casa a schiera di Londra non è pronta?",
    ]) {
      const answer = demoAssistant.respond(s, filters, question);
      expect(answer.sources).toContain("p-1");
      expect(answer.text).not.toContain("unsupported requests");
    }
  });
});
it("formats currencies inside copilot ledger summaries without changing their native currencies", () => {
  expect(
    localiseText("GBP £1,234.56 · EUR €0.00", "es").replace(/\s/g, " "),
  ).toBe("GBP 1.234,56 £ · EUR 0,00 €");
  expect(localiseText("GBP -£1,234.56", "it").replace(/\s/g, " ")).toBe(
    "GBP -1.234,56 £",
  );
});
