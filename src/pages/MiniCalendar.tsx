import { localeFor } from "../localization/preferences";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useStore } from "../store";
import { day } from "../domain/seed";
export function MiniCalendar() {
  const { state, filters, setFilters, t } = useStore(),
    [offset, setOffset] = useState(0);
  const date = new Date(state.now);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth(),
    start = (date.getUTCDay() + 6) % 7,
    days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return (
    <div className="mini-calendar">
      <div className="calendar-month">
        <strong>
          {date.toLocaleDateString(localeFor(state.language), {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </strong>
        <div>
          <button
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <button aria-label="Next month" onClick={() => setOffset(offset + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {(state.language === "en"
          ? ["M", "T", "W", "T", "F", "S", "S"]
          : state.language === "es"
            ? ["L", "M", "X", "J", "V", "S", "D"]
            : ["L", "M", "M", "G", "V", "S", "D"]
        ).map((d, i) => (
          <span className="weekday" key={`w${i}`}>
            {d}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
            count = state.bookings.filter(
              (b) => b.start === str && b.status !== "Cancelled",
            ).length;
          return (
            <button
              className={`${str === day(state.now) ? "today" : ""} ${filters.from === str && filters.to === str ? "selected" : ""}`}
              key={i}
              aria-label={`Show ${str}`}
              onClick={() => setFilters({ from: str, to: str })}
            >
              {i + 1}
              {count > 0 && <i />}
            </button>
          );
        })}
      </div>
      <button
        className="calendar-reset"
        onClick={() => {
          setOffset(0);
          setFilters({
            from: day(state.now).slice(0, 7) + "-01",
            to: day(
              new Date(
                Date.UTC(
                  new Date(state.now).getUTCFullYear(),
                  new Date(state.now).getUTCMonth() + 1,
                  0,
                ),
              ).toISOString(),
            ),
          });
        }}
      >
        {t("period")}:{" "}
        {filters.from === filters.to ? filters.from : "month overview"}
        <ArrowUpRight size={12} />
      </button>
    </div>
  );
}
