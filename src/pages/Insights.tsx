import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Send,
} from "lucide-react";
import { useStore } from "../store";
import { summary, readiness, dateTime, money } from "../domain/selectors";
import { demoAssistant } from "../domain/assistant";
import { Badge, Button, Card, Empty, SectionTitle } from "../components/ui";
import {
  ApprovalFeedback,
  CountUp,
  HealthGauge,
  useMotionEnabled,
} from "../components/Motion";

export function CommandCentre() {
  const { state, filters, t, open, send, setAssistant } = useStore();
  const enabled = useMotionEnabled();
  const s = summary(state, filters);
  const [kind, setKind] = useState("All");
  const [visibility, setVisibility] = useState("Active");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const decisions = state.approvals.filter(
    (a) =>
      s.ids.includes(a.propertyId) &&
      ["Pending", "Approved"].includes(a.status),
  );
  const findings = [
    ...s.issues.map((issue) => ({
      id: issue.id,
      source: issue.id,
      propertyId: issue.propertyId,
      kind: "Risk",
      title: issue.title,
      body: issue.notes,
      tag:
        issue.priority === "Critical" ? "Arrival at risk" : "Needs attention",
      action: "Review repair plan",
      complete: false,
      amount: "",
      policy: "Cost approval and verified repair are separate steps.",
      evidence:
        readiness(
          state,
          s.properties.find((p) => p.id === issue.propertyId)!,
        ).blockers.length + " linked readiness checks",
    })),
    ...decisions.map((approval) => ({
      id: approval.id,
      source: approval.entityId,
      propertyId: approval.propertyId,
      kind: "Decision",
      title: approval.title,
      body:
        approval.type === "Quote"
          ? "Your maintenance team has prepared the quote. Authorise the cost to schedule the repair, then independently verify the work."
          : "Review the proposed change and source evidence. Approval revalidates the record before applying the local demo command.",
      tag: approval.type,
      action: "Approve in demo",
      complete: approval.status === "Approved",
      amount: money(approval.amount, approval.currency, state.language),
      policy:
        approval.type === "Quote"
          ? "Approval schedules work; repair evidence is still required."
          : "Current-state checks and the same approval policy apply.",
      evidence: `${approval.evidence.length} source records linked`,
    })),
  ];
  const visible = findings.filter(
    (f) =>
      (kind === "All" || f.kind === kind) &&
      (visibility === "All" ||
        (visibility === "Dismissed"
          ? dismissed.includes(f.id)
          : !dismissed.includes(f.id))),
  );
  const ask = (message: string) => {
    if (!message.trim()) return;
    send({
      type: "chat",
      message: {
        id: `chat-u-${state.revision}`,
        role: "user",
        text: message,
        sources: [],
      },
    });
    send({
      type: "chat",
      message: demoAssistant.respond(state, filters, message),
    });
    setQuestion("");
    setAssistant(true);
  };
  return (
    <div className="reference-command">
      <SectionTitle
        eyebrow="HOME / AI INSIGHTS"
        title={t("command")}
        description="Risks, decisions, and opportunities your team found across the portfolio. Every insight comes with evidence."
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
                  "Agent checks evaluated against the current demo records.",
                )
              }
            >
              <Sparkles size={15} />
              {t("runAgents")}
            </Button>
          </>
        }
      />
      <motion.section
        className="intelligence-hero"
        initial={enabled ? { opacity: 0, y: 18, filter: "blur(6px)" } : false}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: enabled ? 0.65 : 0 }}
      >
        <div className="intelligence-score">
          <span>
            <span className="ai-label-icon">
              <Sparkles size={15} />
            </span>
            Portfolio intelligence
          </span>
          <HealthGauge
            large
            value={Math.round(
              (s.ready / Math.max(1, s.properties.length)) * 100,
            )}
          />
          <small>Evidence-based readiness · simulated AI</small>
        </div>
        <div className="intelligence-brief">
          <span className="intelligence-eyebrow">
            <i className="dot green" />
            THE CENTRAL MANAGER
          </span>
          <h2>
            {s.issues.length
              ? "A clear view. A calmer day."
              : "Looking good, together."}
          </h2>
          <p>
            {s.issues.length
              ? `Your team found ${s.issues.length} issues to look after and ${s.approvals.length} decisions that need your judgement. Here’s where a little attention makes the biggest difference.`
              : "Your team is watching the details. Open any insight to see the source records and exactly what happens next."}
          </p>
          <div className="intelligence-stats">
            <div>
              <strong>
                <CountUp value={s.issues.length} />
              </strong>
              <span>Open risks</span>
            </div>
            <div>
              <strong>
                <CountUp value={s.approvals.length} />
              </strong>
              <span>Pending decisions</span>
            </div>
            <div>
              <strong>
                <CountUp
                  value={
                    state.runs.filter(
                      (r) =>
                        r.status === "completed" &&
                        r.sources.some((id) => s.ids.includes(id)),
                    ).length
                  }
                />
              </strong>
              <span>Completed checks</span>
            </div>
          </div>
          <button onClick={() => open("run-seed")}>
            Read the morning handover
            <ArrowUpRight size={13} />
          </button>
        </div>
        <span className="intelligence-orbit orbit-one" aria-hidden="true" />
        <span className="intelligence-orbit orbit-two" aria-hidden="true" />
      </motion.section>
      <div className="intelligence-layout">
        <section className="suggestions-section card">
          <div className="suggestions-heading">
            <span className="icon-tile mint">
              <Sparkles size={17} />
            </span>
            <div>
              <h2>Suggestions</h2>
              <p>
                {
                  findings.filter(
                    (f) => !f.complete && !dismissed.includes(f.id),
                  ).length
                }{" "}
                active · {findings.filter((f) => f.complete).length} applied ·{" "}
                {dismissed.length} dismissed
              </p>
            </div>
          </div>
          <div className="suggestion-toolbar">
            <div className="suggestion-kinds">
              {["All", "Risk", "Decision"].map((v) => (
                <button
                  key={v}
                  className={kind === v ? "selected" : ""}
                  aria-pressed={kind === v}
                  onClick={() => setKind(v)}
                >
                  {v !== "All" && (
                    <i className={`dot ${v === "Risk" ? "red" : "purple"}`} />
                  )}
                  {v === "All" ? "All" : v + "s"}
                  <span>
                    {findings.filter((f) => v === "All" || f.kind === v).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="segmented">
              {["Active", "Dismissed", "All"].map((v) => (
                <button
                  key={v}
                  className={visibility === v ? "selected" : ""}
                  aria-pressed={visibility === v}
                  onClick={() => setVisibility(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <motion.div layout={enabled} className="suggestion-grid">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((finding, index) => (
                <motion.article
                  layout={enabled}
                  key={finding.id}
                  className={`suggestion-card ${finding.complete ? "applied" : ""}`}
                  initial={enabled ? { opacity: 0, y: 15, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.94,
                    transition: { duration: enabled ? 0.18 : 0 },
                  }}
                  transition={{
                    duration: enabled ? 0.4 : 0,
                    delay: enabled ? Math.min(index, 5) * 0.045 : 0,
                  }}
                >
                  <div className="suggestion-card-header">
                    <span
                      className={`icon-tile ${finding.kind === "Risk" ? "peach" : "lilac"}`}
                    >
                      {finding.kind === "Risk" ? (
                        <TriangleAlert size={17} />
                      ) : (
                        <CircleDollarSign size={17} />
                      )}
                    </span>
                    <div>
                      <span className="suggestion-type">{finding.kind}</span>
                      <button onClick={() => open(finding.propertyId)}>
                        <i className="home-marker" />
                        {
                          state.properties.find(
                            (p) => p.id === finding.propertyId,
                          )?.name
                        }
                      </button>
                    </div>
                    <span className="suggestion-impact">
                      {finding.amount || finding.tag}
                    </span>
                  </div>
                  <button
                    className="suggestion-title"
                    onClick={() => open(finding.id)}
                  >
                    <h3>{finding.title}</h3>
                    <ArrowUpRight size={14} />
                  </button>
                  <p>{finding.body}</p>
                  <button
                    className="suggestion-evidence"
                    onClick={() => open(finding.source)}
                  >
                    <ShieldCheck size={12} />
                    {finding.evidence}
                    <ArrowUpRight size={11} />
                  </button>
                  <div className="suggestion-policy">
                    <i
                      className={`dot ${finding.kind === "Risk" ? "red" : "purple"}`}
                    />
                    <span>{finding.policy}</span>
                  </div>
                  {finding.complete ? (
                    <div className="suggestion-result">
                      <ApprovalFeedback
                        key={
                          celebrate === finding.id
                            ? celebrate
                            : `saved-${finding.id}`
                        }
                      />
                      <button onClick={() => open(finding.id)}>
                        View outcome
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="suggestion-actions">
                      <Button
                        variant="primary"
                        disabled={
                          finding.kind === "Decision" &&
                          !["Admin", "Finance"].includes(state.role)
                        }
                        onClick={() => {
                          if (finding.kind === "Risk") open(finding.id);
                          else if (
                            send(
                              { type: "approve", id: finding.id },
                              "Decision evaluated. Open the outcome to inspect the result.",
                            )
                          )
                            setCelebrate(finding.id);
                        }}
                      >
                        {finding.kind === "Decision" ? (
                          <Check size={13} />
                        ) : (
                          <ArrowRight size={13} />
                        )}
                        {finding.action}
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`${dismissed.includes(finding.id) ? "Restore" : "Dismiss"} ${finding.title}`}
                        onClick={() =>
                          setDismissed((ids) =>
                            ids.includes(finding.id)
                              ? ids.filter((id) => id !== finding.id)
                              : [...ids, finding.id],
                          )
                        }
                      >
                        {dismissed.includes(finding.id) ? "Restore" : "Dismiss"}
                      </Button>
                    </div>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
          {!visible.length && (
            <Empty text="All clear here. Switch a filter to explore the other suggestions." />
          )}
        </section>
        <aside className="intelligence-rail">
          <Card
            className="risk-radar"
            title={
              <>
                <span className="icon-tile mint">
                  <ShieldCheck size={17} />
                </span>
                Risk radar
              </>
            }
            subtitle="Current evidence by home. Select a cell to see what needs attention."
          >
            <div className="risk-radar-scroll">
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Home</th>
                    <th>Arrival</th>
                    <th>Repair</th>
                    <th>Guest</th>
                    <th>Finance</th>
                  </tr>
                </thead>
                <tbody>
                  {s.properties.slice(0, expanded ? undefined : 8).map((p) => {
                    const ready = readiness(state, p);
                    const issue = state.issues.find(
                      (i) => i.propertyId === p.id && !i.verified,
                    );
                    const message = state.messages.find(
                      (m) =>
                        m.propertyId === p.id &&
                        m.direction === "Inbound" &&
                        m.urgency === "Urgent",
                    );
                    const bill = state.bills.find(
                      (b) =>
                        b.propertyId === p.id &&
                        b.duplicateOf &&
                        b.status === "Draft",
                    );
                    return (
                      <tr key={p.id}>
                        <td>
                          <button
                            className="radar-home"
                            onClick={() => open(p.id)}
                          >
                            <i className={`home-marker country-${p.country}`} />
                            {p.name}
                          </button>
                        </td>
                        {[
                          ready.status === "Ready"
                            ? 0
                            : ready.status === "At risk"
                              ? 1
                              : 2,
                          issue ? 2 : 0,
                          message ? 1 : 0,
                          bill ? 1 : 0,
                        ].map((v, i) => (
                          <td key={i}>
                            <button
                              title={`${p.name}: ${["Arrival", "Repair", "Guest", "Finance"][i]} · ${["Clear", "Review", "Action needed"][v]}`}
                              aria-label={`${p.name} ${["readiness", "maintenance", "guests", "finance"][i]} risk: ${["Clear", "Review", "Action needed"][v]}`}
                              className={`risk-cell level-${v}`}
                              onClick={() =>
                                open(
                                  i === 1 && issue
                                    ? issue.id
                                    : i === 2 && message
                                      ? message.id
                                      : i === 3 && bill
                                        ? bill.id
                                        : p.id,
                                )
                              }
                            >
                              {v === 0 ? "✓" : v === 1 ? "•" : "!"}
                            </button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="radar-legend">
              <span>
                <i className="dot green" />
                Clear
              </span>
              <span>
                <i className="dot amber" />
                Review
              </span>
              <span>
                <i className="dot red" />
                Action
              </span>
            </div>
            <button
              className="radar-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? "Show fewer homes"
                : `View all ${s.properties.length} homes`}
              <ArrowUpRight size={12} />
            </button>
          </Card>
          <Card className="portfolio-ask">
            <div className="portfolio-ask-title">
              <span className="icon-tile lilac">
                <Sparkles size={18} />
              </span>
              <div>
                <h2>Ask about your portfolio</h2>
                <p>Answers from the same records as this page.</p>
              </div>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <input
                aria-label="Ask about your portfolio"
                placeholder="What needs my attention?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button
                variant="primary"
                aria-label="Ask portfolio question"
                type="submit"
                disabled={!question.trim()}
              >
                <Send size={15} />
              </Button>
            </form>
            {[
              "What needs attention before today's arrivals?",
              "What is our owner payable for this month?",
              "Show everything the agents did today.",
            ].map((q) => (
              <button
                className="portfolio-question"
                key={q}
                onClick={() => ask(q)}
              >
                {q}
                <ArrowUpRight size={12} />
              </button>
            ))}
            <small className="portfolio-ask-note">
              <Sparkles size={11} />
              Prepared demo responses · no live LLM
            </small>
          </Card>
        </aside>
      </div>
      <div className="section-label">
        <div>
          <Sparkles size={17} />
          <h2>Your operating team</h2>
          <span className="count-chip">11 agents</span>
        </div>
        <span className="agent-check-time">
          <Clock size={12} />
          Last check {dateTime(state.lastCheck, state.language)}
        </span>
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
        ].map((name, index) => {
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
          );
          const last = runs[0];
          return (
            <Card className="agent-card" key={name}>
              <div className="agent-top">
                <span
                  className={`icon-tile ${index % 3 === 0 ? "lilac" : "mint"}`}
                >
                  <Sparkles size={18} />
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
                  Last check
                  <strong>
                    {last ? dateTime(last.time, state.language) : "Not yet run"}
                  </strong>
                </span>
                <span>
                  Next check
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
                  Completed / queued
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
                  : "Observe, draft, create tasks. Escalate sensitive actions."}
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
      {!s.properties.length && <Empty />}
    </div>
  );
}
