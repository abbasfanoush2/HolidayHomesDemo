import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Sun,
  CalendarCheck,
  CalendarMinus,
  BedDouble,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  Activity,
  Leaf,
  MapPin,
  TrendingUp,
  TriangleAlert,
  Users,
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
import {
  Badge,
  Button,
  Card,
  LinkButton,
  SectionTitle,
  Empty,
} from "../components/ui";
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
          {date.toLocaleDateString(state.language, {
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
export function Overview() {
  const { state, filters, t, open, setFilters } = useStore(),
    navigate = useNavigate();
  const s = summary(state, filters),
    risk = state.properties.find(
      (p) => s.ids.includes(p.id) && readiness(state, p).status === "Not ready",
    ),
    pending = s.approvals[0];
  const tasks = s.tasks.slice(0, 3);
  const span = Math.max(
      1,
      Math.round(
        (Date.parse(filters.to) - Date.parse(filters.from)) / 86400000,
      ) + 1,
    ),
    bins = Math.min(8, span);
  const trend = Array.from({ length: bins }, (_, i) => {
    const start = day(filters.from, Math.floor((i * span) / bins)),
      end = day(filters.from, Math.floor(((i + 1) * span) / bins) - 1);
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
            (a, b) => a + convert(b.amount, b.currency, filters.currency),
            0,
          ) / 100,
    };
  });
  const metrics = [
    {
      label: t("arrivals"),
      value: s.arrivals.length,
      sub: `${s.properties.length} homes in your portfolio`,
      icon: CalendarCheck,
      id: "list:arrivals",
      trend: `${
        s.arrivals.filter(
          (b) =>
            readiness(
              state,
              state.properties.find((p) => p.id === b.propertyId)!,
            ).status === "Ready",
        ).length
      } homes ready`,
    },
    {
      label: t("departures"),
      value: s.departures.length,
      sub: "Turnovers created automatically",
      icon: CalendarMinus,
      id: "list:departures",
      trend: "Every detail, accounted for",
    },
    {
      label: t("occupancy"),
      value: `${s.occupancy.toFixed(1)}%`,
      sub: `${s.nights} / ${s.available} available nights`,
      icon: BedDouble,
      id: "list:bookings",
      trend: "Selected reporting period",
    },
    {
      label: t("revenueKpi"),
      value: money(s.revenue, filters.currency, state.language, true),
      sub: `${s.bookings.length} active reservations · accommodation`,
      icon: Wallet,
      id: "list:bookings",
      trend: "Booked, not a forecast",
    },
  ];
  return (
    <>
      <SectionTitle
        eyebrow={new Date(state.now).toLocaleDateString(state.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/London",
        })}
        title={
          <>
            {t("goodMorning")}{" "}
            <span className="sun-inline">
              <Sun size={27} />
            </span>
          </>
        }
        description={t("greeting")}
        actions={
          <Button onClick={() => navigate("/studio")}>
            <span className="tiny-play">▶</span>
            {t("studio")}
            <ArrowUpRight size={14} />
          </Button>
        }
      />
      <div className="overview-layout">
        <div className="overview-main">
          <div className="briefing-grid">
            <Card className="briefing">
              <span className="pill">
                <Sun size={13} /> THE MORNING BRIEF
              </span>
              <h2>{t("briefing")}</h2>
              <p>{t("briefingBody")}</p>
              <div className="brief-numbers">
                <div>
                  <strong>
                    {s.properties.length}
                    <em>{t("properties").toLowerCase()}</em>
                  </strong>
                  <span>
                    <i className="dot green" />
                    {s.ready} {t("ready").toLowerCase()} to welcome
                  </span>
                </div>
                <div className="brief-number-divider" />
                <div>
                  <strong>
                    {s.approvals.length}
                    <em>{t("approvals").toLowerCase()}</em>
                  </strong>
                  <span>
                    <i className="dot amber" />A human touch needed
                  </span>
                </div>
              </div>
              <div className="brief-bottom">
                <span className="stack-avatars">
                  <i>OP</i>
                  <i>GE</i>
                  <i>FI</i>
                </span>
                <span>
                  Your AI team checked in at{" "}
                  {dateTime(state.lastCheck, state.language).split(",").at(-1)}
                </span>
                <button
                  onClick={() => navigate("/command")}
                  aria-label="Open agent team"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="brief-plant">
                <Leaf size={110} strokeWidth={0.7} />
              </div>
            </Card>
            <Card className="ai-health">
              <div className="ai-health-label">
                <Sparkles size={16} />
                {t("portfolioHealth")}
                <span>AI</span>
              </div>
              <div className="health-gauge">
                <svg viewBox="0 0 160 100">
                  <path
                    d="M20 85 A60 60 0 0 1 140 85"
                    fill="none"
                    stroke="#645777"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 85 A60 60 0 0 1 140 85"
                    fill="none"
                    stroke="#8dd7c3"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.round((s.ready / Math.max(1, s.properties.length)) * 188)} 188`}
                  />
                </svg>
                <strong>
                  {Math.round(
                    (s.ready / Math.max(1, s.properties.length)) * 100,
                  )}
                  <small>%</small>
                </strong>
              </div>
              <h3>
                {s.notReady
                  ? "A few things to look after"
                  : "Looking good, together"}
              </h3>
              <p>
                {s.ready} of {s.properties.length} homes meet the demo readiness
                checklist.
              </p>
              <div className="health-advice">
                <Sparkles size={15} />
                <span>
                  {risk
                    ? `${risk.name} needs repair verification before arrival.`
                    : "All selected homes have complete readiness evidence."}
                </span>
              </div>
              <Button onClick={() => navigate("/command")}>
                {t("review")} AI insights
                <ArrowUpRight size={14} />
              </Button>
            </Card>
          </div>
          <div className="kpi-grid">
            {metrics.map((m) => (
              <button
                className="kpi card"
                key={m.id + m.label}
                onClick={() => open(m.id)}
              >
                <div>
                  <span>{m.label}</span>
                  <m.icon size={17} />
                </div>
                <strong>{m.value}</strong>
                <small>{m.sub}</small>
                <em>
                  <i className="dot green" />
                  {m.trend}
                  <ArrowUpRight size={12} />
                </em>
              </button>
            ))}
          </div>
          <div className="section-label">
            <div>
              <Sparkles size={17} />
              <h2>{t("attention")}</h2>
              <span className="count-chip">
                {s.issues.length + s.approvals.length}
              </span>
            </div>
            <LinkButton onClick={() => navigate("/command")}>
              {t("viewAll")}
            </LinkButton>
          </div>
          <div className="insight-grid">
            <Card className="insight-card">
              <div className="insight-top">
                <span className="icon-tile peach">
                  <TriangleAlert size={18} />
                </span>
                <Badge value={risk ? "At risk" : "Ready"} />
              </div>
              <span className="eyebrow">OPERATIONS AGENT</span>
              <h3>{risk ? t("arrivalRisk") : "Your homes are looking good"}</h3>
              <p>
                {risk
                  ? `${risk.name} has ${readiness(state, risk).blockers.length} readiness blockers. Let’s get everything in place before your guests arrive.`
                  : "The selected homes have complete evidence for readiness."}
              </p>
              {risk && (
                <button className="source-chip" onClick={() => open(risk.id)}>
                  <MapPin size={12} />
                  {risk.city} · {risk.name}
                  <ArrowUpRight size={11} />
                </button>
              )}
              <Button
                variant="primary"
                onClick={() => (risk ? open(risk.id) : navigate("/operations"))}
              >
                {t("viewOperations")}
                <ArrowRight size={15} />
              </Button>
            </Card>
            <Card className="insight-card">
              <div className="insight-top">
                <span className="icon-tile lilac">
                  <ShieldCheck size={18} />
                </span>
                <Badge value={pending ? "Pending" : "Complete"} />
              </div>
              <span className="eyebrow">FINANCE AGENT</span>
              <h3>
                {pending
                  ? "One decision. A smoother stay."
                  : "Your approval inbox is clear"}
              </h3>
              <p>
                {pending
                  ? `${pending.title}. Review the quote and its linked evidence; an approval schedules work, then your team verifies completion.`
                  : "Every decision is saved with its evidence and a local audit record."}
              </p>
              {pending && (
                <span className="approval-amount">
                  {money(pending.amount, pending.currency, state.language)}
                  <small>Mock supplier quote</small>
                </span>
              )}
              <Button
                onClick={() =>
                  pending ? open(pending.id) : navigate("/approvals")
                }
              >
                {t("review")} {t("approvals").toLowerCase()}
                <ArrowRight size={15} />
              </Button>
            </Card>
          </div>
          <div className="dashboard-lower">
            <Card
              title="A portfolio with perspective"
              subtitle="Booked accommodation · selected reporting period · demo FX applied"
              action={
                <Button
                  variant="ghost"
                  aria-label="Open revenue reports"
                  onClick={() => navigate("/reports")}
                >
                  <ArrowUpRight size={16} />
                </Button>
              }
            >
              <div className="chart-stat">
                <strong>
                  {money(
                    trend.reduce((a, b) => a + b.revenue * 100, 0),
                    filters.currency,
                    state.language,
                    true,
                  )}
                </strong>
                <span>
                  <TrendingUp size={13} /> Across the selected homes
                </span>
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
                        <stop
                          offset="100%"
                          stopColor="#70b9a7"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#80918a", fontSize: 10 }}
                      minTickGap={20}
                    />
                    <Tooltip
                      formatter={(v) =>
                        money(Number(v) * 100, filters.currency, state.language)
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#5cae99"
                      fill="url(#revenue-fill)"
                      strokeWidth={2}
                      animationDuration={240}
                      isAnimationActive={state.motion}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card
              title="Three countries. One collection."
              subtitle="Click a country to focus your portfolio"
            >
              <div className="country-list">
                {(["UK", "Spain", "Italy"] as const).map((c, i) => {
                  const homes = state.properties.filter(
                      (p) => s.ids.includes(p.id) && p.country === c,
                    ),
                    r = homes.filter(
                      (p) => readiness(state, p).status === "Ready",
                    ).length;
                  return (
                    <button
                      key={c}
                      onClick={() =>
                        setFilters({ country: c, city: "", propertyId: "" })
                      }
                    >
                      <span className="country-flag">
                        {["🇬🇧", "🇪🇸", "🇮🇹"][i]}
                      </span>
                      <span>
                        <strong>{c === "UK" ? "United Kingdom" : c}</strong>
                        <small>
                          {homes.length} homes · {r} ready
                        </small>
                        <span className="country-progress">
                          <i
                            style={{
                              width: `${(r / Math.max(1, homes.length)) * 100}%`,
                            }}
                          />
                        </span>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
          <Card
            title={t("agentActivity")}
            subtitle="A shared history of observations, decisions and verified actions"
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
                .map((e, i) => (
                  <button key={e.id} onClick={() => open(e.sourceId)}>
                    <span className={`feed-icon ${i ? "mint" : "purple"}`}>
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
        <aside className="right-rail">
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
              <Badge value="Queued" />
            </div>
            {tasks.length ? (
              tasks.map((task) => (
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
                </button>
              ))
            ) : (
              <p className="muted small">No open tasks due today.</p>
            )}
            <LinkButton onClick={() => navigate("/operations")}>
              {t("viewAll")} {t("tasks").toLowerCase()}
            </LinkButton>
          </Card>
          <Card
            className="readiness-card"
            title={t("readiness")}
            subtitle="Evidence first. Every time."
          >
            <div className="ready-ring">
              <svg viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#f1eee6"
                  strokeWidth="11"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#6db9a6"
                  strokeWidth="11"
                  strokeDasharray={`${(s.ready / Math.max(1, s.properties.length)) * 302} 302`}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                <strong>{s.ready}</strong>
                <small>/ {s.properties.length} homes</small>
              </span>
            </div>
            {[
              [t("ready"), s.ready, "green"],
              [t("atRisk"), s.atRisk, "amber"],
              [t("notReady"), s.notReady, "red"],
            ].map(([label, count, color]) => (
              <button
                key={label}
                onClick={() => navigate("/operations")}
                className="readiness-legend"
              >
                <span>
                  <i className={`dot ${color}`} />
                  {label}
                </span>
                <strong>{count}</strong>
              </button>
            ))}
          </Card>
          <div className="quiet-note">
            <span>
              <Users size={17} />
            </span>
            <h3>
              A thoughtful team,
              <br />
              in every time zone.
            </h3>
            <p>
              UK, Spain and Italy. One clear view, with property-local times.
            </p>
            <div>
              <span className="dot green" /> {t("noLive")}
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
        </aside>
      </div>
    </>
  );
}
export function CommandCentre() {
  const { state, send, filters, t, open } = useStore(),
    s = summary(state, filters);
  return (
    <>
      <SectionTitle
        eyebrow="YOUR SIMULATED OPERATING TEAM"
        title={t("command")}
        description={t("recommendations")}
        actions={
          <>
            <Button
              onClick={() =>
                send({
                  type: "settings",
                  values: { agentsPaused: !state.agentsPaused },
                })
              }
            >
              {state.agentsPaused ? t("play") : t("pause")} agents
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                send(
                  { type: "runAgents" },
                  "Agent checks evaluated. Replaying the same time slot has no duplicate effects.",
                )
              }
            >
              {t("runAgents")}
              <Sparkles size={15} />
            </Button>
          </>
        }
      />
      <div className="command-banner">
        <div className="icon-tile">
          <Sparkles size={24} />
        </div>
        <div>
          <span className="eyebrow">THE CENTRAL MANAGER</span>
          <h2>{t("insights")}</h2>
          <p>
            {s.issues.length} open issues · {s.approvals.length} decisions
            waiting ·{" "}
            {state.agentsPaused
              ? "Agents paused"
              : "Monitoring only while the demo runs"}
          </p>
        </div>
        <Button onClick={() => open("run-seed")}>
          View the morning handover
          <ArrowRight size={15} />
        </Button>
      </div>
      <div className="agent-grid">
        {[
          "Central manager",
          "Operations",
          "Housekeeping & Quality",
          "Maintenance",
          "Guest Experience",
          "Reputation",
          "Revenue & Pricing",
          "Finance",
          "Owner Relations",
          "Growth",
          "Compliance Assistant",
        ].map((name, i) => {
          const runs = state.runs.filter(
              (r) =>
                r.agent === name &&
                r.sources.some(
                  (id) =>
                    s.ids.includes(id) ||
                    [
                      ...state.issues,
                      ...state.tasks,
                      ...state.bills,
                      ...state.inventory,
                    ].some((e) => e.id === id && s.ids.includes(e.propertyId)),
                ),
            ),
            last = runs[0];
          return (
            <Card key={name} className="agent-card">
              <div className="agent-top">
                <span className={`icon-tile ${i % 3 === 0 ? "lilac" : "mint"}`}>
                  <Sparkles size={19} />
                </span>
                <Badge
                  value={
                    state.agentsPaused || state.policies.paused
                      ? "Paused"
                      : last?.status || "queued"
                  }
                />
              </div>
              <h3>{name}</h3>
              <p>{last?.result || "Waiting for the next scheduled check."}</p>
              <div className="agent-meta">
                <span>
                  Last check{" "}
                  <strong>
                    {last ? dateTime(last.time, state.language) : "Not yet run"}
                  </strong>
                </span>
                <span>
                  Next check{" "}
                  <strong>
                    {state.agentsPaused
                      ? "Paused"
                      : dateTime(
                          new Date(
                            Date.parse(state.lastCheck) + 900000,
                          ).toISOString(),
                          state.language,
                        )}
                  </strong>
                </span>
                <span>
                  Completed / queued{" "}
                  <strong>
                    {runs.filter((r) => r.status === "completed").length} /{" "}
                    {runs.filter((r) => r.status !== "completed").length}
                  </strong>
                </span>
              </div>
              <small className="policy-note">
                {t("policy")}:{" "}
                {name === "Finance" || name === "Revenue & Pricing"
                  ? "Human approval for all financial changes"
                  : "Observe, draft, and create tasks. Escalate sensitive actions."}
              </small>
              <Button
                onClick={() =>
                  last
                    ? open(last.id)
                    : send(
                        { type: "runAgents" },
                        "Check executed or safely deduplicated for this time slot.",
                      )
                }
              >
                {last ? "View evidence & outcome" : "Run check"}
                <ArrowUpRight size={13} />
              </Button>
            </Card>
          );
        })}
      </div>
      <Card
        title="Portfolio risk matrix"
        subtitle="Derived from current evidence. Click any cell to inspect its sources."
      >
        <div className="table-scroll">
          <table className="risk-table">
            <thead>
              <tr>
                <th>{t("property")}</th>
                <th>Arrival readiness</th>
                <th>Maintenance</th>
                <th>Guest experience</th>
                <th>Financial exceptions</th>
              </tr>
            </thead>
            <tbody>
              {s.properties.map((p) => {
                const ready = readiness(state, p),
                  issues = state.issues.filter(
                    (i) => i.propertyId === p.id && !i.verified,
                  ),
                  messages = state.messages.filter(
                    (m) =>
                      m.propertyId === p.id &&
                      m.direction === "Inbound" &&
                      m.urgency === "Urgent",
                  ),
                  bills = state.bills.filter(
                    (b) =>
                      b.propertyId === p.id &&
                      b.duplicateOf &&
                      b.status === "Draft",
                  );
                return (
                  <tr key={p.id}>
                    <td>
                      <button className="cell-link" onClick={() => open(p.id)}>
                        {p.name}
                      </button>
                    </td>
                    {[
                      ready.status === "Ready"
                        ? 0
                        : ready.status === "At risk"
                          ? 1
                          : 2,
                      issues.length ? 2 : 0,
                      messages.length ? 1 : 0,
                      bills.length ? 1 : 0,
                    ].map((v, i) => (
                      <td key={i}>
                        <button
                          aria-label={`${p.name} ${["readiness", "maintenance", "guests", "finance"][i]} risk`}
                          className={`risk-cell level-${v}`}
                          onClick={() =>
                            open(
                              i === 1 && issues[0]
                                ? issues[0].id
                                : i === 2 && messages[0]
                                  ? messages[0].id
                                  : i === 3 && bills[0]
                                    ? bills[0].id
                                    : p.id,
                            )
                          }
                        >
                          {["Clear", "Review", "Action needed"][v]}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="section-label">
        <h2>Open findings & recommended actions</h2>
      </div>
      <div className="insight-grid">
        {s.issues.map((i) => (
          <Card
            key={i.id}
            title={i.title}
            subtitle={state.properties.find((p) => p.id === i.propertyId)?.name}
          >
            <Badge value={i.priority} />
            <p className="body-copy">{i.notes}</p>
            <p className="muted small">
              Expected effect: a scheduled, evidenced repair. A quote approval
              does not make a home ready.
            </p>
            <Button variant="primary" onClick={() => open(i.id)}>
              {t("review")}
              <ArrowRight size={14} />
            </Button>
          </Card>
        ))}
      </div>
      {!s.properties.length && <Empty />}
    </>
  );
}
