import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, X } from "lucide-react";
import { useStore } from "../store";
import { markets, type Market } from "../localization/preferences";
export function MarketSelector({ inline = false }: { inline?: boolean }) {
  const { preferences, setMarket, state, filters, setFilters, send } =
    useStore();
  const [opened, setOpened] = useState(false),
    [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!opened) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpened(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpened(false);
        container.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [opened]);
  const fields = (
    <div className="market-fields">
      <label>
        Market
        <select
          aria-label="Market selection"
          value={
            preferences.source === "url"
              ? preferences.market
              : preferences.mode === "automatic"
                ? "automatic"
                : preferences.market
          }
          disabled={busy}
          onChange={async (e) => {
            setBusy(true);
            await setMarket(e.target.value as Market | "automatic");
            setBusy(false);
          }}
        >
          <option value="automatic">Automatic — use my location</option>
          <option value="uk">United Kingdom · GB</option>
          <option value="es">Spain · ES</option>
          <option value="it">Italy · IT</option>
        </select>
      </label>
      <label>
        Interface language
        <select
          aria-label={
            inline ? "Preferred interface language" : "Interface language"
          }
          value={state.language}
          onChange={(e) =>
            send({
              type: "settings",
              values: { language: e.target.value as typeof state.language },
            })
          }
        >
          <option value="en">British English</option>
          <option value="es">Español</option>
          <option value="it">Italiano</option>
        </select>
      </label>
      <label>
        Display currency
        <select
          aria-label="Preferred display currency"
          value={filters.currency}
          onChange={(e) =>
            setFilters({ currency: e.target.value as typeof filters.currency })
          }
        >
          <option value="GBP">GBP · £</option>
          <option value="EUR">EUR · €</option>
        </select>
      </label>
      <p>
        {busy
          ? "Detecting market…"
          : preferences.source === "url"
            ? "Market selected by this link."
            : preferences.mode === "manual"
              ? "Your deliberate preferences are saved on this browser."
              : "Automatic selection. You can change it at any time."}
      </p>
      <small>Demo FX: €1 = £0.86. Transaction currencies stay unchanged.</small>
    </div>
  );
  if (inline) return fields;
  return (
    <div ref={container} className="popover-wrap market-selector">
      <button
        className="market-toggle"
        aria-label="Market, language and currency"
        aria-expanded={opened}
        onClick={() => setOpened(!opened)}
      >
        <Globe size={15} />
        <span>
          {markets[preferences.market].countryCode} ·{" "}
          {state.language.toUpperCase()}
        </span>
        <ChevronDown size={12} />
      </button>
      {opened && (
        <div className="popover market-popover">
          <div>
            <h3>Market, language and currency</h3>
            <button
              aria-label="Close market preferences"
              onClick={() => setOpened(false)}
            >
              <X size={16} />
            </button>
          </div>
          {fields}
        </div>
      )}
    </div>
  );
}
