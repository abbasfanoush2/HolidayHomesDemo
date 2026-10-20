import entries from "./catalogue.json" with { type: "json" };
import legacyAliases from "./legacy-aliases.json" with { type: "json" };
import type { Language } from "../domain/types";
import { localeFor } from "./preferences";
export const catalogue: Record<string, string[]> = entries;
const normalise = (s: string) => s.replace(/\s+/g, " ").trim();
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
};
export interface MessageReference {
  $message: string;
  params: Record<string, string | MessageReference>;
  $case?: "lower" | "upper";
}
const codes = new Map(
  Object.keys(catalogue).map((key) => [`copy.${hash(key)}`, key]),
);
const canonical = new Map<string, string>();
const exactSources = new Map(
  Object.keys(catalogue).map((source) => [normalise(source), source]),
);
for (const [source, translations] of Object.entries(catalogue)) {
  for (const text of translations)
    canonical.set(normalise(text).toLowerCase(), source);
}
// Canonical source strings take priority over coincidentally identical translations.
for (const source of Object.keys(catalogue))
  canonical.set(normalise(source).toLowerCase(), source);
for (const [alias, source] of Object.entries(legacyAliases))
  canonical.set(normalise(alias).toLowerCase(), source);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.keys(catalogue)
  .filter((k) => /\{\d+\}/.test(k))
  .flatMap((source) =>
    [source, ...catalogue[source]].map((pattern) => ({ source, pattern })),
  );
patterns.push(
  ...Object.entries(legacyAliases)
    .filter(([alias]) => /\{\d+\}/.test(alias))
    .map(([pattern, source]) => ({ source, pattern })),
);
const templates = patterns
  .map(({ source, pattern }) => {
    const slots: string[] = [];
    const parts = normalise(pattern).split(/(\{\d+\})/);
    const regexp = new RegExp(
      "^" +
        parts
          .map((p) =>
            /^\{\d+\}$/.test(p)
              ? (slots.push(p.slice(1, -1)), "([\\s\\S]*?)")
              : escape(p),
          )
          .join("") +
        "$",
      "i",
    );
    return {
      source,
      regexp,
      slots,
      specificity: pattern.replace(/\{\d+\}/g, "").length,
    };
  })
  .sort((a, b) => b.specificity - a.specificity);
