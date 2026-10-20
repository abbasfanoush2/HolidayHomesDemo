import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { motion } from "motion/react";
import { useStore } from "../store";
import { readiness, scopedProperties } from "../domain/selectors";
import { day } from "../domain/seed";
import { Button } from "./ui";
import { useMotionEnabled } from "./Motion";

export function ReadinessTimeline({ compact = false }: { compact?: boolean }) {
  const { state, filters, open } = useStore();
  const enabled = useMotionEnabled();
  const [mode, setMode] = useState<"day" | "week">("day");
  const [offset, setOffset] = useState(0);
  const from = day(state.now, offset * (mode === "day" ? 1 : 7));
  const homes = scopedProperties(state, filters).slice(0, compact ? 5 : 18);
  const ticks =
    mode === "day"
      ? ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"]
      : Array.from({ length: 7 }, (_, i) =>
          new Date(day(from, i) + "T12:00:00Z").toLocaleDateString(
            state.language,
            { weekday: "short", day: "numeric" },
          ),
        );
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(state.now)),
  );
  const todayPosition =
    mode === "day" ? ((hour - 7) / 12) * 100 : (0.5 / 7) * 100;
  return (
    <section className={`schedule-card card ${compact ? "compact" : ""}`}>
      <div className="schedule-heading">
        <span className="icon-tile mint">
          <CalendarDays size={18} />
        </span>
        <div>
          <h2>Readiness schedule</h2>
          <p>
            {homes.length} homes · cleaning, inspection & arrival dependencies
          </p>
        </div>
        <div className="schedule-controls">
          <div className="segmented" aria-label="Timeline scale">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={mode === v}
                className={mode === v ? "selected" : ""}
                onClick={() => {
                  setMode(v);
                  setOffset(0);
                }}
              >
                {v === "day" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            aria-label="Previous schedule period"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button variant="ghost" onClick={() => setOffset(0)}>
            Today
          </Button>
          <Button
            variant="ghost"
            aria-label="Next schedule period"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
      <div className="schedule-legend">
        <span>
          <i className="dot green" />
          Complete
        </span>
        <span>
          <i className="dot teal" />
          Pending evidence
        </span>
        <span>
          <i className="dot red" />
          Blocked
        </span>
        <span className="schedule-date">
          {new Date(from + "T12:00:00Z").toLocaleDateString(state.language, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="schedule-scroll">
        <div className="schedule-grid">
          <div className="schedule-axis">
            <span>PROPERTY / WORKFLOW</span>
            <div>
              {ticks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </div>
          <div className="schedule-rows">
            {homes.map((p, index) => {
              const clean = state.tasks.find(
                (t) =>
                  t.propertyId === p.id &&
                  t.kind === "Cleaning" &&
                  day(t.due) === from,
              );
              const inspect = state.tasks.find(
                (t) => t.propertyId === p.id && t.kind === "Inspection",
              );
              const tasks = state.tasks.filter(
                (t) =>
                  t.propertyId === p.id &&
                  day(t.due) >= from &&
                  day(t.due) <= day(from, 6),
              );
              const status = readiness(state, p).status;
              return (
                <div className="schedule-row" key={p.id}>
                  <button className="schedule-home" onClick={() => open(p.id)}>
                    <i className={`home-marker country-${p.country}`} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.city} · {status}
                      </small>
                    </span>
                    <ArrowUpRight size={12} />
                  </button>
                  <div className="schedule-track">
                    {mode === "day" ? (
                      <>
                        <svg
                          className="dependency-lines"
                          viewBox="0 0 1000 56"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path d="M260 28H282Q295 28 295 39V43Q295 48 308 48H333M580 28H600Q610 28 610 39V43Q610 48 623 48H650" />
                        </svg>
                        {offset === 0 || clean ? (
                          [
                            {
                              id: clean?.id || p.id,
                              text: "Cleaning",
                              done: p.clean,
                              blocked: false,
                              left: 2,
                              width: 25,
                            },
                            {
                              id: inspect?.id || p.id,
                              text: "Inspection",
                              done: p.inspection,
                              blocked: !p.clean,
                              left: 33,
                              width: 25,
                            },
                            {
                              id: p.id,
                              text: "Guest-ready",
                              done: status === "Ready",
                              blocked: status === "Not ready",
                              left: 65,
                              width: 31,
                            },
                          ].map((bar, i) => (
                            <motion.button
                              key={bar.text}
                              className={`schedule-bar ${bar.done ? "done" : bar.blocked ? "blocked" : "pending"}`}
                              style={{
                                left: `${bar.left}%`,
                                width: `${bar.width}%`,
                                transformOrigin: "left",
                              }}
                              initial={
                                enabled ? { scaleX: 0, opacity: 0 } : false
                              }
                              animate={{ scaleX: 1, opacity: 1 }}
                              transition={{
                                duration: enabled ? 0.65 : 0,
                                delay: enabled ? index * 0.055 + i * 0.1 : 0,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              onClick={() => open(bar.id)}
                              title={`${p.name} · ${bar.text}: ${bar.done ? "Complete" : bar.blocked ? "Blocked" : "Evidence required"}`}
                            >
                              <span>{bar.text}</span>
                              <span>
                                {bar.done ? "✓" : bar.blocked ? "!" : "○"}
                              </span>
                            </motion.button>
                          ))
                        ) : (
                          <span className="schedule-no-work">
                            No scheduled turnover on this date
                          </span>
                        )}
                      </>
                    ) : (
                      tasks.slice(0, 5).map((task, i) => {
                        const position =
                          ((Date.parse(day(task.due)) - Date.parse(from)) /
                            86400000 /
                            7) *
                          100;
                        return (
                          <motion.button
                            key={task.id}
                            className={`schedule-bar ${task.status === "Complete" ? "done" : task.status === "Blocked" ? "blocked" : "pending"}`}
                            style={{
                              left: `${position + 1}%`,
                              width: "12%",
                              top: `${8 + (i % 2) * 20}px`,
                            }}
                            initial={enabled ? { scaleX: 0 } : false}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: enabled ? 0.5 : 0 }}
                            title={task.title}
                            onClick={() => open(task.id)}
                          >
                            {task.kind}
                          </motion.button>
                        );
                      })
                    )}
                    {mode === "week" && !tasks.length && (
                      <span className="schedule-no-work">
                        No tasks in this week
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {offset === 0 && todayPosition >= 0 && todayPosition <= 100 && (
              <div className="schedule-now-area" aria-hidden="true">
                <div
                  className="schedule-now"
                  style={{ left: `${todayPosition}%` }}
                >
                  <span>{mode === "day" ? "Now" : "Today"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="schedule-footnote">
        <Clock size={12} />
        {mode === "day"
          ? "Illustrative shift windows · statuses and evidence come from shared records"
          : "Scheduled task dates from shared records"}
        <span>
          Click any stage to inspect its evidence <ArrowUpRight size={12} />
        </span>
      </div>
    </section>
  );
}
