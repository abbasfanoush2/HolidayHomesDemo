import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  FileImage,
  MapPin,
  Plus,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useStore } from "../store";
import type { Property, Task, Owner } from "../domain/types";
import {
  entityProperty,
  money,
  readiness,
  summary,
  dateTime,
  isBooked,
  scopedProperties,
} from "../domain/selectors";
import { day } from "../domain/seed";
import {
  Badge,
  Button,
  CheckItem,
  Empty,
  Overlay,
  PropertyArt,
  Table,
  Tabs,
} from "./ui";
const PHOTO =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260"><rect width="480" height="260" fill="#d8e6df"/><rect x="65" y="70" width="350" height="160" rx="15" fill="#8ba69a"/><rect x="88" y="90" width="140" height="65" rx="12" fill="#fff8ea"/><rect x="248" y="90" width="140" height="65" rx="12" fill="#fff8ea"/><rect x="65" y="143" width="350" height="63" rx="10" fill="#e7d6b6"/><text x="240" y="35" font-family="sans-serif" font-size="15" fill="#29463b" text-anchor="middle">PREPARED DEMO BEDROOM EVIDENCE · ILLUSTRATION</text></svg>',
  );
function OwnerAgreement({ owner }: { owner: Owner }) {
  const { state, send } = useStore();
  const [fee, setFee] = useState(owner.feeBps / 100);
  return (
    <>
      <p className="body-copy">
        {owner.email} · fictional owner. Agreement basis: accommodation after
        channel fees. Cleaning is passed through at cost; posted expenses and
        illustrative tax are allocated separately.
      </p>
      <label className="field-label">
        Management fee (%)
        <input
          aria-label="Owner management fee"
          type="number"
          min="0"
          max="50"
          step="0.01"
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
        />
      </label>
      <Button
        disabled={!["Admin", "Finance"].includes(state.role)}
        onClick={() =>
          send(
            {
              type: "updateOwner",
              id: owner.id,
              feeBps: Math.round(fee * 100),
            },
            "Fictional agreement saved. Statements and native ledgers recalculated.",
          )
        }
      >
        Save agreement
      </Button>
    </>
  );
}
function EvidenceLinks({ ids }: { ids: string[] }) {
  const { open } = useStore();
  return (
    <div className="evidence-links">
      {ids.map((id) => (
        <button key={id} onClick={() => open(id)}>
          <FileImage size={14} />
          {id}
          <ArrowUpRight size={12} />
        </button>
      ))}
    </div>
  );
}
export function TaskDetail({ task }: { task: Task }) {
  const { state, send, t, notify } = useStore(),
    [staff, setStaff] = useState(task.assignee),
    p = state.properties.find((p) => p.id === task.propertyId)!;
  return (
    <>
      <div className="detail-title">
        <Badge value={task.status} />
        <span>
          {task.kind} · {dateTime(task.due, state.language, p.timezone)}
        </span>
      </div>
      <p className="body-copy">
        {task.notes ||
          "Follow the requirements below. Evidence is recorded locally; no uploaded image is analysed by a vision model."}
      </p>
      <div className="form-row">
        <label>
          {t("assigned")}
          <select
            aria-label="Assign team member"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
          >
            <option value="">Choose a team member</option>
            {state.staff
              .filter((s) => s.country === p.country)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.role} · {s.city}
                </option>
              ))}
          </select>
        </label>
        <Button
          disabled={!staff}
          onClick={() =>
            send(
              { type: "assignTask", id: task.id, staffId: staff },
              "Assignment saved after skills, service-area and workload checks.",
            )
          }
        >
          Assign
        </Button>
      </div>
      <div className="button-row">
        <Button
          disabled={task.status === "Complete"}
          onClick={() =>
            send(
              { type: "updateTask", id: task.id, status: "In progress" },
              "Work started in the local demo.",
            )
          }
        >
          Start work
        </Button>
        <Button
          onClick={() =>
            send(
              { type: "updateTask", id: task.id, status: "Blocked" },
              "Task marked blocked.",
            )
          }
        >
          Flag a blocker
        </Button>
      </div>
      {["Cleaning", "Inspection"].includes(task.kind) && (
        <>
          <h3 className="detail-section-title">Required evidence checklist</h3>
          {[
            "Bedroom and linen checked",
            "Bathroom, access and essentials checked",
            "Final room evidence and condition checked",
          ].map((label, i) => (
            <CheckItem
              key={label}
              checked={task.checklist[i]}
              onClick={() =>
                send({ type: "updateTask", id: task.id, check: i })
              }
            >
              {label}
            </CheckItem>
          ))}
          <div className="evidence-upload">
            {task.photo && (
              <img
                src={task.photoData || PHOTO}
                alt="Local demo bedroom evidence; no live analysis"
              />
            )}
            <span>
              <FileImage size={20} />
              <strong>
                {task.photo
                  ? "Photo evidence recorded"
                  : "Bedroom evidence required"}
              </strong>
              <small>
                Original prepared illustration or your local image. No image
                analysis.
              </small>
            </span>
            <div className="button-row">
              <Button
                onClick={() =>
                  send(
                    {
                      type: "updateTask",
                      id: task.id,
                      photo: true,
                      photoData: PHOTO,
                    },
                    "Prepared synthetic bedroom evidence attached.",
                  )
                }
              >
                Attach demo evidence
              </Button>
              <label className="button">
                <Upload size={14} />
                Upload local image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 700000) {
                      notify(
                        "Choose a PNG, JPEG or WebP under 700 KB for local persistence.",
                        true,
                      );
                      return;
                    }
                    if (
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      notify("Choose a supported image type.", true);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      send(
                        {
                          type: "updateTask",
                          id: task.id,
                          photo: true,
                          photoData: String(reader.result),
                        },
                        "Local image attached. No image analysis was performed.",
                      );
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </>
      )}
      <label className="field-label">
        Work notes
        <textarea
          key={task.id}
          defaultValue={task.notes}
          onBlur={(e) => {
            if (e.target.value !== task.notes)
              send({ type: "updateTask", id: task.id, notes: e.target.value });
          }}
        />
      </label>
      <div className="button-row">
        <Button
          variant="primary"
          onClick={() =>
            task.kind === "Inspection"
              ? send(
                  { type: "inspect", propertyId: p.id, pass: true },
                  "Inspection verified. Shared readiness updated.",
                )
              : send(
                  { type: "updateTask", id: task.id, status: "Complete" },
                  "Task completed with required evidence checks.",
                )
          }
        >
          <CheckCircle2 size={15} />
          {task.kind === "Inspection" ? "Verify inspection" : "Complete task"}
        </Button>
        {task.kind === "Inspection" && (
          <Button
            variant="danger"
            onClick={() =>
              send(
                { type: "inspect", propertyId: p.id, pass: false },
                "Inspection failed. Rework task created.",
              )
            }
          >
            Fail & request rework
          </Button>
        )}
      </div>
      <h3 className="detail-section-title">Linked source</h3>
      <EvidenceLinks ids={[task.sourceId, p.id]} />
    </>
  );
}
function PropertyDetail({ p }: { p: Property }) {
  const { state, send, t, open, setModal } = useStore(),
    [tab, setTab] = useState("Overview"),
    r = readiness(state, p);
  const bookings = state.bookings
      .filter((b) => b.propertyId === p.id)
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a.start) - Date.parse(state.now)) -
          Math.abs(Date.parse(b.start) - Date.parse(state.now)),
      ),
    tasks = state.tasks.filter((t) => t.propertyId === p.id),
    issues = state.issues.filter((i) => i.propertyId === p.id);
  return (
    <>
      <PropertyArt country={p.country} />
      <div className="detail-title">
        <span>
          <MapPin size={14} />
          {p.city}, {p.country} · {p.type}
        </span>
        <Badge value={r.status} />
      </div>
      <Tabs className="detail-tabs">
        {[
          "Overview",
          "Calendar",
          "Guests",
          "Assets",
          "Cleaning",
          "Inspections",
          "Maintenance",
          "Agreement",
          "Performance",
          "Documents",
        ].map((v) => (
          <button
            key={v}
            className={tab === v ? "selected" : ""}
            onClick={() => setTab(v)}
          >
            {v}
          </button>
        ))}
      </Tabs>
      {tab === "Overview" ? (
        <>
          <div className="detail-kpis">
            <span>
              <Users size={15} />
              {p.capacity} guests · {p.bedrooms} bedrooms
            </span>
            <span>
              <Clock size={15} />
              {dateTime(state.now, state.language, p.timezone)}
            </span>
          </div>
          <h3 className="detail-section-title">{t("notReadyReason")}</h3>
          {r.blockers.length ? (
            r.blockers.map((b) => (
              <p className="blocker-line" key={b}>
                <span className="dot amber" />
                {b}
              </p>
            ))
          ) : (
            <p className="success-note">
              <CheckCircle2 size={16} />
              All required readiness evidence is complete.
            </p>
          )}
          <div className="button-row">
            <Button onClick={() => open(`inspect-${p.id.slice(2)}`)}>
              Open inspection
              <ArrowRight size={14} />
            </Button>
            {issues
              .filter((i) => !i.verified)
              .map((i) => (
                <Button key={i.id} onClick={() => open(i.id)}>
                  Review {i.asset.toLowerCase()} issue
                  <ArrowRight size={14} />
                </Button>
              ))}
            <Button onClick={() => setModal(`Property:${p.id}`)}>
              Edit property
            </Button>
          </div>
          <h3 className="detail-section-title">House rules & arrival</h3>
          <p className="body-copy">{p.rules}</p>
          <p className="body-copy">{p.checkin}</p>
          <div className="amenity-tags">
            {p.amenities.map((a) => (
              <span key={a}>
                <Check size={12} />
                {a}
              </span>
            ))}
          </div>
          <p className="muted small">
            Fictional address: {p.address}.{" "}
            {p.onboarded
              ? "Onboarding record complete."
              : "Onboarding fields need review."}
          </p>
          {!p.onboarded && (
            <Button
              onClick={() =>
                send(
                  {
                    type: "createTask",
                    propertyId: p.id,
                    title: "Complete property onboarding review",
                    kind: "Document",
                    sourceId: p.id,
                  },
                  "Onboarding review task created.",
                )
              }
            >
              Create onboarding task
            </Button>
          )}
        </>
      ) : tab === "Calendar" || tab === "Guests" ? (
        <Table
          rows={bookings}
          label="property reservations"
          onRow={(b) => open(b.id)}
          columns={[
            { key: "guest", label: "Guest" },
            { key: "start", label: "Arrival" },
            { key: "end", label: "Departure" },
            {
              key: "status",
              label: t("status"),
              render: (b) => <Badge value={b.status} />,
            },
          ]}
        />
      ) : tab === "Cleaning" || tab === "Inspections" ? (
        <Table
          rows={tasks.filter(
            (x) => x.kind === (tab === "Cleaning" ? "Cleaning" : "Inspection"),
          )}
          label="work records"
          onRow={(x) => open(x.id)}
          columns={[
            { key: "title", label: "Task" },
            { key: "due", label: "Due" },
            {
              key: "status",
              label: t("status"),
              render: (x) => <Badge value={x.status} />,
            },
          ]}
        />
      ) : tab === "Maintenance" || tab === "Assets" ? (
        <>
          <p className="body-copy">
            Fictional asset register: heating/cooling, fixtures, kitchen
            appliances and access hardware. Repair records retain costs and
            independent verification.
          </p>
          <Table
            rows={issues}
            label="asset issues"
            onRow={(i) => open(i.id)}
            columns={[
              { key: "title", label: "Issue" },
              { key: "asset", label: "Asset" },
              {
                key: "status",
                label: t("status"),
                render: (i) => <Badge value={i.status} />,
              },
            ]}
          />
          <Button onClick={() => setModal(`Issue:${p.id}`)}>
            <Plus size={14} />
            New issue
          </Button>
        </>
      ) : tab === "Agreement" ? (
        <>
          <h3>{state.owners.find((o) => o.id === p.ownerId)?.name}</h3>
          <p className="body-copy">
            Management fee: 20% of accommodation after channel fees. Cleaning
            pass-through at cost. Owner bears approved maintenance expense. All
            agreement terms are illustrative.
          </p>
          <EvidenceLinks ids={[p.ownerId]} />
        </>
      ) : tab === "Performance" ? (
        <>
          <div className="ledger">
            <div>
              <span>Base nightly accommodation</span>
              <strong>{money(p.baseRate, p.currency, state.language)}</strong>
            </div>
            <div>
              <span>Bounded pricing range</span>
              <strong>
                {money(p.minRate, p.currency)}–{money(p.maxRate, p.currency)}
              </strong>
            </div>
            <div>
              <span>Active historical & future reservations</span>
              <strong>
                {bookings.filter((b) => b.status !== "Cancelled").length}
              </strong>
            </div>
          </div>
          <p className="muted small">
            Historical ratings do not change when repair state changes. Future
            booked stays are not realised earnings.
          </p>
        </>
      ) : (
        <Table
          rows={state.documents.filter((d) => d.propertyId === p.id)}
          onRow={(d) => open(d.id)}
          label="documents"
          columns={[
            { key: "title", label: "Document" },
            { key: "due", label: "Review due" },
            {
              key: "status",
              label: t("status"),
              render: (d) => <Badge value={d.status} />,
            },
          ]}
        />
      )}
      <HistoryList propertyId={p.id} />
    </>
  );
}
function HistoryList({ propertyId }: { propertyId: string }) {
  const { state, open } = useStore();
  return (
    <>
      <h3 className="detail-section-title">Incident & activity history</h3>
      <div className="detail-history">
        {state.events
          .filter((e) => e.propertyId === propertyId)
          .slice(0, 8)
          .map((e) => (
            <button key={e.id} onClick={() => open(e.sourceId)}>
              <span className="dot green" />
              <span>
                {e.title}
                <small>
                  {e.actor} · {dateTime(e.time, state.language)}
                </small>
              </span>
              <ArrowUpRight size={12} />
            </button>
          ))}
      </div>
    </>
  );
}
export function Details() {
  const { state, detail, setDetail, open, send, filters, t, setModal, notify } =
      useStore(),
    [quote, setQuote] = useState("");
  if (!detail) return null;
  const p = entityProperty(state, detail),
    s = summary(state, filters),
    allowed = scopedProperties(state, {
      ...filters,
      country: "All",
      city: "",
      propertyId: "",
      team: "",
      search: "",
    }).map((p) => p.id);
  if (p && !allowed.includes(p.id))
    return (
      <Overlay title="Owner view" onClose={() => setDetail(null)}>
        <Empty text="This record is outside this fictional owner’s portfolio." />
      </Overlay>
    );
  let title = "Source record",
    body: React.ReactNode = null;
  const property = state.properties.find((e) => e.id === detail),
    task = state.tasks.find((e) => e.id === detail),
    issue = state.issues.find((e) => e.id === detail),
    a = state.approvals.find((e) => e.id === detail),
    booking = state.bookings.find((e) => e.id === detail),
    msg = state.messages.find((e) => e.id === detail),
    batch = state.batches.find((e) => e.id === detail),
    run = state.runs.find((e) => e.id === detail),
    stock = state.inventory.find((e) => e.id === detail),
    bill = state.bills.find((e) => e.id === detail),
    doc = state.documents.find((e) => e.id === detail),
    owner = state.owners.find((e) => e.id === detail),
    review = state.reviews.find((e) => e.id === detail);
  if (property) {
    title = property.name;
    body = <PropertyDetail key={property.id} p={property} />;
  } else if (task) {
    title = task.title;
    body = <TaskDetail key={task.id} task={task} />;
  } else if (issue) {
    title = issue.title;
    body = (
      <>
        <div className="detail-title">
          <Badge value={issue.status} />
          <Badge value={issue.priority} />
        </div>
        <p className="body-copy">{issue.notes}</p>
        <div className="ledger">
          <div>
            <span>Asset / supplier</span>
            <strong>
              {issue.asset} · {issue.supplier}
            </strong>
          </div>
          <div>
            <span>Cost responsibility</span>
            <strong>
              {issue.ownerResponsibility ? "Fictional owner" : "Operator"}
            </strong>
          </div>
          <div>
            <span>Mock quote · version {issue.version}</span>
            <strong>
              {money(issue.quote, issue.currency, state.language)}
            </strong>
          </div>
          <div>
            <span>Repair evidence</span>
            <Badge value={issue.evidence ? "Complete" : "Missing"} />
          </div>
          <div>
            <span>Independent verification</span>
            <Badge value={issue.verified ? "Complete" : "Pending"} />
          </div>
        </div>
        <div className="notice">
          <ShieldCheck size={18} />
          <span>
            Cost approval schedules work. The critical issue keeps readiness
            blocked until repair evidence and independent verification exist.
          </span>
        </div>
        <div className="button-row">
          {["Open", "Assigned", "In progress", "Awaiting approval"].includes(
            issue.status,
          ) && (
            <Button
              variant="primary"
              onClick={() =>
                send(
                  { type: "requestQuote", id: issue.id },
                  "Quote sent to the shared approval inbox.",
                )
              }
            >
              Request cost approval
            </Button>
          )}
          {issue.status === "Open" && (
            <Button
              onClick={() =>
                send(
                  { type: "updateIssue", id: issue.id, status: "Assigned" },
                  "Repair assigned in the demo.",
                )
              }
            >
              Assign repair
            </Button>
          )}
          {["Assigned", "Scheduled"].includes(issue.status) && (
            <Button
              onClick={() =>
                send(
                  { type: "updateIssue", id: issue.id, status: "In progress" },
                  "Repair work started. Home remains blocked.",
                )
              }
            >
              Start repair
            </Button>
          )}
          {["Scheduled", "In progress"].includes(issue.status) && (
            <Button
              variant="primary"
              onClick={() =>
                send(
                  {
                    type: "updateIssue",
                    id: issue.id,
                    status: "Resolved",
                    evidence: true,
                  },
                  "Demo repair evidence recorded. Independent verification is still required.",
                )
              }
            >
              Record demo repair evidence
            </Button>
          )}
          {issue.status === "Resolved" && (
            <Button
              variant="primary"
              onClick={() =>
                send(
                  { type: "verifyRepair", id: issue.id },
                  "Repair independently verified. Expense posted once; inspection still required.",
                )
              }
            >
              Independently verify repair
            </Button>
          )}
        </div>
        {!issue.verified && (
          <div className="form-row">
            <label>
              Revise quote ({issue.currency})
              <input
                type="number"
                min="1"
                aria-label="Revised quote"
                placeholder={String(issue.quote / 100)}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
            </label>
            <Button
              onClick={() => {
                if (
                  send(
                    {
                      type: "reviseQuote",
                      id: issue.id,
                      amount: Math.round(Number(quote) * 100),
                    },
                    "Quote changed. Previous approvals are stale.",
                  )
                )
                  setQuote("");
              }}
            >
              Save revised quote
            </Button>
          </div>
        )}
        <h3 className="detail-section-title">Sources & approvals</h3>
        <EvidenceLinks
          ids={[
            issue.propertyId,
            `msg-${issue.propertyId.slice(2)}`,
            ...state.approvals
              .filter((a) => a.entityId === issue.id)
              .map((a) => a.id),
          ]}
        />
        <HistoryList propertyId={issue.propertyId} />
      </>
    );
  } else if (a) {
    title = a.title;
    const b = state.batches.find((b) => b.id === a.entityId);
    body = (
      <>
        <div className="detail-title">
          <Badge value={a.status} />
          <span>
            {a.type} approval · version {a.version}
          </span>
        </div>
        <div className="approval-stepper">
          {["Evidence", "Requested", "Reviewed", "Executed"].map((v, i) => (
            <div
              key={v}
              className={i < 2 || a.status === "Approved" ? "complete" : ""}
            >
              <span>
                {i < 2 || a.status === "Approved" ? <Check size={13} /> : i + 1}
              </span>
              <small>{v}</small>
            </div>
          ))}
        </div>
        <div className="approval-hero-amount">
          <small>
            {a.type === "Pricing"
              ? "Total nightly rate difference"
              : "Proposed local demo amount"}
          </small>
          <strong>{money(a.amount, a.currency, state.language)}</strong>
          <span>No money moves. No external service is contacted.</span>
        </div>
        <h3 className="detail-section-title">Policy & expected effect</h3>
        <p className="body-copy">
          {a.type === "Quote"
            ? "A Finance or Admin approver can authorise the cost. Approval schedules repair work; it never resolves the issue or makes the home ready."
            : a.type === "Pricing"
              ? "Change only the selected available nights, within property bounds. Existing confirmed booking revenue stays fixed. Revalidate availability and current rates before execution."
              : a.type === "Purchase"
                ? "Approve an order for 12 units. Available stock increases only when a separate receipt is recorded."
                : a.type === "Finance"
                  ? "Exclude a duplicate draft invoice while retaining the original posted bill. No cash recovered and no change to posted ledger amounts."
                  : "Approve a prepared sensitive guest reply. Sending creates a local outbound message only."}
        </p>
        {b && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Night</th>
                  <th>Before</th>
                  <th>Proposed</th>
                </tr>
              </thead>
              <tbody>
                {b.dates.map((d, i) => (
                  <tr key={d}>
                    <td>{d}</td>
                    <td>{money(b.before[i], a.currency)}</td>
                    <td>{money(b.proposed[i], a.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <h3 className="detail-section-title">{t("evidence")}</h3>
        <EvidenceLinks
          ids={[a.entityId, ...a.evidence.filter((id) => id !== a.entityId)]}
        />
        <div className="approval-footer">
          {a.status === "Pending" ? (
            <>
              <Button
                variant="primary"
                onClick={() =>
                  send(
                    { type: "approve", id: a.id },
                    "Approval executed after current-state validation. Inspect the linked source for its result.",
                  )
                }
              >
                <Check size={15} />
                {t("approve")}
              </Button>
              <Button
                onClick={() =>
                  send(
                    { type: "approve", id: a.id, reject: true },
                    "Proposal rejected. No proposed change was applied.",
                  )
                }
              >
                {t("reject")}
              </Button>
            </>
          ) : (
            <p className="muted">
              {a.status === "Stale"
                ? "Evidence changed. Open the source and request a fresh review."
                : `${a.status} by ${a.approver || "demo reviewer"}.`}{" "}
              {a.type === "Quote" && a.status === "Approved"
                ? "Repair remains separate from cost approval."
                : ""}
            </p>
          )}
        </div>
        <HistoryList propertyId={a.propertyId} />
      </>
    );
  } else if (booking) {
    title = `Reservation · ${booking.guest}`;
    body = (
      <>
        <Badge value={booking.status} />
        <div className="ledger">
          <div>
            <span>Home</span>
            <button
              className="cell-link"
              onClick={() => open(booking.propertyId)}
            >
              {p?.name}
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            <span>Arrival / departure</span>
            <strong>
              {booking.start} → {booking.end}
            </strong>
          </div>
          <div>
            <span>Guests</span>
            <strong>
              {booking.guests} / {p?.capacity} maximum
            </strong>
          </div>
          <div>
            <span>Channel</span>
            <strong>{booking.channel} · simulated</strong>
          </div>
          <div>
            <span>Synthetic guest email</span>
            <strong>{booking.email}</strong>
          </div>
          <div>
            <span>Accommodation</span>
            <strong>{money(booking.amount, booking.currency)}</strong>
          </div>
          <div>
            <span>Cleaning pass-through</span>
            <strong>{money(booking.cleaning, booking.currency)}</strong>
          </div>
          <div>
            <span>Guest balance</span>
            <strong>
              {money(
                Math.max(0, booking.amount + booking.cleaning - booking.paid),
                booking.currency,
              )}
            </strong>
          </div>
        </div>
        <p className="body-copy">
          Special requests: {booking.requests || "None"}
        </p>
        <div className="button-row">
          <Button onClick={() => setModal(`EditBooking:${booking.id}`)}>
            Edit reservation
          </Button>
          <Button
            variant="danger"
            disabled={booking.status === "Cancelled"}
            onClick={() =>
              send(
                { type: "cancelBooking", id: booking.id },
                "Reservation cancelled locally; future turnover work removed.",
              )
            }
          >
            Cancel in demo
          </Button>
        </div>
        <h3 className="detail-section-title">History</h3>
        {booking.history.map((h, i) => (
          <p className="body-copy" key={i}>
            {h}
          </p>
        ))}
        <EvidenceLinks ids={[`turn-${booking.id}`, booking.propertyId]} />
      </>
    );
  } else if (msg) {
    title = `Conversation · ${msg.guest}`;
    body = (
      <>
        <Badge value={msg.direction} />
        <p className="body-copy">{msg.text}</p>
        <p className="muted">
          {msg.channel} · Simulated · {msg.language.toUpperCase()} ·{" "}
          {dateTime(msg.time, state.language)}
        </p>
        <div className="button-row">
          <Button
            onClick={() =>
              send(
                { type: "draftReply", id: msg.id, language: state.language },
                "Prepared multilingual reply added to this conversation.",
              )
            }
          >
            Draft contextual reply
          </Button>
          {msg.direction === "Draft" && (
            <Button
              variant="primary"
              onClick={() =>
                send(
                  { type: "sendMessage", id: msg.id },
                  "Reply evaluated against demo policy; approval may be required.",
                )
              }
            >
              Send in demo
            </Button>
          )}
        </div>
        <EvidenceLinks
          ids={[
            msg.propertyId,
            msg.bookingId,
            ...state.messages
              .filter(
                (m) =>
                  m.propertyId === msg.propertyId && m.direction === "Draft",
              )
              .map((m) => m.id),
          ]}
        />
      </>
    );
  } else if (batch) {
    title = "Pricing batch";
    body = (
      <>
        <Badge
          value={
            batch.undone ? "Undone" : batch.applied ? "Complete" : "Pending"
          }
        />
        <p className="body-copy">
          Selected unbooked nights only. Fixed confirmed bookings are preserved.
          A batch may be undone only if no later booking or rate change depends
          on it.
        </p>
        <Table
          rows={batch.dates.map((d, i) => ({
            id: d,
            date: d,
            before: batch.before[i],
            proposed: batch.proposed[i],
          }))}
          searchable={false}
          columns={[
            { key: "date", label: "Night" },
            {
              key: "before",
              label: "Before",
              render: (r) =>
                money(
                  r.before,
                  state.properties.find((p) => p.id === batch.propertyId)!
                    .currency,
                ),
            },
            {
              key: "proposed",
              label: "Proposed",
              render: (r) =>
                money(
                  r.proposed,
                  state.properties.find((p) => p.id === batch.propertyId)!
                    .currency,
                ),
            },
          ]}
        />
        {batch.applied && !batch.undone && (
          <Button
            onClick={() =>
              send(
                { type: "undoPricing", id: batch.id },
                "Available rates restored.",
              )
            }
          >
            Undo pricing batch
          </Button>
        )}
        <EvidenceLinks
          ids={state.approvals
            .filter((a) => a.entityId === batch.id)
            .map((a) => a.id)}
        />
      </>
    );
  } else if (run) {
    title = `${run.agent} · run evidence`;
    body = (
      <>
        <Badge value={run.status} />
        {[
          ["Trigger", run.trigger],
          ["Evidence summary", run.evidence],
          ["Policy checks", run.policy],
          ["Proposed action", run.action],
          ["Expected effect", run.expected],
          ["Execution result", run.result],
          ["Verification result", run.verification],
        ].map(([label, value]) => (
          <div className="run-detail" key={label}>
            <h3>{label}</h3>
            <p>{value}</p>
          </div>
        ))}
        <EvidenceLinks ids={run.sources} />
      </>
    );
  } else if (stock) {
    title = `${stock.name} · stock record`;
    body = (
      <>
        <div className="ledger">
          {[
            ["Available", stock.quantity],
            ["Minimum", stock.minimum],
            ["On order", stock.ordered],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="body-copy">
          Usage is logged with an idempotency key. An approved purchase does not
          change available stock until receipt.
        </p>
        <div className="button-row">
          <Button
            onClick={() =>
              send(
                { type: "purchase", id: stock.id },
                "Purchase request created. Approval does not receive stock.",
              )
            }
          >
            Request 12 units
          </Button>
          <Button
            disabled={!stock.ordered}
            onClick={() =>
              send(
                { type: "receive", id: stock.id },
                "Stock receipt recorded once.",
              )
            }
          >
            Confirm receipt
          </Button>
          <Button
            disabled={stock.quantity < 1}
            onClick={() =>
              send(
                {
                  type: "consume",
                  id: stock.id,
                  quantity: 1,
                  key: `manual-use-${stock.id}-${state.revision}`,
                },
                "One unit consumed and logged.",
              )
            }
          >
            Use 1 unit
          </Button>
        </div>
        <EvidenceLinks
          ids={[
            stock.propertyId,
            ...state.approvals
              .filter((a) => a.entityId === stock.id)
              .map((a) => a.id),
          ]}
        />
        <HistoryList propertyId={stock.propertyId} />
      </>
    );
  } else if (bill) {
    title = `Invoice · ${bill.reference}`;
    body = (
      <>
        <Badge value={bill.status} />
        <div className="ledger">
          <div>
            <span>Fictional supplier</span>
            <strong>{bill.supplier}</strong>
          </div>
          <div>
            <span>Amount</span>
            <strong>{money(bill.amount, bill.currency)}</strong>
          </div>
          <div>
            <span>Category</span>
            <select
              aria-label="Expense category"
              value={bill.category}
              onChange={(e) =>
                send(
                  {
                    type: "categorizeBill",
                    id: bill.id,
                    category: e.target.value,
                  },
                  "Expense category saved.",
                )
              }
            >
              {[
                "Operations",
                "Maintenance",
                "Supplies",
                "Cleaning",
                "Uncategorised",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="body-copy">
          {bill.duplicateOf
            ? "This draft matches an existing posted supplier reference. Excluding it does not recover cash or reduce posted expense."
            : "A unique draft invoice can be matched and posted to the local ledger."}
        </p>
        <div className="button-row">
          {bill.status === "Draft" && (
            <Button
              variant="primary"
              onClick={() =>
                send(
                  bill.duplicateOf
                    ? { type: "resolveBill", id: bill.id }
                    : { type: "postBill", id: bill.id },
                  bill.duplicateOf
                    ? "Exception review requested."
                    : "Unique invoice matched and posted locally.",
                )
              }
            >
              {bill.duplicateOf
                ? "Request exception review"
                : "Match & post invoice"}
            </Button>
          )}
        </div>
        <EvidenceLinks
          ids={[
            bill.propertyId,
            ...(bill.duplicateOf ? [bill.duplicateOf] : []),
            ...state.approvals
              .filter((a) => a.entityId === bill.id)
              .map((a) => a.id),
          ]}
        />
      </>
    );
  } else if (doc) {
    title = doc.title;
    body = (
      <>
        <Badge value={doc.status} />
        <p className="body-copy">
          Review due {doc.due}. This illustrative record does not certify safety
          or legal compliance. Missing and unknown evidence must be assessed by
          a qualified human.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            send(
              {
                type: "createTask",
                propertyId: doc.propertyId,
                title: `Review ${doc.title}`,
                kind: "Document",
                sourceId: doc.id,
              },
              "Human document review task created.",
            )
          }
        >
          Create renewal review task
        </Button>
        <EvidenceLinks ids={[doc.propertyId]} />
      </>
    );
  } else if (owner) {
    title = owner.name;
    body = (
      <>
        <OwnerAgreement key={owner.id} owner={owner} />
        <EvidenceLinks
          ids={state.properties
            .filter((p) => p.ownerId === owner.id && allowed.includes(p.id))
            .map((p) => p.id)}
        />
      </>
    );
  } else if (review) {
    title = `Guest review · ${review.guest}`;
    body = (
      <>
        <span className="review-stars">{"★".repeat(review.rating)}</span>
        <p className="body-copy">{review.text}</p>
        <p>{review.response}</p>
        <Button
          onClick={() =>
            send(
              { type: "reviewReply", id: review.id },
              "Factual reply prepared; no real post was made.",
            )
          }
        >
          Prepare reply
        </Button>
        <EvidenceLinks ids={[review.propertyId, review.bookingId]} />
      </>
    );
  } else if (detail.startsWith("list:") || detail.startsWith("ledger:")) {
    title = detail.startsWith("ledger:")
      ? "Native ledger sources"
      : `Portfolio ${detail.split(":")[1]}`;
    const type = detail.split(":")[1];
    const lists: Record<
      string,
      { id: string; title: string; status: string }[]
    > = {
      arrivals: s.arrivals.map((b) => ({
        id: b.id,
        title: b.guest,
        status: b.start,
      })),
      departures: s.departures.map((b) => ({
        id: b.id,
        title: b.guest,
        status: b.end,
      })),
      bookings: s.bookings.map((b) => ({
        id: b.id,
        title: b.guest,
        status: b.status,
      })),
      tasks: state.tasks
        .filter((x) => s.ids.includes(x.propertyId) && x.status !== "Complete")
        .map((x) => ({ id: x.id, title: x.title, status: x.status })),
      issues: s.issues.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
      })),
      approvals: s.approvals.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
      })),
      stock: state.inventory
        .filter((x) => s.ids.includes(x.propertyId))
        .map((x) => ({
          id: x.id,
          title: x.name,
          status: `${x.quantity} available`,
        })),
      reviews: state.reviews
        .filter((x) => s.ids.includes(x.propertyId))
        .map((x) => ({
          id: x.id,
          title: x.guest,
          status: `${x.rating} stars`,
        })),
      messages: state.messages
        .filter((x) => s.ids.includes(x.propertyId))
        .map((x) => ({ id: x.id, title: x.guest, status: x.direction })),
    };
    const rows = detail.startsWith("ledger:")
      ? s.bookings
          .filter((b) => b.currency === type)
          .map((b) => ({
            id: b.id,
            title: b.guest,
            status: money(b.amount, b.currency),
          }))
      : lists[type] || [];
    body = (
      <Table
        rows={rows}
        label="source records"
        onRow={(r) => open(r.id)}
        columns={[
          { key: "title", label: "Source record" },
          { key: "status", label: "Current state" },
        ]}
      />
    );
  } else if (detail.startsWith("rate:")) {
    const [, pid, date] = detail.split(":"),
      p = state.properties.find((p) => p.id === pid)!,
      rate = state.rates.find((r) => r.propertyId === pid && r.date === date);
    title = `Available rate · ${date}`;
    const block = state.blockedNights.find(
      (n) => n.propertyId === pid && n.date === date,
    );
    body = (
      <>
        <h3>{p.name}</h3>
        {block && (
          <p className="notice">
            Blocked: {block.reason}. No reservation or pricing proposal can use
            this night.
          </p>
        )}
        <div className="button-row">
          <Button
            disabled={!!block || isBooked(state, pid, date)}
            onClick={() => setModal(`Booking:${pid}:${date}`)}
          >
            Create reservation
          </Button>
          <Button
            disabled={isBooked(state, pid, date)}
            onClick={() =>
              send(
                block
                  ? { type: "unblockNight", propertyId: pid, date }
                  : {
                      type: "blockNight",
                      propertyId: pid,
                      date,
                      reason: "Owner / operations availability block",
                    },
                block
                  ? "Night released for reservations."
                  : "Night blocked. Availability and pricing updated.",
              )
            }
          >
            {block ? "Release this night" : "Block this night"}
          </Button>
        </div>
        <p className="body-copy">
          {rate ? money(rate.amount, p.currency) : "No rate in this window"} ·{" "}
          {isBooked(state, pid, date) ? "Booked" : "Available"}. Original rate:{" "}
          {rate ? money(rate.original, p.currency) : "—"}.
        </p>
        <Button
          onClick={() =>
            send(
              { type: "proposePricing", propertyId: pid },
              "A bounded available-night proposal was created.",
            )
          }
        >
          Prepare pricing proposal
        </Button>
        <EvidenceLinks ids={[pid]} />
      </>
    );
  } else if (detail.startsWith("staff:")) {
    const person = state.staff.find((x) => x.id === detail.slice(6))!;
    title = person.name;
    body = (
      <>
        <p className="body-copy">
          {person.role} · {person.city}, {person.country} · {person.shift}.
          Capacity: 4 tasks per shift. Country, city, skills and conflicts are
          validated by the assignment command.
        </p>
        <Table
          rows={state.tasks.filter(
            (x) =>
              s.ids.includes(x.propertyId) &&
              x.status !== "Complete" &&
              day(x.due) === day(state.now),
          )}
          label="tasks to assign"
          onRow={(x) => open(x.id)}
          columns={[
            { key: "title", label: "Task" },
            { key: "kind", label: "Skill" },
            {
              key: "assign",
              label: "Assignment",
              render: (x) => (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    send(
                      { type: "assignTask", id: x.id, staffId: person.id },
                      `Assigned to ${person.name}.`,
                    );
                  }}
                >
                  Assign
                </Button>
              ),
            },
          ]}
        />
      </>
    );
  } else {
    title = "Evidence record";
    body = (
      <>
        <p className="body-copy">
          {detail.startsWith("rate-")
            ? "This rate is part of the selected pricing proposal. Open its batch to see before and after amounts."
            : "This record is outside the active portfolio or no longer exists after a reset."}
        </p>
        <Button
          onClick={() => {
            notify(
              "Open a related property or current record from the operating screen.",
            );
            setDetail(null);
          }}
        >
          {t("back")}
        </Button>
      </>
    );
  }
  return (
    <Overlay title={title} onClose={() => setDetail(null)}>
      {body}
    </Overlay>
  );
}
