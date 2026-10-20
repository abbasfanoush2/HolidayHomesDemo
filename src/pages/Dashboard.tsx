import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  CalendarMinus,
  CalendarDays,
  Clock,
  Globe,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useStore } from "../store";
import {
  summary,
  money,
  readiness,
  convert,
  dateTime,
} from "../domain/selectors";
import { day, at } from "../domain/seed";
import { Badge, Button, Card, LinkButton } from "../components/ui";
import {
  AnimatedValue,
  CountUp,
  HealthGauge,
  useMotionEnabled,
} from "../components/Motion";
import { ReadinessTimeline } from "../components/ReadinessTimeline";
import { MiniCalendar } from "./MiniCalendar";

export function Overview() {
  const { state, filters, t, open, setFilters } = useStore();
  const navigate = useNavigate();
  const enabled = useMotionEnabled();
  const s = summary(state, filters);
  const risk = s.properties.find(
    (p) => readiness(state, p).status === "Not ready",
  );
  const pending = s.approvals[0];
  const percent = Math.round(
    (s.ready / Math.max(1, s.properties.length)) * 100,
  );
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(state.now))
    .split(":")
    .map(Number);
  const remaining = Math.max(0, 15 * 60 - localTime[0] * 60 - localTime[1]);
  const dayProgress = Math.max(
    0,
    Math.min(1, (localTime[0] * 60 + localTime[1] - 360) / 720),
  );
  const span = Math.max(
    1,
    Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / 86400000) +
      1,
  );
  const bins = Math.min(8, span);
  const trend = Array.from({ length: bins }, (_, i) => {
    const start = day(filters.from, Math.floor((i * span) / bins));
    const end = day(filters.from, Math.floor(((i + 1) * span) / bins) - 1);
    return {
      week: new Date(at(start)).toLocaleDateString(state.language, {
        day: "numeric",
        month: "short",
      }),
      revenue:
        state.bookings
          .filter(
            (b) =>
              s.ids.includes(b.propertyId) &&
              b.status !== "Cancelled" &&
              b.start >= start &&
              b.start <= end,
          )
          .reduce(
            (sum, b) => sum + convert(b.amount, b.currency, filters.currency),
            0,
          ) / 100,
    };
  });
  const metrics = [
    {
      label: t("arrivals"),
      value: s.arrivals.length,
      sub: `${s.properties.length} selected homes`,
      icon: CalendarCheck,
      id: "list:arrivals",
      tag: "Today",
    },
    {
      label: t("departures"),
      value: s.departures.length,
      sub: "Turnover work created automatically",
      icon: CalendarMinus,
      id: "list:departures",
      tag: "Today",
    },
    {
      label: t("occupancy"),
      value: `${s.occupancy.toFixed(1)}%`,
      sub: `${s.nights} / ${s.available} available nights`,
      icon: BedDouble,
      id: "list:bookings",
      tag: "This period",
    },
    {
      label: t("revenueKpi"),
      value: money(s.revenue, filters.currency, state.language, true),
      sub: `${s.bookings.length} active reservations`,
      icon: Wallet,
      id: "list:bookings",
      tag: "Booked",
    },
    {
      label: t("approvals"),
      value: s.approvals.length,
      sub: "Your judgement makes the difference",
      icon: ShieldCheck,
      id: "list:approvals",
      tag: "Needs review",
    },
    {
      label: t("ready"),
      value: s.ready,
      sub: `of ${s.properties.length} homes · verified evidence`,
      icon: Users,
      id: "list:ready",
      tag: "Live records",
    },
  ];
  return (
    <div className="overview-layout reference-dashboard">
      <div className="overview-main">
        <section className="dashboard-stage">
          <div className="morning-intro">
            <span className="morning-date">
              <CalendarDays size={13} />
              {new Date(state.now).toLocaleDateString(state.language, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/London",
              })}
            </span>
            <h1>
              {t("goodMorning")}
              <motion.span
                className="morning-sun"
                initial={enabled ? { rotate: -40, scale: 0 } : false}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  duration: enabled ? 0.9 : 0,
                  delay: enabled ? 0.2 : 0,
                }}
              >
                <Sun size={25} strokeWidth={1.5} />
              </motion.span>
            </h1>
            <p>
              {s.properties.length} beautiful homes. {s.approvals.length}{" "}
              decisions waiting.
              <br />A little clarity for the day ahead.
            </p>
            <div className="morning-context">
              <span>
                <Globe size={13} />
                UK · Spain · Italy
              </span>
              <button onClick={() => navigate("/activity")}>
                <i className="dot green" />
                {state.agentsPaused
                  ? "Agents paused"
                  : "Your simulated team is on it"}
                <ArrowUpRight size={11} />
              </button>
            </div>
            <div className="daylight-arc">
              <svg viewBox="0 0 330 110" aria-hidden="true">
                <path
                  d="M20 95 A145 80 0 0 1 310 95"
                  fill="none"
                  stroke="#cdded7"
                  strokeWidth="1.5"
                  strokeDasharray="2 5"
                />
                <motion.path
                  d="M20 95 A145 80 0 0 1 310 95"
                  fill="none"
                  stroke="#d5b485"
                  strokeWidth="2"
                  pathLength="1"
                  initial={enabled ? { pathLength: 0 } : false}
                  animate={{ pathLength: dayProgress }}
                  transition={{
                    duration: enabled ? 1.7 : 0,
                    delay: enabled ? 0.15 : 0,
                  }}
                />
                <motion.circle
                  cx={165 + Math.cos(Math.PI + dayProgress * Math.PI) * 145}
                  cy={95 + Math.sin(Math.PI + dayProgress * Math.PI) * 80}
                  r="6"
                  fill="#ddb77e"
                  initial={enabled ? { opacity: 0, scale: 0 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: enabled ? 0.65 : 0 }}
                />
              </svg>
              <div>
                <span>
                  {remaining
                    ? "Standard check-in opens in"
                    : "Your check-in window is open"}
                </span>
                <strong>
                  {remaining ? (
                    <>
                      <CountUp value={Math.floor(remaining / 60)} />h{" "}
                      <CountUp value={remaining % 60} />
                      min
                    </>
                  ) : (
                    "Welcome home"
                  )}
                </strong>
                <small>15:00 London · UK standard check-in</small>
              </div>
              <span className="arc-start">06:00</span>
              <span className="arc-end">18:00</span>
            </div>
            <button
              className="morning-handover"
              onClick={() => open("run-seed")}
            >
              <span className="stack-avatars">
                <i>OP</i>
                <i>GE</i>
                <i>FI</i>
              </span>
              <span>Your morning handover is ready</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <Card className="ai-health reference-health">
            <div className="ai-health-label">
              <span className="ai-label-icon">
                <Sparkles size={14} />
              </span>
              {t("portfolioHealth")}
              <span>AI</span>
            </div>
            <HealthGauge value={percent} />
            <h3>Arrival confidence</h3>
            <p>
              {s.ready} of {s.properties.length} homes have complete readiness
              evidence.
            </p>
            <button
              className="health-key-insight"
              onClick={() => (risk ? open(risk.id) : navigate("/operations"))}
            >
              <Sparkles size={15} />
              <span>
                <strong>Key insight</strong>
                {risk
                  ? `${risk.name} needs a little attention before arrival.`
                  : "Every selected home is ready to welcome guests."}
              </span>
              <ArrowUpRight size={12} />
            </button>
            <Button onClick={() => navigate("/command")}>
              View full AI analysis
              <ArrowRight size={14} />
            </Button>
          </Card>
        </section>
        <div className="kpi-grid dashboard-metrics">
          {metrics.map((m, i) => (
            <motion.button
              className="kpi card"
              key={m.label}
              onClick={() => open(m.id)}
              initial={enabled ? { opacity: 0, y: 14 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: enabled ? 0.5 : 0,
                delay: enabled ? 0.14 + i * 0.065 : 0,
              }}
            >
              <div>
                <span className={`metric-icon metric-${i}`}>
                  <m.icon size={15} />
                </span>
                <span>{m.label}</span>
                <ArrowUpRight className="metric-arrow" size={13} />
              </div>
              <strong>
                <AnimatedValue value={m.value} />
              </strong>
              <small>{m.sub}</small>
              <span className="metric-period">
                <i className="dot green" />
                {m.tag}
              </span>
            </motion.button>
          ))}
        </div>
        <ReadinessTimeline compact />
        <div className="section-label">
          <div>
            <Sparkles size={16} />
            <h2>{t("attention")}</h2>
            <span className="count-chip">
              {s.issues.length + s.approvals.length}
            </span>
          </div>
          <LinkButton onClick={() => navigate("/command")}>
            {t("viewAll")}
          </LinkButton>
        </div>
        <div className="insight-grid dashboard-insights">
          <Card className="insight-card">
            <div className="insight-top">
              <span className="agent-caption">
                <span className="icon-tile peach">
                  <Clock size={16} />
                </span>
                OPERATIONS AGENT
              </span>
              <Badge value={risk ? "At risk" : "Ready"} />
            </div>
            <h3>{risk ? t("arrivalRisk") : "Your homes are looking good"}</h3>
            <p>
              {risk
                ? `${risk.name} has ${readiness(state, risk).blockers.length} readiness blockers. Your team has a plan to get every detail right.`
                : "The selected homes have complete evidence for readiness."}
            </p>
            {risk && (
              <button className="source-chip" onClick={() => open(risk.id)}>
                {risk.city} · {risk.name}
                <ArrowUpRight size={12} />
              </button>
            )}
            <Button
              variant="primary"
              onClick={() => (risk ? open(risk.id) : navigate("/operations"))}
            >
              {t("viewOperations")}
              <ArrowRight size={14} />
            </Button>
          </Card>
          <Card className="insight-card">
            <div className="insight-top">
              <span className="agent-caption">
                <span className="icon-tile lilac">
                  <ShieldCheck size={16} />
                </span>
                FINANCE AGENT
              </span>
              <Badge value={pending ? "Pending" : "Complete"} />
            </div>
            <h3>
              {pending
                ? "One decision. A smoother stay."
                : "Your approval inbox is clear"}
            </h3>
            <p>
              {pending
                ? `${pending.title}. Review the linked quote and evidence, then let your team get to work.`
                : "Every decision is saved with its evidence and a local audit record."}
            </p>
            {pending && (
              <span className="approval-amount">
                {money(pending.amount, pending.currency, state.language)}
                <small>Mock supplier quote · approval schedules work</small>
              </span>
            )}
            <Button
              onClick={() =>
                pending ? open(pending.id) : navigate("/approvals")
              }
            >
              {t("review")} {t("approvals").toLowerCase()}
              <ArrowRight size={14} />
            </Button>
          </Card>
        </div>
        <div className="dashboard-lower">
          <Card
            title="A portfolio with perspective"
            subtitle="Booked accommodation · selected reporting period · demo FX"
            action={
              <LinkButton onClick={() => navigate("/reports")}>
                Reports
              </LinkButton>
            }
          >
            <div className="chart-stat">
              <strong>
                <AnimatedValue
                  value={money(
                    s.revenue,
                    filters.currency,
                    state.language,
                    true,
                  )}
                />
              </strong>
              <span>Across your selected homes</span>
            </div>
            <div className="revenue-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenue-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#70b9a7"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#70b9a7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#526b63", fontSize: 10 }}
                    minTickGap={20}
                  />
                  <Tooltip
                    formatter={(v) =>
                      money(Number(v) * 100, filters.currency, state.language)
                    }
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #d6e6df",
                      boxShadow: "0 8px 30px #173d3310",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#58ae9d"
                    fill="url(#revenue-fill)"
                    strokeWidth={2.5}
                    animationDuration={1400}
                    isAnimationActive={enabled}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card
            title="Three countries. One collection."
            subtitle="Select a country to explore its homes"
          >
            <div className="country-list">
              {(["UK", "Spain", "Italy"] as const).map((country, i) => {
                const homes = s.properties.filter((p) => p.country === country);
                const ready = homes.filter(
                  (p) => readiness(state, p).status === "Ready",
                ).length;
                return (
                  <button
                    key={country}
                    onClick={() =>
                      setFilters({ country, city: "", propertyId: "" })
                    }
                  >
                    <span className="country-flag">
                      {["🇬🇧", "🇪🇸", "🇮🇹"][i]}
                    </span>
                    <span>
                      <strong>
                        {country === "UK" ? "United Kingdom" : country}
                      </strong>
                      <small>
                        {homes.length} homes · {ready} ready
                      </small>
                      <span className="country-progress">
                        <motion.i
                          initial={enabled ? { width: 0 } : false}
                          whileInView={{
                            width: `${(ready / Math.max(1, homes.length)) * 100}%`,
                          }}
                          viewport={{ once: true }}
                          transition={{ duration: enabled ? 1 : 0 }}
                        />
                      </span>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
        <Card
          title={t("agentActivity")}
          subtitle="Observations, decisions, and verified actions"
          action={
            <LinkButton onClick={() => navigate("/activity")}>
              {t("viewAll")}
            </LinkButton>
          }
        >
          <div className="feed">
            {state.events
              .filter((e) => s.ids.includes(e.propertyId))
              .slice(0, 3)
              .map((e) => (
                <button key={e.id} onClick={() => open(e.sourceId)}>
                  <span className="feed-icon purple">
                    <Activity size={15} />
                  </span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {e.actor} · {dateTime(e.time, state.language)}
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
          </div>
        </Card>
      </div>
      <aside className="right-rail dashboard-rail">
        <Card
          title={
            <>
              <CalendarCheck size={16} />
              {t("calendar")}
            </>
          }
        >
          <MiniCalendar />
          <div className="rail-divider" />
          <div className="rail-subheading">
            <span>{t("todaysFocus")}</span>
            <span className="focus-count">{s.tasks.length}</span>
          </div>
          {s.tasks.slice(0, 4).map((task) => (
            <button
              className="focus-task"
              key={task.id}
              onClick={() => open(task.id)}
            >
              <span className="task-square" />
              <span>
                {task.title}
                <small>
                  <Clock size={11} />
                  {dateTime(task.due, state.language)}
                </small>
              </span>
              <ArrowUpRight size={12} />
            </button>
          ))}
          {!s.tasks.length && (
            <p className="muted small">No open tasks due today.</p>
          )}
          <LinkButton onClick={() => navigate("/operations")}>
            View all tasks
          </LinkButton>
        </Card>
        <div className="rail-summary">
          <span className="icon-tile mint">
            <ShieldCheck size={19} />
          </span>
          <h3>Every detail, accounted for.</h3>
          <p>A home is ready when the evidence says so.</p>
          <div className="readiness-meter">
            {[
              ["Ready", s.ready, "green"],
              ["At risk", s.atRisk, "amber"],
              ["Not ready", s.notReady, "red"],
            ].map(([label, count, color]) => (
              <button key={label} onClick={() => navigate("/operations")}>
                <span>
                  <i className={`dot ${color}`} />
                  {label}
                </span>
                <strong>
                  <AnimatedValue value={Number(count)} />
                </strong>
              </button>
            ))}
          </div>
        </div>
        <div className="rail-finance">
          <button onClick={() => navigate("/owners")}>
            <span>{t("ownerPayable")}</span>
            <strong>
              {money(s.owner, filters.currency, state.language, true)}
              <ArrowUpRight size={13} />
            </strong>
          </button>
          <button onClick={() => navigate("/finance")}>
            <span>{t("operatorIncome")}</span>
            <strong>
              {money(s.operator, filters.currency, state.language, true)}
              <ArrowUpRight size={13} />
            </strong>
          </button>
        </div>
        <Button className="rail-studio" onClick={() => navigate("/studio")}>
          <Sparkles size={15} />
          Open Demo Studio
          <ArrowUpRight size={13} />
        </Button>
      </aside>
    </div>
  );
}
