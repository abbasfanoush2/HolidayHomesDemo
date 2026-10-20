import type { Country, Currency, Language } from "../domain/types";
export type Market = "uk" | "es" | "it";
export const PREFERENCE_KEY = "staypilot-preferences-v2";
export const markets: Record<
  Market,
  {
    countryCode: "GB" | "ES" | "IT";
    country: Country;
    language: Language;
    locale: string;
    currency: Currency;
  }
> = {
  uk: {
    countryCode: "GB",
    country: "UK",
    language: "en",
    locale: "en-GB",
    currency: "GBP",
  },
  es: {
    countryCode: "ES",
    country: "Spain",
    language: "es",
    locale: "es-ES",
    currency: "EUR",
  },
  it: {
    countryCode: "IT",
    country: "Italy",
    language: "it",
    locale: "it-IT",
    currency: "EUR",
  },
};
export const localeFor = (language: Language | string) =>
  ({ en: "en-GB", es: "es-ES", it: "it-IT" })[language] || "en-GB";
export interface SavedPreferences {
  version: 2;
  mode: "manual" | "automatic";
  market?: Market;
  language?: Language;
  currency?: Currency;
}
export interface Preferences {
  market: Market;
  language: Language;
  currency: Currency;
  mode: "manual" | "automatic";
  source: "url" | "manual" | "ip" | "browser" | "fallback";
  hadPreferences: boolean;
}
export function urlMarket(search: string): Market | null {
  const value = new URLSearchParams(search).get("market");
  return value === "uk" || value === "es" || value === "it" ? value : null;
}
export function readPreferences(
  storage: Pick<Storage, "getItem">,
): SavedPreferences | null {
  try {
    const p = JSON.parse(storage.getItem(PREFERENCE_KEY) || "null");
    if (p?.version !== 2) return null;
    if (p.mode === "automatic") return { version: 2, mode: "automatic" };
    if (
      p.mode === "manual" &&
      ["uk", "es", "it"].includes(p.market) &&
      ["en", "es", "it"].includes(p.language) &&
      ["GBP", "EUR"].includes(p.currency)
    )
      return p;
  } catch {
    /* Storage restrictions and malformed old values fall back safely. */
  }
  return null;
}
export function savePreferences(
  p: SavedPreferences,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem(PREFERENCE_KEY, JSON.stringify(p));
  } catch {
    /* Preferences still work in this tab. */
  }
}
export function resolvePreferences({
  search,
  saved,
  country,
  languages,
}: {
  search: string;
  saved: SavedPreferences | null;
  country: unknown;
  languages: readonly string[];
}): Preferences {
  const outreach = urlMarket(search);
  if (outreach)
    return {
      market: outreach,
      language: markets[outreach].language,
      currency: markets[outreach].currency,
      mode: saved?.mode || "automatic",
      source: "url",
      hadPreferences: !!saved,
    };
  if (saved?.mode === "manual")
    return {
      market: saved.market!,
      language: saved.language!,
      currency: saved.currency!,
      mode: "manual",
      source: "manual",
      hadPreferences: true,
    };
  const ip = Object.entries(markets).find(
    ([, v]) => v.countryCode === country,
  )?.[0] as Market | undefined;
  const browser = languages
    .map((l) => l.toLowerCase().split("-")[0])
    .map((l) => ({ es: "es", it: "it", en: "uk" })[l])
    .find(Boolean) as Market | undefined;
  const market = ip || browser || "uk";
  return {
    market,
    language: markets[market].language,
    currency: markets[market].currency,
    mode: "automatic",
    source: ip ? "ip" : browser ? "browser" : "fallback",
    hadPreferences: !!saved,
  };
}
export async function detectCountry(
  fetcher: typeof fetch = fetch,
  timeout = 1000,
): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      fetcher("/api/market", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then(async (r) => (r.ok ? (await r.json()).country : null))
        .catch(() => null),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(null);
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
export async function initialisePreferences(): Promise<Preferences> {
  let saved: SavedPreferences | null = null;
  try {
    saved = readPreferences(localStorage);
  } catch {
    /* Browser storage may be unavailable. */
  }
  const search = location.search;
  const country =
    urlMarket(search) || saved?.mode === "manual"
      ? null
      : await detectCountry();
  return resolvePreferences({
    search,
    saved,
    country,
    languages: navigator.languages || [navigator.language],
  });
}