const referenceCache = new Map<string, MessageReference | null>();
export function messageReference(
  text: string,
  depth = 0,
): MessageReference | null {
  if (depth > 6) return null;
  if (referenceCache.has(text)) return referenceCache.get(text)!;
  const result = matchReference(text, depth);
  if (referenceCache.size > 12000) referenceCache.clear();
  referenceCache.set(text, result);
  return result;
}
function matchReference(text: string, depth: number): MessageReference | null {
  const value = normalise(text);
  const exact = exactSources.get(value) || canonical.get(value.toLowerCase());
  if (exact)
    return {
      $message: `copy.${hash(exact)}`,
      params: {},
      ...(value === exact.toLowerCase() && value !== exact
        ? { $case: "lower" as const }
        : value === exact.toUpperCase() && value !== exact
          ? { $case: "upper" as const }
          : {}),
    };
  for (const t of templates) {
    const match = value.match(t.regexp);
    if (!match) continue;
    const params: MessageReference["params"] = {};
    t.slots.forEach((key, i) => {
      params[key] = messageReference(match[i + 1], depth + 1) || match[i + 1];
    });
    return { $message: `copy.${hash(t.source)}`, params };
  }
  return null;
}
export function renderMessage(
  message: MessageReference,
  language: Language,
): string {
  const source = codes.get(message.$message);
  if (!source) return message.$message;
  const translated =
    language === "en" ? source : catalogue[source][language === "es" ? 0 : 1];
  const result = translated.replace(/\{(\d+)\}/g, (_, key: string) => {
    const p = message.params[key];
    return typeof p === "object"
      ? renderMessage(p, language)
      : language === "en"
        ? p || ""
        : localiseText(p || "", language, 1);
  });
  return message.$case === "lower"
    ? result.toLocaleLowerCase(localeFor(language))
    : message.$case === "upper"
      ? result.toLocaleUpperCase(localeFor(language))
      : result;
}
const targetText = {
  es: new Set(Object.values(catalogue).map((p) => normalise(p[0]))),
  it: new Set(Object.values(catalogue).map((p) => normalise(p[1]))),
};
const englishText = new Set(
  Object.keys(catalogue).map((k) => normalise(k).toLowerCase()),
);
const cache = new Map<string, string>();
const missing = new Set<string>();
export function missingCopy() {
  return [...missing];
}
export function localiseText(
  raw: string,
  language: Language,
  depth = 0,
): string {
  if (!raw || depth > 7) return raw;
  const cacheKey = `${language}:${raw}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const value = normalise(raw);
  if (language !== "en" && targetText[language].has(value)) return raw;
  if (language === "en" && englishText.has(value.toLowerCase())) return raw;
  let result = value;
  const exact = exactSources.get(value) || canonical.get(value.toLowerCase());
  if (exact)
    result =
      language === "en" ? exact : catalogue[exact][language === "es" ? 0 : 1];
  else if (/^-?[£€]\s*[\d,]+(?:\.\d+)?$/.test(value)) {
    const currency = value.includes("£") ? "GBP" : "EUR";
    result = new Intl.NumberFormat(localeFor(language), {
      style: "currency",
      currencyDisplay: "narrowSymbol",
      currency,
      useGrouping: "always",
    }).format(Number(value.replace(/[£€,\s]/g, "")));
  } else if (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
    result = new Intl.DateTimeFormat(localeFor(language), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value + "T12:00:00Z"));
  else {
    let matched = false;
    if (/[A-Za-z]{3}/.test(value))
      for (const t of templates) {
        const match = value.match(t.regexp);
        if (!match) continue;
        const params: Record<string, string> = {};
        t.slots.forEach((key, i) => {
          params[key] = localiseText(match[i + 1], language, depth + 1);
        });
        const pattern =
          language === "en"
            ? t.source
            : catalogue[t.source][language === "es" ? 0 : 1];
        result = pattern.replace(
          /\{(\d+)\}/g,
          (_, key: string) => params[key] || "",
        );
        matched = true;
        break;
      }
    if (!matched && depth < 6) {
      const parts = value.split(
        /( · | → |; |: |, (?=[A-Za-z])|\n|(?<=[.!?]) (?=[A-Z]))/,
      );
      if (parts.length === 1 && /[.!?:]$/.test(value)) {
        const core = value.slice(0, -1);
        const translated = localiseText(core, language, depth + 1);
        if (translated !== core) result = translated + value.slice(-1);
      }
      if (parts.length > 1)
        result = parts
          .map((p) =>
            /[A-Za-z]{3}/.test(p) ? localiseText(p, language, depth + 1) : p,
          )
          .join("");
    }
  }
  // Composite copilot/evidence paragraphs can contain several native-currency
  // tokens. Reformat each token in its own currency; FX is handled by selectors.
  if (language !== "en")
    result = result.replace(/-?[£€]\s*\d[\d,]*(?:\.\d+)?/g, (token) =>
      new Intl.NumberFormat(localeFor(language), {
        style: "currency",
        currencyDisplay: "narrowSymbol",
        currency: token.includes("£") ? "GBP" : "EUR",
        useGrouping: "always",
      }).format(Number(token.replace(/[£€,\s]/g, ""))),
    );
  if (result === value && !exact) result = raw;
  else
    result = `${/^\s/.test(raw) ? " " : ""}${result}${/\s$/.test(raw) ? " " : ""}`;
  if (
    import.meta.env?.DEV &&
    language !== "en" &&
    result === raw &&
    !exact &&
    /[A-Za-z]{3}/.test(value) &&
    missing.size < 4000
  )
    missing.add(value);
  if (cache.size > 8000) cache.clear();
  cache.set(cacheKey, result);
  return result;
}
const proseFields = new Set([
  "title",
  "text",
  "notes",
  "rules",
  "checkin",
  "trigger",
  "evidence",
  "policy",
  "action",
  "expected",
  "result",
  "verification",
  "before",
  "history",
  "reason",
  "response",
  "requests",
]);
/** Persist generated prose as stable message codes/parameters; preserve user data and ledger values. */
export function serialiseState(value: unknown): string {
  function encode(v: unknown, field = "", userText = false): unknown {
    if (typeof v === "string")
      return proseFields.has(field) && !userText ? messageReference(v) || v : v;
    if (Array.isArray(v)) return v.map((x) => encode(x, field, userText));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v).map(([key, x]) => [
          key,
          encode(
            x,
            key,
            key === "text" && (v as { role?: string }).role === "user",
          ),
        ]),
      );
    return v;
  }
  return JSON.stringify(encode(value));
}
export function hydrateMessages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrateMessages);
  if (value && typeof value === "object") {
    if ("$message" in value)
      return renderMessage(value as MessageReference, "en");
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, hydrateMessages(v)]),
    );
  }
  return value;
}
