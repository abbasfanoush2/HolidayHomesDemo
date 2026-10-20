import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { State, Command, Filters } from "./domain/types";
import { makeSeed, day } from "./domain/seed";
import { execute } from "./domain/engine";
import { dictionaries, type TranslationKey } from "./i18n";
import { useLocation, useNavigate } from "react-router-dom";
import { serialiseState, hydrateMessages } from "./localization/catalogue";
import { LocaleContext } from "./localization/context";
import {
  detectCountry,
  localeFor,
  markets,
  resolvePreferences,
  savePreferences,
  urlMarket,
  type Market,
  type Preferences,
} from "./localization/preferences";
const KEY = "staypilot-demo-v1";
const FILTER_KEY = "staypilot-filters-v1";
function defaultFilters(now: string): Filters {
  const d = new Date(now);
  return {
    country: "All",
    city: "",
    propertyId: "",
    team: "",
    from: day(now).slice(0, 7) + "-01",
    to: day(
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).toISOString(),
    ),
    currency: "GBP",
    search: "",
  };
}
export function restoreState(raw: string | null): {
  state: State;
  notice: string;
} {
  if (!raw) return { state: makeSeed(), notice: "" };
  try {
    const data = hydrateMessages(JSON.parse(raw)) as State &
      Record<string, unknown>;
    if (
      data.schema !== 1 ||
      !Array.isArray(data.properties) ||
      data.properties.length < 1 ||
      !Array.isArray(data.bookings) ||
      !Array.isArray(data.tasks) ||
      ![
        "owners",
        "issues",
        "approvals",
        "messages",
        "inventory",
        "staff",
        "bills",
        "documents",
        "reviews",
        "rates",
        "batches",
        "events",
        "runs",
        "processed",
        "chat",
      ].every((key) => Array.isArray(data[key])) ||
      !["en", "es", "it"].includes(data.language) ||
      Number.isNaN(Date.parse(data.now))
    )
      throw Error("Invalid saved state");
    const seed = makeSeed();
    return {
      state: {
        ...seed,
        ...data,
        bills: data.bills.map((b: State["bills"][number]) => ({
          ...b,
          date: b.date || day(data.now),
        })),
        playing: false,
        scenario: data.scenario ? { ...data.scenario, playing: false } : null,
      },
      notice: "restored",
    };
  } catch {
    return { state: makeSeed(), notice: "corrupt" };
  }
}
interface Store {
  state: State;
  send: (c: Command, message?: string) => boolean;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  open: (id: string) => void;
  detail: string | null;
  setDetail: (id: string | null) => void;
  toast: { message: string; error: boolean } | null;
  notify: (message: string, error?: boolean) => void;
  reset: () => void;
  t: (k: TranslationKey) => string;
  assistant: boolean;
  setAssistant: (v: boolean) => void;
  modal: string | null;
  setModal: (v: string | null) => void;
  preferences: Preferences;
  setMarket: (market: Market | "automatic") => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  preferences: bootPreferences,
}: {
  children: ReactNode;
  preferences: Preferences;
}) {
  const [initial] = useState(() => {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      /* Storage can be unavailable. */
    }
    const restored = restoreState(raw);
    restored.state.language = bootPreferences.language;
    return restored;
  });
  const [preferences, setPreferences] = useState(bootPreferences);
  const preferenceRef = useRef(preferences);
  const preferenceVersion = useRef(0);
  const location = useLocation(),
    navigate = useNavigate();
  const [state, setState] = useState(initial.state);
  const ref = useRef(state);
  const [filters, setFilterState] = useState<Filters>(() => {
    const defaults = {
      ...defaultFilters(state.now),
      country: markets[bootPreferences.market].country,
      currency: bootPreferences.currency,
    };
    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || "null");
      if (
        initial.notice !== "corrupt" &&
        saved &&
        ["All", "UK", "Spain", "Italy"].includes(saved.country) &&
        ["GBP", "EUR"].includes(saved.currency) &&
        !Number.isNaN(Date.parse(saved.from)) &&
        !Number.isNaN(Date.parse(saved.to)) &&
        saved.to >= saved.from
      )
        return {
          ...defaults,
          ...saved,
          ...(!bootPreferences.hadPreferences ||
          bootPreferences.source === "url"
            ? { country: defaults.country, city: "", propertyId: "", team: "" }
            : {}),
          currency: bootPreferences.currency,
        };
    } catch {
      /* Invalid filter preferences use the fixed reporting period. */
    }
    return defaults;
  });
  const [detail, setDetail] = useState<string | null>(null),
    [toast, setToast] = useState<Store["toast"]>(null),
    [assistant, setAssistant] = useState(false),
    [modal, setModal] = useState<string | null>(null);
  const notify = (message: string, error = false) =>
    setToast({ message, error });
  const clearOutreach = () => {
    const query = new URLSearchParams(location.search);
    if (query.has("market")) {
      query.delete("market");
      navigate(
        {
          pathname: location.pathname,
          search: query.toString(),
          hash: location.hash,
        },
        { replace: true },
      );
    }
  };
  const saveManual = (
    language = ref.current.language,
    currency = preferenceRef.current.currency,
  ) => {
    preferenceVersion.current++;
    const next: Preferences = {
      ...preferenceRef.current,
      language,
      currency,
      mode: "manual",
      source: "manual",
      hadPreferences: true,
    };
    preferenceRef.current = next;
    setPreferences(next);
    savePreferences({
      version: 2,
      mode: "manual",
      market: next.market,
      language,
      currency,
    });
    clearOutreach();
  };
  const applyMarket = (next: Preferences) => {
    preferenceRef.current = next;
    setPreferences(next);
    const updated = execute(ref.current, {
      type: "settings",
      values: { language: next.language },
    });
    ref.current = updated;
    setState(updated);
    setFilterState((current) => {
      const value = {
        ...current,
        country: markets[next.market].country,
        city: "",
        propertyId: "",
        team: "",
        currency: next.currency,
      };
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(value));
      } catch {
        /* Tab-local preferences remain available. */
      }
      return value;
    });
    try {
      localStorage.setItem(KEY, serialiseState(updated));
    } catch {
      /* Reported by normal command persistence. */
    }
  };
  const setMarket = async (market: Market | "automatic") => {
    const version = ++preferenceVersion.current;
    clearOutreach();
    if (market === "automatic") {
      savePreferences({ version: 2, mode: "automatic" });
      const next = resolvePreferences({
        search: "",
        saved: null,
        country: await detectCountry(),
        languages: navigator.languages || [navigator.language],
      });
      if (version !== preferenceVersion.current) return;
      applyMarket({ ...next, hadPreferences: true });
    } else {
      const next: Preferences = {
        market,
        language: markets[market].language,
        currency: markets[market].currency,
        mode: "manual",
        source: "manual",
        hadPreferences: true,
      };
      savePreferences({
        version: 2,
        mode: "manual",
        market,
        language: next.language,
        currency: next.currency,
      });
      applyMarket(next);
    }
  };
  const send = (c: Command, message?: string) => {
    try {
      if (c.type === "settings" && c.values.language)
        saveManual(c.values.language);
      const next = execute(ref.current, c);
      ref.current = next;
      setState(next);
      let storageFailed = false;
      try {
        localStorage.setItem(KEY, serialiseState(next));
      } catch {
        storageFailed = true;
        notify(
          "Your browser storage is full. Changes remain in this tab; export or reset before closing.",
          true,
        );
      }
      if (message && !storageFailed) notify(message);
      return true;
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "The action could not be completed.",
        true,
      );
      return false;
    }
  };
  useEffect(() => {
    if (!bootPreferences.hadPreferences)
      savePreferences({ version: 2, mode: "automatic" });
    try {
      localStorage.setItem(KEY, serialiseState(state));
    } catch {
      notify(
        "Your browser storage is full. Changes remain in this tab; export or reset before closing.",
        true,
      );
    }
  }, []);
  const outreachRef = useRef(urlMarket(location.search));
  useEffect(() => {
    const market = urlMarket(location.search);
    if (market && market !== outreachRef.current) {
      preferenceVersion.current++;
      applyMarket({
        market,
        language: markets[market].language,
        currency: markets[market].currency,
        mode: preferenceRef.current.mode,
        source: "url",
        hadPreferences: true,
      });
    }
    outreachRef.current = market;
  }, [location.search]);
  useEffect(() => {
    if (initial.notice)
      notify(
        dictionaries[state.language][initial.notice as "restored" | "corrupt"],
        initial.notice === "corrupt",
      );
  }, []); // restore notice once
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!state.playing) return;
    const timer = setInterval(
      () => send({ type: "tick", minutes: ref.current.speed }),
      2000,
    );
    return () => clearInterval(timer);
  }, [state.playing]);
  useEffect(() => {
    if (!state.scenario?.playing) return;
    const timer = setInterval(() => {
      if (!send({ type: "stepScenario" }))
        send({ type: "scenarioPlay", playing: false });
    }, 2400);
    return () => clearInterval(timer);
  }, [state.scenario?.playing]);
  useEffect(() => {
    const visibility = () => {
      if (
        document.hidden &&
        (ref.current.playing || ref.current.scenario?.playing)
      ) {
        send({ type: "settings", values: { playing: false } });
        send({ type: "scenarioPlay", playing: false });
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    document.documentElement.lang = localeFor(state.language);
    document.documentElement.dataset.motion = String(state.motion);
  }, [state.language, state.motion]);
  const reset = () => {
    const fresh = makeSeed();
    fresh.language = ref.current.language;
    ref.current = fresh;
    setState(fresh);
    localStorage.setItem(KEY, serialiseState(fresh));
    setDetail(null);
    const resetFilters: Filters = {
      country: markets[preferenceRef.current.market].country,
      city: "",
      propertyId: "",
      team: "",
      from: "2026-10-01",
      to: "2026-10-31",
      currency: preferenceRef.current.currency,
      search: "",
    };
    localStorage.setItem(FILTER_KEY, JSON.stringify(resetFilters));
    setFilterState(resetFilters);
    notify("Demo reset to 20 October 2026, 09:00 London time.");
  };
  return (
    <LocaleContext.Provider value={state.language}>
      <Context.Provider
        value={{
          state,
          send,
          filters,
          setFilters: (f) => {
            if (f.currency) saveManual(ref.current.language, f.currency);
            return setFilterState((v) => {
              const next = { ...v, ...f };
              try {
                localStorage.setItem(FILTER_KEY, serialiseState(next));
              } catch {
                /* Business state persistence reports quota errors. */
              }
              return next;
            });
          },
          open: setDetail,
          detail,
          setDetail,
          toast,
          notify,
          reset,
          t: (k) => dictionaries[state.language][k],
          assistant,
          setAssistant,
          modal,
          setModal,
          preferences,
          setMarket,
        }}
      >
        {children}
      </Context.Provider>
    </LocaleContext.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw Error("Missing store");
  return c;
}
