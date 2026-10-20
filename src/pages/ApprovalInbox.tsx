import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  FileCheck,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "../store";
import { summary, money, dateTime } from "../domain/selectors";
import {
  Badge,
  Button,
  Empty,
  ExportButton,
  SectionTitle,
  Tabs,
} from "../components/ui";
import {
  AnimatedValue,
  ApprovalFeedback,
  useMotionEnabled,
} from "../components/Motion";

export function Approvals() {
  const { state, filters, t, open, send } = useStore();
  const enabled = useMotionEnabled();
  const s = summary(state, filters);
  const [status, setStatus] = useState("Pending");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const records = state.approvals.filter((a) => s.ids.includes(a.propertyId));
  const approvals = records.filter(
    (a) =>
      (!status ||
        a.status === status ||
        (status === "Pending" && reviewed.includes(a.id))) &&
      (!type || a.type === type) &&
      `${a.title} ${a.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const changeStatus = (next: string) => {
    setStatus(next);
    setReviewed([]);
  };
  return (
    <div className="reference-approvals">
      <SectionTitle
        eyebrow="HOME / APPROVALS"
        title={t("approvals")}
        description="The decisions that need your judgement. Review the evidence, make the call, and see exactly what changes."
        actions={
          <ExportButton
            name="approvals"
            rows={approvals.map((a) => ({
              id: a.id,
              type: a.type,
              home: a.propertyId,
              status: a.status,
              amount: a.amount / 100,
              currency: a.currency,
              approver: a.approver || "",
            }))}
          />
        }
      />
      <div className="stat-strip approval-stats">
        {[
          {
            label: "Waiting for review",
            count: records.filter((a) => a.status === "Pending").length,
            status: "Pending",
            sub: "Ready for your decision",
            icon: Clock,
          },
          {
            label: "Approved in demo",
            count: records.filter((a) => a.status === "Approved").length,
            status: "Approved",
            sub: "Evidence and outcomes recorded",
            icon: ShieldCheck,
          },
          {
            label: "Evidence changed",
            count: records.filter((a) => a.status === "Stale").length,
            status: "Stale",
            sub: "A fresh review is required",
            icon: FileCheck,
          },
        ].map((metric) => (
          <button
            key={metric.label}
            onClick={() => changeStatus(metric.status)}
          >
            <span>
              <metric.icon size={15} />
              {metric.label}
            </span>
            <strong>
              <AnimatedValue value={metric.count} />
            </strong>
            <small>{metric.sub}</small>
          </button>
        ))}
      </div>
      <Tabs>
        {["Pending", "Approved", "Rejected", "Stale", ""].map((value) => (
          <button
            key={value}
            className={status === value ? "selected" : ""}
            onClick={() => changeStatus(value)}
          >
            {value || "All history"}
            <span className="approval-tab-count">
              {records.filter((a) => !value || a.status === value).length}
            </span>
          </button>
        ))}
      </Tabs>
      <div className="approval-filters">
        <label className="small-search">
          <Search size={14} />
          <input
            aria-label="Search approvals"
            placeholder="Search decisions, homes, or reference…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="approval-type-chips">
          {["", "Quote", "Pricing", "Purchase", "Finance", "Message"].map(
            (value) => (
              <button
                key={value}
                className={type === value ? "selected" : ""}
                aria-pressed={type === value}
                onClick={() => setType(value)}
              >
                {value || "All types"}
              </button>
            ),
          )}
        </div>
      </div>
      <section className="card approval-register">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Decision / reference</th>
                <th>Home</th>
                <th>Requested</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval, index) => (
                <Fragment key={approval.id}>
                  <motion.tr
                    className={`approval-register-row ${approval.status === "Approved" ? "approved" : ""}`}
                    initial={enabled ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: enabled ? 0.35 : 0,
                      delay: enabled ? index * 0.04 : 0,
                    }}
                  >
                    <td>
                      <div className="approval-record-name">
                        <button
                          className={`approval-expand ${expanded === approval.id ? "expanded" : ""}`}
                          aria-label={`Expand ${approval.title}`}
                          aria-expanded={expanded === approval.id}
                          onClick={() =>
                            setExpanded(
                              expanded === approval.id ? "" : approval.id,
                            )
                          }
                        >
                          <ChevronDown size={14} />
                        </button>
                        <span>
                          <button
                            className="cell-link"
                            onClick={() => open(approval.id)}
                          >
                            {approval.title}
                            <ArrowUpRight size={12} />
                          </button>
                          <small>
                            {approval.id} · {approval.type} approval
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="approval-home"
                        onClick={() => open(approval.propertyId)}
                      >
                        <i className="home-marker" />
                        {
                          state.properties.find(
                            (p) => p.id === approval.propertyId,
                          )?.name
                        }
                      </button>
                    </td>
                    <td>
                      <span className="approval-requested">
                        {dateTime(approval.requested, state.language)}
                      </span>
                    </td>
                    <td>
                      <strong className="approval-register-amount">
                        {money(
                          approval.amount,
                          approval.currency,
                          state.language,
                        )}
                      </strong>
                    </td>
                    <td>
                      <Badge value={approval.status} />
                    </td>
                    <td>
                      {approval.status === "Approved" ? (
                        <ApprovalFeedback />
                      ) : (
                        <div className="approval-row-actions">
                          <Button
                            variant="ghost"
                            onClick={() => open(approval.id)}
                          >
                            Review
                            <ArrowUpRight size={12} />
                          </Button>
                          {approval.status === "Pending" && (
                            <Button
                              variant="primary"
                              aria-label={`Approve ${approval.title}`}
                              disabled={
                                !["Admin", "Finance"].includes(state.role)
                              }
                              onClick={() => {
                                if (
                                  send(
                                    { type: "approve", id: approval.id },
                                    "Decision evaluated against the current evidence. Open the record to see the outcome.",
                                  )
                                )
                                  setReviewed((ids) => [...ids, approval.id]);
                              }}
                            >
                              <Check size={14} />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                  <tr className="approval-expanded-row">
                    <td colSpan={6}>
                      <AnimatePresence initial={false}>
                        {expanded === approval.id && (
                          <motion.div
                            className="approval-inline-detail"
                            initial={
                              enabled ? { height: 0, opacity: 0 } : false
                            }
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: enabled ? 0.3 : 0 }}
                          >
                            <div>
                              <div className="approval-inline-steps">
                                {[
                                  "Evidence linked",
                                  "Decision requested",
                                  "Reviewed",
                                  "Local action",
                                ].map((label, i) => (
                                  <span
                                    className={
                                      i < 2 || approval.status === "Approved"
                                        ? "complete"
                                        : ""
                                    }
                                    key={label}
                                  >
                                    <i>
                                      {i < 2 ||
                                      approval.status === "Approved" ? (
                                        <Check size={10} />
                                      ) : (
                                        i + 1
                                      )}
                                    </i>
                                    {label}
                                  </span>
                                ))}
                              </div>
                              <p>
                                {approval.type === "Quote"
                                  ? "Authorising the quote schedules the repair. The home stays blocked until repair evidence, verification, and inspection are complete."
                                  : "The proposed change is checked against the current record and the same simulated role policy used everywhere in the app."}
                              </p>
                              <div className="approval-inline-sources">
                                {[
                                  approval.entityId,
                                  ...approval.evidence.filter(
                                    (id) => id !== approval.entityId,
                                  ),
                                ].map((id) => (
                                  <button key={id} onClick={() => open(id)}>
                                    <FileCheck size={12} />
                                    {id}
                                    <ArrowUpRight size={10} />
                                  </button>
                                ))}
                                <Button onClick={() => open(approval.id)}>
                                  Open full decision
                                  <ArrowUpRight size={12} />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!approvals.length && (
          <Empty text="Nothing waiting here. Try another status or decision type." />
        )}
        <div className="approval-register-footer">
          <span>{approvals.length} decisions · selected portfolio</span>
          <span>
            <ShieldCheck size={12} />
            Every decision is recorded
          </span>
        </div>
      </section>
      <div className="approval-guidance">
        <span className="icon-tile mint">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3>Your judgement. A complete record.</h3>
          <p>
            Approvals check the latest evidence before applying a change. Cost
            approval schedules work; verified repair and inspection release
            readiness.
          </p>
        </div>
        <button onClick={() => open("run-seed")}>
          See the morning handover
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}
