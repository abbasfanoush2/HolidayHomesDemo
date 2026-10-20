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
    const data = JSON.parse(raw);
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
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => restoreState(localStorage.getItem(KEY)));
  const [state, setState] = useState(initial.state);
  const ref = useRef(state);
  const [filters, setFilterState] = useState<Filters>(() => {
    const defaults = defaultFilters(state.now);
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
        return { ...defaults, ...saved };
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
  const send = (c: Command, message?: string) => {
    try {
      const next = execute(ref.current, c);
      ref.current = next;
      setState(next);
      let storageFailed = false;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
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
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      notify(
        "Your browser storage is full. Changes remain in this tab; export or reset before closing.",
        true,
      );
    }
  }, []);
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
    document.documentElement.lang = state.language;
    document.documentElement.dataset.motion = String(state.motion);
  }, [state.language, state.motion]);
  const reset = () => {
    const fresh = makeSeed();
    ref.current = fresh;
    setState(fresh);
    localStorage.setItem(KEY, JSON.stringify(fresh));
    localStorage.setItem(FILTER_KEY, JSON.stringify(defaultFilters(fresh.now)));
    setDetail(null);
    setFilterState({
      country: "All",
      city: "",
      propertyId: "",
      team: "",
      from: "2026-10-01",
      to: "2026-10-31",
      currency: "GBP",
      search: "",
    });
    notify("Demo reset to 20 October 2026, 09:00 London time.");
  };
  return (
    <Context.Provider
      value={{
        state,
        send,
        filters,
        setFilters: (f) =>
          setFilterState((v) => {
            const next = { ...v, ...f };
            try {
              localStorage.setItem(FILTER_KEY, JSON.stringify(next));
            } catch {
              /* Business state persistence reports quota errors. */
            }
            return next;
          }),
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
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw Error("Missing store");
  return c;
}
