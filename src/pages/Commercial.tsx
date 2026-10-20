import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  TrendingUp,
  Target,
  Printer,
  Star,
  MessageSquare,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStore } from "../store";
import {
  summary,
  money,
  isBooked,
  convert,
  ledger,
  activeBooking,
  pricingForecast,
} from "../domain/selectors";
import { day } from "../domain/seed";
import {
  Badge,
  Button,
  Card,
  Empty,
  ExportButton,
  SectionTitle,
  Table,
  Tabs,
} from "../components/ui";
export function Revenue() {
  const { state, filters, t, open, send } = useStore(),
    s = summary(state, filters),
    [tab, setTab] = useState("calendar"),
    [pid, setPid] = useState(""),
    [offset, setOffset] = useState(0);
  const p = s.properties.find((p) => p.id === pid) || s.properties[0],
    dates = Array.from({ length: 14 }, (_, i) => day(state.now, offset + i)),
    batches = state.batches.filter((b) => s.ids.includes(b.propertyId));
  return (
    <>
      <SectionTitle
        eyebrow="THOUGHTFUL PRICING, HEALTHIER STAYS"
        title={t("revenue")}
        description="Synthetic market signals. Bounded proposals for available nights. Confirmed booking amounts stay fixed."
        actions={
          <Button
            variant="primary"
            disabled={!p}
            onClick={() =>
              p &&
              send(
                { type: "proposePricing", propertyId: p.id },
                "Pricing proposal created. Review the affected nights in Approvals.",
              )
            }
          >
            <TrendingUp size={15} />
            Propose a quiet-week adjustment
          </Button>
        }
      />
      <div className="stat-strip">
        <button onClick={() => open("list:bookings")}>
          <span>Occupancy</span>
          <strong>{s.occupancy.toFixed(1)}%</strong>
          <small>
            {s.nights} booked / {s.available} available nights
          </small>
        </button>
        <button onClick={() => open("list:bookings")}>
          <span>ADR</span>
          <strong>{money(s.adr, filters.currency, state.language)}</strong>
          <small>
            Accommodation allocated to period nights / occupied nights
          </small>
        </button>
        <button onClick={() => open("list:bookings")}>
          <span>RevPAR</span>
          <strong>{money(s.revpar, filters.currency, state.language)}</strong>
          <small>
            Accommodation allocated to period nights / available nights
          </small>
        </button>
        <button onClick={() => open("list:bookings")}>
          <span>Booked accommodation</span>
          <strong>
            {money(s.revenue, filters.currency, state.language, true)}
          </strong>
          <small>Selected arrival period · not a forecast</small>
        </button>
      </div>
      <div className="view-toolbar">
        <Tabs>
          <button
            className={tab === "calendar" ? "selected" : ""}
            onClick={() => setTab("calendar")}
          >
            Rate calendar
          </button>
          <button
            className={tab === "history" ? "selected" : ""}
            onClick={() => setTab("history")}
          >
            Proposal & rate history
          </button>
        </Tabs>
        <div>
          <select
            aria-label="Pricing property"
            value={p?.id || ""}
            onChange={(e) => setPid(e.target.value)}
          >
            {s.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => setOffset(Math.max(0, offset - 14))}
            disabled={offset === 0}
          >
            Earlier
          </Button>
          <Button
            onClick={() => setOffset(Math.min(84, offset + 14))}
            disabled={offset >= 84}
          >
            Later
          </Button>
        </div>
      </div>
      {tab === "calendar" && p ? (
        <>
          <Card
            title={p.name}
            subtitle={`Nightly accommodation in ${p.currency} · minimum ${money(p.minRate, p.currency)} / maximum ${money(p.maxRate, p.currency)}`}
          >
            <div className="rate-grid">
              {dates.map((date) => {
                const rate = state.rates.find(
                    (r) => r.propertyId === p.id && r.date === date,
                  ),
                  booked = isBooked(state, p.id, date);
                return (
                  <button
                    key={date}
                    className={booked ? "booked" : ""}
                    onClick={() => {
                      const b = state.bookings.find(
                        (b) =>
                          b.propertyId === p.id &&
                          activeBooking(b) &&
                          b.start <= date &&
                          b.end > date,
                      );
                      if (b) open(b.id);
                      else open(`rate:${p.id}:${date}`);
                    }}
                  >
                    <small>
                      {new Date(date + "T12:00:00Z").toLocaleDateString(
                        state.language,
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </small>
                    <strong>
                      {rate
                        ? money(rate.amount, p.currency, state.language)
                        : "Outside rate window"}
                    </strong>
                    <span>
                      {booked ? "Booked · fixed reservation" : "Available"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
          <div className="insight-grid">
            <Card
              title="An evidence-led experiment"
              subtitle="Synthetic signals · illustrative scenario"
            >
              <p className="body-copy">
                The next available nights are the evidence for this proposal. An
                8% reduction, clamped to the property bounds, tests whether a
                modest adjustment could improve enquiries.
              </p>
              <div className="quote-compare">
                <span>
                  Illustrative peer nightly rate
                  <strong>
                    {money(
                      Math.round(p.baseRate * 1.04),
                      p.currency,
                      state.language,
                    )}
                  </strong>
                </span>
                <span>
                  Current property rate
                  <strong>
                    {money(p.baseRate, p.currency, state.language)}
                  </strong>
                </span>
              </div>
              <p className="muted small">
                Peer figures are invented demo assumptions. No booking or
                revenue uplift is guaranteed.
              </p>
              <Button onClick={() => open(p.id)}>
                Open source reservations
                <ArrowUpRight size={14} />
              </Button>
            </Card>
            <Card
              title="Forecast assumptions"
              subtitle="Scenarios, not verified market advice"
            >
              <div className="quote-compare">
                <span>
                  Baseline illustrative accommodation
                  <strong>
                    {money(
                      pricingForecast(state, p.id).before,
                      p.currency,
                      state.language,
                    )}
                  </strong>
                </span>
                <span>
                  Current illustrative scenario
                  <strong>
                    {money(
                      pricingForecast(state, p.id).current,
                      p.currency,
                      state.language,
                    )}
                  </strong>
                </span>
              </div>
              <p className="muted small">
                Next 28 days, available nights only. Assumed occupancy: 45% at
                baseline; 50% only on adjusted nights. Invented assumptions, not
                a prediction. No forecast amount is posted to finance.
              </p>
              <p className="body-copy">
                A proposal affects only its selected available nights. No
                additional bookings are invented when rates change. Confirmed
                accommodation values and native-currency statements are
                unaffected.
              </p>
              <p className="muted small">
                Cancellation assumption: historical seed frequency. Lead time:
                30 days for seeded bookings. Capacity: one unit per home per
                night.
              </p>
              <Button onClick={() => open("list:bookings")}>
                Inspect booked outcomes
                <ArrowRight size={14} />
              </Button>
            </Card>
          </div>
        </>
      ) : tab === "history" ? (
        <Card>
          <Table
            rows={batches}
            label="pricing batches"
            onRow={(b) => open(b.id)}
            columns={[
              { key: "id", label: "Batch" },
              {
                key: "property",
                label: t("property"),
                render: (b) =>
                  state.properties.find((p) => p.id === b.propertyId)?.name,
              },
              {
                key: "dates",
                label: "Affected nights",
                render: (b) => b.dates.join(", "),
              },
              {
                key: "status",
                label: t("status"),
                render: (b) => (
                  <Badge
                    value={
                      b.undone ? "Undone" : b.applied ? "Complete" : "Pending"
                    }
                  />
                ),
              },
              {
                key: "action",
                label: t("action"),
                render: (b) =>
                  b.applied && !b.undone ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        send(
                          { type: "undoPricing", id: b.id },
                          "Original available rates restored.",
                        );
                      }}
                    >
                      Undo batch
                    </Button>
                  ) : (
                    "Open for evidence"
                  ),
              },
            ]}
          />
        </Card>
      ) : (
        <Empty />
      )}
    </>
  );
}
export function Growth() {
  const { state, filters, t, send, open } = useStore(),
    s = summary(state, filters);
  return (
    <>
      <SectionTitle
        eyebrow="MAKE YOUR NEXT CHAPTER INTENTIONAL"
        title={t("growth")}
        description="Evidence → hypothesis → action → owner → measurement. Illustrative opportunities stay separate from realised income."
      />
      <div className="three-grid">
        {s.properties.map((p) => {
          const bookings = s.bookings.filter((b) => b.propertyId === p.id),
            direct = bookings.filter((b) => b.channel === "Direct").length,
            tasks = state.tasks.filter(
              (t) => t.propertyId === p.id && t.kind === "Growth",
            );
          return (
            <Card key={p.id} className="growth-card">
              <span className="icon-tile mint">
                <Target size={20} />
              </span>
              <h3>{p.name}</h3>
              <Badge
                value={
                  tasks.length
                    ? tasks.every((t) => t.status === "Complete")
                      ? "Complete"
                      : "In progress"
                    : "Proposed"
                }
              />
              <p className="body-copy">
                {direct} of {bookings.length} period reservations are direct.
                OTA bookings use an illustrative 15% fee; direct stays use 3%.
              </p>
              <p className="muted small">
                <strong>Hypothesis:</strong> prepared follow-up content may
                increase repeat direct enquiries. Measure channel share and
                acquisition cost at 30, 60 and 90 days.
              </p>
              <Button
                variant={tasks.length ? "default" : "primary"}
                onClick={() =>
                  tasks.length
                    ? open(tasks[0].id)
                    : send(
                        { type: "growthPlan", propertyId: p.id },
                        "Three linked growth tasks created with a measurement schedule.",
                      )
                }
              >
                {tasks.length
                  ? `View plan · ${tasks.filter((t) => t.status === "Complete").length}/3 actions`
                  : "Create 30 / 60 / 90 day plan"}
                <ArrowRight size={14} />
              </Button>
              <button className="source-chip" onClick={() => open(p.id)}>
                Source: property reservations
                <ArrowUpRight size={11} />
              </button>
            </Card>
          );
        })}
      </div>
      {!s.properties.length && <Empty />}
    </>
  );
}
export function Finance() {
  const { state, filters, t, open, setModal } = useStore(),
    s = summary(state, filters),
    [tab, setTab] = useState("ledger");
  const bills = state.bills.filter((b) => s.ids.includes(b.propertyId));
  return (
    <>
      <SectionTitle
        eyebrow="CLARITY IN EVERY NUMBER"
        title={t("finance")}
        description="Simplified demo accounting. Separate GBP and EUR ledgers; no real banking, tax advice or payouts."
        actions={
          <>
            <ExportButton
              rows={s.native.map((l) => ({
                ...l,
                all_amounts: "integer minor units",
              }))}
              name="native-ledgers"
            />
            <Button variant="primary" onClick={() => setModal("Bill")}>
              <Plus size={15} />
              {t("newBill")}
            </Button>
          </>
        }
      />
      <Tabs>
        {[
          ["ledger", "Native ledgers"],
          ["bills", "Invoices & reconciliation"],
          ["balances", "Guest balances"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={tab === v ? "selected" : ""}
            onClick={() => setTab(v)}
          >
            {label}
          </button>
        ))}
      </Tabs>
      {tab === "ledger" ? (
        <>
          <div className="insight-grid">
            {s.native.map((l) => (
              <Card
                key={l.currency}
                title={`${l.currency} · Native-currency ledger`}
                subtitle={`Active reservations arriving ${filters.from} — ${filters.to}`}
              >
                <div className="ledger">
                  <div>
                    <span>Accommodation booked</span>
                    <strong>
                      {money(l.accommodation, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Cleaning collected / paid through</span>
                    <strong>
                      {money(l.cleaning, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Channel fees</span>
                    <strong>
                      − {money(l.channel, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Operator management fee</span>
                    <strong>
                      − {money(l.operator, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Posted portfolio expenses</span>
                    <strong>
                      − {money(l.expenses, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>
                      Illustrative tax adjustment · {state.taxBps / 100}%
                    </span>
                    <strong>
                      − {money(l.tax, l.currency, state.language)}
                    </strong>
                  </div>
                  <div className="ledger-total">
                    <span>{t("ownerPayable")}</span>
                    <strong>
                      {money(l.owner, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>{t("operatorIncome")}</span>
                    <strong>
                      {money(l.operator, l.currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Outstanding guest balances</span>
                    <strong>
                      {money(l.balance, l.currency, state.language)}
                    </strong>
                  </div>
                </div>
                <p className="reconcile-note">
                  <Check size={14} />
                  Reconciles: owner + operator + channel + expenses +
                  illustrative tax = accommodation.
                </p>
                <Button onClick={() => open(`ledger:${l.currency}`)}>
                  View native source records
                  <ArrowUpRight size={14} />
                </Button>
              </Card>
            ))}
          </div>
          <Card
            title="Accounting assumptions & cashflow"
            subtitle="A documented illustrative model"
          >
            <p className="body-copy">
              Accommodation is allocated to channel fees (3% direct / 15% OTA),
              a 20% operator fee on accommodation after channel fees, and owner
              payable after posted expenses. Cleaning is collected and paid
              through at cost. Draft and duplicate bills have no ledger effect.
              Posted expenses follow the selected invoice-date period; this is a
              booked-allocation statement, not a regulated financial statement.
            </p>
            <div className="quote-compare">
              {s.native.map((l) => (
                <span key={l.currency}>
                  Received guest cash · {l.currency}
                  <strong>
                    {money(l.gross - l.balance, l.currency, state.language)}
                  </strong>
                </span>
              ))}
            </div>
            <p className="muted small">
              Illustrative tax adjustment: {state.taxBps / 100}% (configurable
              in Settings). No current country tax law is represented. Payment
              status is simulated.
            </p>
          </Card>
        </>
      ) : tab === "bills" ? (
        <Card
          title="Draft versus posted expenses"
          subtitle="Duplicate drafts need a human exception decision. Removing a duplicate draft is not cash recovered."
        >
          <Table
            rows={bills}
            label="invoices"
            onRow={(b) => open(b.id)}
            columns={[
              {
                key: "reference",
                label: "Reference",
                sort: (b) => b.reference,
              },
              { key: "supplier", label: "Fictional supplier" },
              {
                key: "property",
                label: t("property"),
                render: (b) =>
                  state.properties.find((p) => p.id === b.propertyId)?.name,
              },
              {
                key: "amount",
                label: "Amount",
                render: (b) => money(b.amount, b.currency, state.language),
              },
              {
                key: "status",
                label: t("status"),
                render: (b) => <Badge value={b.status} />,
              },
              { key: "category", label: "Category" },
              {
                key: "duplicateOf",
                label: "Exception",
                render: (b) =>
                  b.duplicateOf
                    ? `Same reference as ${b.duplicateOf}`
                    : "No duplicate flagged",
              },
            ]}
          />
        </Card>
      ) : (
        <Card>
          <Table
            rows={s.bookings.filter((b) => b.paid < b.amount + b.cleaning)}
            label="unpaid balances"
            onRow={(b) => open(b.id)}
            columns={[
              { key: "guest", label: "Guest" },
              {
                key: "property",
                label: t("property"),
                render: (b) =>
                  state.properties.find((p) => p.id === b.propertyId)?.name,
              },
              { key: "start", label: "Arrival" },
              {
                key: "amount",
                label: "Total",
                render: (b) =>
                  money(b.amount + b.cleaning, b.currency, state.language),
              },
              {
                key: "paid",
                label: "Received",
                render: (b) => money(b.paid, b.currency, state.language),
              },
              {
                key: "balance",
                label: "Balance",
                render: (b) =>
                  money(
                    b.amount + b.cleaning - b.paid,
                    b.currency,
                    state.language,
                  ),
              },
            ]}
          />
        </Card>
      )}
    </>
  );
}
export function Owners() {
  const { state, filters, t, open } = useStore(),
    s = summary(state, filters),
    [selected, setSelected] = useState("");
  const owners = state.owners.filter((o) =>
      s.properties.some((p) => p.ownerId === o.id),
    ),
    owner = owners.find((o) => o.id === selected) || owners[0],
    ps = s.properties.filter((p) => p.ownerId === owner?.id),
    bookings = s.bookings.filter((b) => ps.some((p) => p.id === b.propertyId));
  return (
    <>
      <SectionTitle
        eyebrow="PARTNERSHIPS BUILT ON TRANSPARENCY"
        title={t("owners")}
        description="Fictional owner agreements. Native-currency statements reconcile with the shared booking and expense records."
        actions={
          <>
            <ExportButton
              name="owner-statement"
              rows={bookings.map((b) => ({
                owner: owner?.name,
                property: state.properties.find((p) => p.id === b.propertyId)
                  ?.name,
                reservation: b.id,
                accommodation: b.amount / 100,
                currency: b.currency,
              }))}
            />
            <Button onClick={() => window.print()}>
              <Printer size={15} />
              {t("print")}
            </Button>
          </>
        }
      />
      <div className="view-toolbar">
        <select
          aria-label="Owner statement"
          value={owner?.id || ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <span>
          Simulated owner role limits the entire app to the selected owner’s
          homes.
        </span>
      </div>
      {owner ? (
        <Card className="statement">
          <div className="statement-head">
            <span>
              <span className="eyebrow">STAYPILOT AI / OWNER STATEMENT</span>
              <h2>{owner.name}</h2>
              <p>{owner.email} · Fictional owner</p>
              <Button onClick={() => open(owner.id)}>
                View agreement settings
              </Button>
            </span>
            <span>
              {filters.from} — {filters.to}
              <small>Booked allocation · simplified demo accounting</small>
            </span>
          </div>
          <div className="statement-homes">
            {ps.map((p) => (
              <button key={p.id} onClick={() => open(p.id)}>
                {p.name} · {p.city}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
          {(["GBP", "EUR"] as const)
            .filter((currency) => ps.some((p) => p.currency === currency))
            .map((currency) => {
              const ids = ps
                  .filter((p) => p.currency === currency)
                  .map((p) => p.id),
                l = ledger(
                  state,
                  bookings.filter((b) => ids.includes(b.propertyId)),
                  ids,
                  filters.from,
                  filters.to,
                );
              return (
                <div className="ledger" key={currency}>
                  <h3>{currency} statement</h3>
                  <div>
                    <span>Accommodation booked</span>
                    <strong>
                      {money(l.accommodation, currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Channel fees</span>
                    <strong>
                      − {money(l.channel, currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>
                      Management fee · {owner.feeBps / 100}% after channel fees
                    </span>
                    <strong>
                      − {money(l.operator, currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Posted expenses</span>
                    <strong>
                      − {money(l.expenses, currency, state.language)}
                    </strong>
                  </div>
                  <div>
                    <span>Illustrative tax adjustment</span>
                    <strong>− {money(l.tax, currency, state.language)}</strong>
                  </div>
                  <div className="ledger-total">
                    <span>Owner payable</span>
                    <strong>{money(l.owner, currency, state.language)}</strong>
                  </div>
                </div>
              );
            })}
          <p className="body-copy">
            Prepared explanation: booked accommodation is allocated after
            channel fees, your agreement’s management fee, and posted fictional
            costs. Draft duplicates are excluded. Future stay values represent
            bookings, not achieved revenue. No real payout occurs.
          </p>
          <Table
            rows={bookings}
            label="statement reservations"
            onRow={(b) => open(b.id)}
            columns={[
              { key: "guest", label: "Guest" },
              { key: "start", label: "Arrival" },
              { key: "end", label: "Departure" },
              { key: "channel", label: "Channel" },
              {
                key: "amount",
                label: "Accommodation",
                render: (b) => money(b.amount, b.currency, state.language),
              },
            ]}
          />
        </Card>
      ) : (
        <Empty />
      )}
    </>
  );
}
export function Reputation() {
  const { state, filters, t, send, open } = useStore(),
    s = summary(state, filters),
    reviews = state.reviews.filter((r) => s.ids.includes(r.propertyId));
  return (
    <>
      <SectionTitle
        eyebrow="THOUGHTFUL STAYS, HONEST FEEDBACK"
        title={t("reputation")}
        description="Synthetic guest feedback and prepared replies. Fixing an issue never rewrites a historical rating."
      />
      <div className="stat-strip">
        <button onClick={() => open("list:reviews")}>
          <span>Fictional guest rating</span>
          <strong>
            {s.sentiment.toFixed(1)} <Star size={22} />
          </strong>
          <small>{reviews.length} seeded reviews</small>
        </button>
        <button onClick={() => open("list:messages")}>
          <span>Urgent conversations</span>
          <strong>
            {
              state.messages.filter(
                (m) =>
                  s.ids.includes(m.propertyId) &&
                  m.direction === "Inbound" &&
                  m.urgency === "Urgent",
              ).length
            }
          </strong>
          <small>Escalated for a human handover</small>
        </button>
        <button onClick={() => open("list:tasks")}>
          <span>Guest follow-ups</span>
          <strong>
            {
              state.tasks.filter(
                (t) =>
                  s.ids.includes(t.propertyId) &&
                  t.kind === "Guest" &&
                  t.status !== "Complete",
              ).length
            }
          </strong>
          <small>Tracked through completion</small>
        </button>
      </div>
      <div className="insight-grid">
        {reviews.map((r) => (
          <Card
            key={r.id}
            title={state.properties.find((p) => p.id === r.propertyId)?.name}
            subtitle={`${r.guest} · Fictional guest`}
            action={
              <span className="review-stars">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
            }
          >
            <p className="review-text">“{r.text}”</p>
            {r.response && (
              <div className="reply-preview">
                <span className="eyebrow">PREPARED REPLY DRAFT</span>
                <p>{r.response}</p>
              </div>
            )}
            <div className="button-row">
              <Button
                onClick={() =>
                  send(
                    { type: "reviewReply", id: r.id },
                    "A factual review response was drafted. No review was posted.",
                  )
                }
              >
                <MessageSquare size={14} />
                Draft factual reply
              </Button>
              <Button
                onClick={() =>
                  send(
                    {
                      type: "createTask",
                      propertyId: r.propertyId,
                      title: `Guest feedback follow-up · ${r.guest}`,
                      kind: "Guest",
                      sourceId: r.id,
                    },
                    "Follow-up task created. Invitations are available for all eligible fictional guests.",
                  )
                }
              >
                <Plus size={14} />
                Follow up
              </Button>
              <Button variant="ghost" onClick={() => open(r.bookingId)}>
                Source stay
                <ArrowUpRight size={13} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card
        title="Review requests & journey touchpoints"
        subtitle="Every eligible fictional guest is included, regardless of sentiment."
      >
        <p className="body-copy">
          Pre-arrival: share prepared check-in information. Arrival: verify
          readiness. In-stay: track unresolved issues. Departure: create
          turnover work. Post-stay: prepare a review invitation for every
          completed stay. No real guest is contacted.
        </p>
        <Button onClick={() => open("list:bookings")}>
          View eligible stays
          <ArrowRight size={14} />
        </Button>
      </Card>
    </>
  );
}
export function Reports() {
  const { state, filters, t, open } = useStore(),
    s = summary(state, filters),
    [report, setReport] = useState("revenue");
  const data = Array.from({ length: 12 }, (_, i) => {
    const month =
      day(state.now).slice(0, 4) + "-" + String(i + 1).padStart(2, "0");
    return {
      month: new Date(month + "-15T12:00:00Z").toLocaleDateString(
        state.language,
        { month: "short" },
      ),
      revenue: Math.round(
        state.bookings
          .filter(
            (b) =>
              s.ids.includes(b.propertyId) &&
              activeBooking(b) &&
              b.start.startsWith(month) &&
              b.start >= filters.from &&
              b.start <= filters.to,
          )
          .reduce(
            (a, b) => a + convert(b.amount, b.currency, filters.currency),
            0,
          ) / 100,
      ),
    };
  });
  const rows = s.properties.map((p) => {
    const bookings = s.bookings.filter((b) => b.propertyId === p.id),
      tasks = state.tasks.filter((t) => t.propertyId === p.id),
      reviews = state.reviews.filter((r) => r.propertyId === p.id);
    return {
      id: p.id,
      property: p.name,
      country: p.country,
      bookings: bookings.length,
      accommodation: bookings.reduce((a, b) => a + b.amount, 0) / 100,
      currency: p.currency,
      completedTasks: tasks.filter((t) => t.status === "Complete").length,
      rating: reviews.length
        ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
        : 0,
    };
  });
  return (
    <>
      <SectionTitle
        eyebrow="LESS GUESSWORK. MORE PERSPECTIVE."
        title={t("reports")}
        description={t("reporting")}
        actions={
          <>
            <ExportButton rows={rows} name={`${report}-report`} />
            <Button onClick={() => window.print()}>
              <Printer size={14} />
              Print report
            </Button>
          </>
        }
      />
      <Tabs>
        {[
          ["revenue", "Revenue"],
          ["operations", "Operations & suppliers"],
          ["owners", "Owners & countries"],
          ["ai", "AI activity"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={report === v ? "selected" : ""}
            onClick={() => setReport(v)}
          >
            {label}
          </button>
        ))}
      </Tabs>
      {report === "revenue" && (
        <Card
          title="Year of booked stays"
          subtitle={`Active period within 2026 · selected homes · ${filters.currency} display conversion at fixed demo FX. Table below uses the active arrival period.`}
        >
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid vertical={false} stroke="#e8efeb" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v) =>
                    money(Number(v) * 100, filters.currency, state.language)
                  }
                />
                <Bar
                  dataKey="revenue"
                  fill="#78bbaa"
                  radius={[5, 5, 0, 0]}
                  animationDuration={240}
                  isAnimationActive={state.motion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      {report === "ai" ? (
        <Card>
          <Table
            rows={state.runs.filter((r) =>
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
            )}
            label="agent runs"
            onRow={(r) => open(r.id)}
            columns={[
              { key: "agent", label: "Agent" },
              { key: "time", label: "Simulated time" },
              { key: "action", label: "Action" },
              {
                key: "status",
                label: t("status"),
                render: (r) => <Badge value={r.status} />,
              },
              { key: "result", label: "Observed result" },
            ]}
          />
        </Card>
      ) : (
        <Card
          title="Source-based portfolio report"
          subtitle="Native currencies remain explicit; hypothetical avoided costs and time savings are excluded from earnings."
        >
          <Table
            rows={rows}
            onRow={(r) => open(r.id)}
            label="report rows"
            columns={[
              {
                key: "property",
                label: t("property"),
                sort: (r) => r.property,
              },
              { key: "country", label: t("country") },
              {
                key: "bookings",
                label: "Reservations",
                sort: (r) => r.bookings,
              },
              {
                key: "accommodation",
                label: "Booked accommodation",
                render: (r) =>
                  money(
                    r.accommodation * 100,
                    r.currency as "GBP" | "EUR",
                    state.language,
                  ),
              },
              {
                key: "completedTasks",
                label: "Completed tasks",
                sort: (r) => r.completedTasks,
              },
              { key: "rating", label: "Fictional rating" },
            ]}
          />
        </Card>
      )}
    </>
  );
}
