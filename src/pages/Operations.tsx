import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  MapPin,
  CalendarDays,
  Columns3,
  List,
  Wrench,
  Package,
  Users,
} from "lucide-react";
import { ReadinessTimeline } from "../components/ReadinessTimeline";
import { useStore } from "../store";
import { summary, readiness, dateTime, money } from "../domain/selectors";
import { day } from "../domain/seed";
import {
  Badge,
  Button,
  Card,
  SectionTitle,
  Table,
  Tabs,
} from "../components/ui";
export function Operations() {
  const { state, filters, t, open, setModal } = useStore(),
    s = summary(state, filters),
    [view, setView] = useState("board");
  return (
    <>
      <SectionTitle
        eyebrow="THE DETAILS MAKE THE DIFFERENCE"
        title={t("operations")}
        description="A home becomes ready when the evidence says it is. Cost approval and repair verification are separate steps."
        actions={
          <Button variant="primary" onClick={() => setModal("Task")}>
            <Plus size={15} />
            {t("newTask")}
          </Button>
        }
      />
      <div className="stat-strip">
        <button onClick={() => open("list:arrivals")}>
          <span>Next arrivals</span>
          <strong>{s.arrivals.length}</strong>
          <small>Selected homes, today</small>
        </button>
        <button onClick={() => open("list:tasks")}>
          <span>Open workload</span>
          <strong>{s.tasks.length}</strong>
          <small>Tasks due today</small>
        </button>
        <button onClick={() => open("list:issues")}>
          <span>Unverified issues</span>
          <strong>{s.issues.length}</strong>
          <small>Independent evidence required</small>
        </button>
        <button onClick={() => open("list:approvals")}>
          <span>Awaiting a decision</span>
          <strong>{s.approvals.length}</strong>
          <small>Human approval required</small>
        </button>
      </div>
      <div className="view-toolbar">
        <Tabs>
          {[
            ["board", Columns3, "Readiness board"],
            ["list", List, "Task list"],
            ["timeline", CalendarDays, "Readiness timeline"],
          ].map(([v, Icon, label]) => {
            const I = Icon as typeof List;
            return (
              <button
                key={String(v)}
                className={view === v ? "selected" : ""}
                onClick={() => setView(String(v))}
              >
                <I size={15} />
                {String(label)}
              </button>
            );
          })}
        </Tabs>
      </div>
      {view === "board" ? (
        <div className="kanban">
          {["Not ready", "At risk", "Ready"].map((status) => (
            <section className="kanban-column" key={status}>
              <div className="kanban-header">
                <Badge value={status} />
                <span>
                  {
                    s.properties.filter(
                      (p) => readiness(state, p).status === status,
                    ).length
                  }
                </span>
              </div>
              {s.properties
                .filter((p) => readiness(state, p).status === status)
                .map((p) => {
                  const r = readiness(state, p),
                    arrival = state.bookings.find(
                      (b) =>
                        b.propertyId === p.id &&
                        b.start === day(state.now) &&
                        b.status !== "Cancelled",
                    ),
                    localArrival = arrival
                      ? `${arrival.start}T09:30:00Z`
                      : null;
                  return (
                    <button
                      className="kanban-card card"
                      key={p.id}
                      onClick={() => open(p.id)}
                    >
                      <div>
                        <span className="tiny-country">
                          {p.country === "UK"
                            ? "🇬🇧"
                            : p.country === "Spain"
                              ? "🇪🇸"
                              : "🇮🇹"}
                        </span>
                        <ArrowUpRight size={14} />
                      </div>
                      <h3>{p.name}</h3>
                      <small>
                        <MapPin size={11} />
                        {p.city} · {p.type}
                      </small>
                      <ul className="blockers">
                        {r.blockers.map((b) => (
                          <li key={b}>
                            <span className="dot amber" />
                            {b}
                          </li>
                        ))}
                        {!r.blockers.length && (
                          <li>
                            <CheckCircle2 size={13} />
                            Evidence complete. Inspected and ready.
                          </li>
                        )}
                      </ul>
                      <div className="kanban-footer">
                        <span>
                          <Clock size={12} />
                          {localArrival
                            ? `${Math.max(0, Math.round((Date.parse(localArrival) - Date.parse(state.now)) / 60000))} min to arrival`
                            : "No arrival today"}
                        </span>
                        <span className="mini-avatar">
                          {p.country === "UK"
                            ? "JB"
                            : p.country === "Spain"
                              ? "AO"
                              : "AS"}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </section>
          ))}
        </div>
      ) : view === "list" ? (
        <Card>
          <TaskTable ids={s.ids} />
        </Card>
      ) : (
        <ReadinessTimeline />
      )}
    </>
  );
}
export function TaskTable({ ids, kind }: { ids: string[]; kind?: string }) {
  const { state, t, open } = useStore();
  const rows = state.tasks
    .filter((x) => ids.includes(x.propertyId) && (!kind || x.kind === kind))
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.due) - Date.parse(state.now)) -
        Math.abs(Date.parse(b.due) - Date.parse(state.now)),
    );
  return (
    <Table
      rows={rows}
      label="tasks"
      onRow={(x) => open(x.id)}
      columns={[
        { key: "title", label: "Task", sort: (x) => x.title },
        {
          key: "property",
          label: t("property"),
          render: (x) =>
            state.properties.find((p) => p.id === x.propertyId)?.name,
        },
        { key: "kind", label: "Type" },
        {
          key: "status",
          label: t("status"),
          render: (x) => <Badge value={x.status} />,
        },
        {
          key: "due",
          label: "Due / SLA",
          sort: (x) => x.due,
          render: (x) =>
            dateTime(
              x.due,
              state.language,
              state.properties.find((p) => p.id === x.propertyId)?.timezone,
            ),
        },
        {
          key: "assignee",
          label: t("assigned"),
          render: (x) =>
            state.staff.find((u) => u.id === x.assignee)?.name || "Unassigned",
        },
        {
          key: "evidence",
          label: "Evidence",
          render: (x) =>
            `${x.checklist.filter(Boolean).length}/3 checks · ${x.photo ? "photo present" : "photo required"}`,
        },
      ]}
    />
  );
}
export function Housekeeping() {
  const { state, filters, t, open, send } = useStore(),
    s = summary(state, filters),
    [tab, setTab] = useState("Cleaning");
  return (
    <>
      <SectionTitle
        eyebrow="THE ART OF A READY HOME"
        title={t("housekeeping")}
        description="Turnover work follows reservations automatically. Cleaning completion never replaces inspection sign-off."
        actions={
          <Button
            onClick={() =>
              send(
                { type: "runAgents" },
                "Housekeeping checks evaluated with duplicate prevention.",
              )
            }
          >
            <Users size={15} />
            Review workload
          </Button>
        }
      />
      <div className="stat-strip">
        <button onClick={() => setTab("Cleaning")}>
          <span>Cleaning jobs</span>
          <strong>
            {
              state.tasks.filter(
                (t) =>
                  s.ids.includes(t.propertyId) &&
                  t.kind === "Cleaning" &&
                  t.status !== "Complete",
              ).length
            }
          </strong>
          <small>Open turnover jobs</small>
        </button>
        <button onClick={() => setTab("Inspection")}>
          <span>Inspections needed</span>
          <strong>{s.properties.filter((p) => !p.inspection).length}</strong>
          <small>Evidence and human verification</small>
        </button>
        <button onClick={() => open("list:stock")}>
          <span>Linen & welcome stock</span>
          <strong>
            {
              state.inventory.filter(
                (i) => s.ids.includes(i.propertyId) && i.quantity < i.minimum,
              ).length
            }
          </strong>
          <small>Items below minimum</small>
        </button>
      </div>
      <Tabs>
        {["Cleaning", "Inspection"].map((v) => (
          <button
            className={tab === v ? "selected" : ""}
            onClick={() => setTab(v)}
            key={v}
          >
            {v}
          </button>
        ))}
      </Tabs>
      <Card
        title={
          tab === "Cleaning"
            ? "Turnovers & cleaning evidence"
            : "Arrival inspections & rework"
        }
        subtitle="Open a task to assign a feasible person, check each requirement, attach local evidence, and verify completion."
      >
        <TaskTable ids={s.ids} kind={tab} />
      </Card>
    </>
  );
}
export function Maintenance() {
  const { state, filters, t, open, setModal } = useStore(),
    s = summary(state, filters),
    [status, setStatus] = useState("");
  const issues = state.issues.filter(
    (i) => s.ids.includes(i.propertyId) && (!status || i.status === status),
  );
  return (
    <>
      <SectionTitle
        eyebrow="SMALL FIXES, BETTER STAYS"
        title={t("maintenance")}
        description="Quote → cost approval → scheduled work → repair evidence → independent verification. Each stage has a distinct result."
        actions={
          <Button variant="primary" onClick={() => setModal("Issue")}>
            <Plus size={15} />
            {t("newIssue")}
          </Button>
        }
      />
      <div className="view-toolbar">
        <div>
          <Wrench size={18} />
          <span>{issues.length} recorded issues</span>
        </div>
        <select
          aria-label="Maintenance status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All stages</option>
          {[
            "Open",
            "Assigned",
            "In progress",
            "Awaiting approval",
            "Scheduled",
            "Resolved",
            "Closed",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <Card>
        <Table
          rows={issues}
          label="maintenance issues"
          onRow={(i) => open(i.id)}
          columns={[
            { key: "title", label: "Issue", sort: (i) => i.title },
            {
              key: "property",
              label: t("property"),
              render: (i) =>
                state.properties.find((p) => p.id === i.propertyId)?.name,
            },
            {
              key: "priority",
              label: "Priority",
              render: (i) => <Badge value={i.priority} />,
            },
            {
              key: "status",
              label: t("status"),
              render: (i) => <Badge value={i.status} />,
            },
            { key: "supplier", label: "Demo supplier" },
            {
              key: "quote",
              label: "Quote",
              render: (i) => money(i.quote, i.currency, state.language),
            },
            {
              key: "verified",
              label: "Repair evidence",
              render: (i) =>
                i.verified
                  ? "Verified"
                  : i.evidence
                    ? "Needs independent verification"
                    : "Missing",
            },
          ]}
        />
      </Card>
      <Card
        title="Assets & recurring issues"
        subtitle="Heating / cooling, fixtures and appliances are linked to their maintenance records."
      >
        <div className="asset-grid">
          {s.properties.slice(0, 9).map((p) => (
            <button key={p.id} onClick={() => open(p.id)}>
              <span className="icon-tile mint">
                <Wrench size={18} />
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {state.issues
                    .filter((i) => i.propertyId === p.id)
                    .map((i) => i.asset)
                    .join(", ") || "General household assets"}{" "}
                  · fictional asset register
                </small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
export function Inventory() {
  const { state, filters, t, open, send } = useStore(),
    s = summary(state, filters),
    [tab, setTab] = useState("stock");
  const stock = state.inventory.filter((i) => s.ids.includes(i.propertyId));
  return (
    <>
      <SectionTitle
        eyebrow="THE RIGHT THINGS, RIGHT ON TIME"
        title={t("inventory")}
        description="Approved purchases remain on order until receipt. Stock usage is logged and cannot create negative quantities."
      />
      <Tabs>
        <button
          className={tab === "stock" ? "selected" : ""}
          onClick={() => setTab("stock")}
        >
          <Package size={15} />
          Stock & purchasing
        </button>
        <button
          className={tab === "suppliers" ? "selected" : ""}
          onClick={() => setTab("suppliers")}
        >
          Supplier directory & mock quotes
        </button>
      </Tabs>
      {tab === "stock" ? (
        <Card>
          <Table
            rows={stock}
            label="stock items"
            onRow={(i) => open(i.id)}
            columns={[
              { key: "name", label: "Item", sort: (i) => i.name },
              {
                key: "property",
                label: t("property"),
                render: (i) =>
                  state.properties.find((p) => p.id === i.propertyId)?.name,
              },
              { key: "quantity", label: "Available", sort: (i) => i.quantity },
              { key: "minimum", label: "Minimum" },
              { key: "ordered", label: "On order" },
              {
                key: "status",
                label: t("status"),
                render: (i) => (
                  <Badge
                    value={i.quantity < i.minimum ? "Needs review" : "Ready"}
                  />
                ),
              },
              {
                key: "actions",
                label: t("action"),
                render: (i) => (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (i.ordered)
                        send(
                          { type: "receive", id: i.id },
                          "Receipt recorded. Available stock updated once.",
                        );
                      else
                        send(
                          { type: "purchase", id: i.id },
                          "Purchase request sent to the approval inbox.",
                        );
                    }}
                  >
                    {i.ordered ? "Confirm receipt" : "Request 12 units"}
                    <ArrowRight size={13} />
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      ) : (
        <div className="three-grid">
          {[...new Set(s.properties.map((p) => p.city))].map((city, i) => {
            const p = s.properties.find((p) => p.city === city)!;
            return (
              <Card
                title={`${city} Demo Linen`}
                subtitle="Fictional supplier · no external contact"
                key={city}
              >
                <p className="body-copy">
                  Service area: {city}. Linen, welcome kits and replenishment.
                  Prepared supplier comparison, not a live quote.
                </p>
                <p className="supplier-email">supplier-{i}@example.test</p>
                <div className="quote-compare">
                  <span>
                    Standard · 3 days
                    <strong>
                      {money(1250, p.currency, state.language)} / unit
                    </strong>
                  </span>
                  <span>
                    Priority · 1 day
                    <strong>
                      {money(1750, p.currency, state.language)} / unit
                    </strong>
                  </span>
                </div>
                <Button onClick={() => open(`stock-${p.id.slice(2)}`)}>
                  Review stock & purchase
                  <ArrowUpRight size={14} />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
export function Team() {
  const { state, filters, t, open } = useStore(),
    s = summary(state, filters);
  const staff = state.staff.filter(
    (x) => filters.country === "All" || x.country === filters.country,
  );
  return (
    <>
      <SectionTitle
        eyebrow="GOOD PEOPLE. A CLEAR PLAN."
        title={t("team")}
        description="Assignments validate skills, availability, service area and a maximum of four tasks per shift. Impossible assignments explain their blocker."
      />
      <div className="three-grid">
        {staff.map((person) => {
          const jobs = state.tasks.filter(
            (t) =>
              s.ids.includes(t.propertyId) &&
              t.assignee === person.id &&
              t.status !== "Complete" &&
              day(t.due) === day(state.now),
          );
          return (
            <Card key={person.id} className="team-card">
              <div className="agent-top">
                <span className="avatar large">
                  {person.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                <Badge value={jobs.length >= 4 ? "At risk" : "Ready"} />
              </div>
              <h3>{person.name}</h3>
              <p>
                {person.role} · {person.country} · {person.city}
              </p>
              <div className="agent-meta">
                <span>
                  Shift <strong>{person.shift} local</strong>
                </span>
                <span>
                  Skills <strong>{person.skills.join(", ")}</strong>
                </span>
                <span>
                  Today’s workload <strong>{jobs.length} / 4 tasks</strong>
                </span>
              </div>
              {jobs.slice(0, 3).map((j) => (
                <button
                  key={j.id}
                  className="staff-job"
                  onClick={() => open(j.id)}
                >
                  {j.title}
                  <ArrowUpRight size={12} />
                </button>
              ))}
              <Button onClick={() => open(`staff:${person.id}`)}>
                View shift & assign work
                <ArrowRight size={14} />
              </Button>
            </Card>
          );
        })}
      </div>
      <Card
        title="Open assignments"
        subtitle="Select a task for assignment and conflict feedback."
      >
        <TaskTable ids={s.ids} />
      </Card>
    </>
  );
}
