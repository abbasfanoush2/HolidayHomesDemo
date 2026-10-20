import { phrase } from "../i18n";
import { localeFor } from "../localization/preferences";
import { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Search,
  MapPin,
  Users,
  BedDouble,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MessageCircle,
  Send,
  Mail,
  Clock,
} from "lucide-react";
import { useStore } from "../store";
import {
  summary,
  readiness,
  money,
  dateTime,
  activeBooking,
} from "../domain/selectors";
import { day } from "../domain/seed";
import {
  Badge,
  Button,
  Card,
  Empty,
  ExportButton,
  PropertyArt,
  SectionTitle,
  Table,
  Tabs,
} from "../components/ui";
export function Properties() {
  const { state, filters, t, open, setModal } = useStore(),
    s = summary(state, filters),
    [view, setView] = useState("grid"),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState("");
  const ps = s.properties.filter(
    (p) =>
      (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
      (!type || p.type === type) &&
      (!status || readiness(state, p).status === status),
  );
  return (
    <>
      <SectionTitle
        eyebrow="PLACES WITH PERSONALITY"
        title={t("properties")}
        description="Every home, every detail, all in one place. Original illustrations of fictional homes."
        actions={
          <>
            <ExportButton
              rows={ps.map((p) => ({
                name: p.name,
                country: p.country,
                city: p.city,
                status: readiness(state, p).status,
                currency: p.currency,
                nightly_rate: p.baseRate / 100,
              }))}
              name="properties"
            />
            <Button variant="primary" onClick={() => setModal("Property")}>
              <Plus size={15} />
              {t("newProperty")}
            </Button>
          </>
        }
      />
      <div className="view-toolbar">
        <label className="small-search">
          <Search size={16} />
          <input
            aria-label="Search properties"
            value={search}
            placeholder="Find your next favourite home…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div>
          <select
            aria-label="Property type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {["Townhouse", "Apartment", "Cottage", "Villa"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Readiness status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All readiness states</option>
            {["Ready", "At risk", "Not ready"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <div className="segmented">
            <button
              aria-label="Grid view"
              className={view === "grid" ? "selected" : ""}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              aria-label="List view"
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      {view === "grid" ? (
        <div className="property-grid">
          {ps.map((p, i) => (
            <button
              className="property-card card"
              key={p.id}
              onClick={() => open(p.id)}
            >
              <div className="property-art-wrap">
                <PropertyArt country={p.country} index={i} />
                <Badge value={readiness(state, p).status} />
                <span className="art-label">FICTIONAL HOME · ILLUSTRATION</span>
              </div>
              <div className="property-content">
                <div className="property-title">
                  <h3>{p.name}</h3>
                  <ArrowUpRight size={18} />
                </div>
                <p>
                  <MapPin size={12} />
                  {p.city}, {p.country}
                </p>
                <div className="property-meta">
                  <span>
                    <Users size={13} />
                    {p.capacity} guests
                  </span>
                  <span>
                    <BedDouble size={13} />
                    {p.bedrooms} bedrooms
                  </span>
                  <span>{p.type}</span>
                </div>
                <div className="property-card-bottom">
                  <span>
                    {money(p.baseRate, p.currency, state.language)}{" "}
                    <small>/ night</small>
                  </span>
                  <span>
                    {new Intl.DateTimeFormat(localeFor(state.language), {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: p.timezone,
                    }).format(new Date(state.now))}{" "}
                    local
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <Table
            rows={ps}
            onRow={(p) => open(p.id)}
            columns={[
              { key: "name", label: t("property"), sort: (p) => p.name },
              { key: "city", label: "City" },
              { key: "country", label: t("country") },
              { key: "type", label: "Type" },
              {
                key: "status",
                label: t("status"),
                render: (p) => <Badge value={readiness(state, p).status} />,
              },
              {
                key: "baseRate",
                label: "Base rate",
                render: (p) => money(p.baseRate, p.currency, state.language),
              },
            ]}
          />
        </Card>
      )}
      {!ps.length && <Empty />}
    </>
  );
}
export function Reservations() {
  const { state, filters, t, open, setModal } = useStore(),
    s = summary(state, filters),
    [view, setView] = useState("calendar"),
    [offset, setOffset] = useState(0),
    [status, setStatus] = useState("");
  const dates = Array.from({ length: 14 }, (_, i) =>
      day(state.now, offset + i),
    ),
    bookings = s.bookings.filter((b) => !status || b.status === status);
  return (
    <>
      <SectionTitle
        eyebrow="MAKE ROOM FOR MEMORABLE STAYS"
        title={t("reservations")}
        description="Simulated channels. Real local availability checks. Adjacent checkout and check-in are supported."
        actions={
          <>
            <ExportButton
              name="reservations"
              rows={bookings.map((b) => ({
                id: b.id,
                home: state.properties.find((p) => p.id === b.propertyId)?.name,
                guest: b.guest,
                arrival: b.start,
                departure: b.end,
                status: b.status,
                accommodation: b.amount / 100,
                currency: b.currency,
              }))}
            />
            <Button variant="primary" onClick={() => setModal("Booking")}>
              <Plus size={15} />
              {t("newBooking")}
            </Button>
          </>
        }
      />
      <div className="view-toolbar">
        <Tabs>
          {["calendar", "list"].map((v) => (
            <button
              className={view === v ? "selected" : ""}
              onClick={() => setView(v)}
              key={v}
            >
              {v === "calendar" ? (
                <CalendarDays size={15} />
              ) : (
                <List size={15} />
              )}{" "}
              {v === "calendar" ? t("calendar") : "Reservations list"}
            </button>
          ))}
        </Tabs>
        <div>
          <select
            aria-label="Reservation status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option>Confirmed</option>
            <option>Checked in</option>
            <option>Checked out</option>
          </select>
          {view === "calendar" && (
            <>
              <Button
                aria-label="Previous fortnight"
                onClick={() => setOffset(offset - 14)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button onClick={() => setOffset(0)}>Today</Button>
              <Button
                aria-label="Next fortnight"
                onClick={() => setOffset(offset + 14)}
              >
                <ChevronRight size={16} />
              </Button>
            </>
          )}
        </div>
      </div>
      {view === "calendar" ? (
        <Card
          title={`${dates[0]} — ${dates.at(-1)}`}
          subtitle="Each cell is one night. Click a stay to inspect it, or an empty night for reservation and availability controls."
        >
          <div className="calendar-scroll">
            <div
              className="booking-calendar"
              style={{
                gridTemplateColumns: `210px repeat(14,minmax(65px,1fr))`,
              }}
            >
              <div className="calendar-header first">{t("property")}</div>
              {dates.map((d) => (
                <div
                  className={`calendar-header ${d === day(state.now) ? "current" : ""}`}
                  key={d}
                >
                  {new Date(d + "T12:00:00Z").toLocaleDateString(
                    localeFor(state.language),
                    { weekday: "short" },
                  )}
                  <strong>{Number(d.slice(8))}</strong>
                </div>
              ))}
              {s.properties.map((p) => (
                <div className="calendar-property-row" key={p.id}>
                  <button className="calendar-home" onClick={() => open(p.id)}>
                    <span>{p.name}</span>
                    <small>
                      {p.city} · {p.capacity} guests
                    </small>
                  </button>
                  {dates.map((d) => {
                    const blocked = state.blockedNights.find(
                      (n) => n.propertyId === p.id && n.date === d,
                    );
                    const b = state.bookings.find(
                      (b) =>
                        b.propertyId === p.id &&
                        activeBooking(b) &&
                        b.start <= d &&
                        b.end > d &&
                        (!status || b.status === status),
                    );
                    return (
                      <button
                        key={d}
                        className={`booking-cell ${blocked ? "blocked-night" : ""} ${b ? "booked " + (b.channel === "Direct" ? "direct" : "ota") : ""} ${d === day(state.now) ? "current" : ""}`}
                        aria-label={`${p.name}, ${new Intl.DateTimeFormat(localeFor(state.language), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"))}, ${b ? b.guest : phrase(blocked ? "Blocked" : "Available", state.language)}`}
                        onClick={() =>
                          b ? open(b.id) : open(`rate:${p.id}:${d}`)
                        }
                      >
                        {b && (b.start === d || dates[0] === d) ? (
                          <span>
                            {b.guest}
                            <small>{b.channel}</small>
                          </span>
                        ) : b ? (
                          <span className="booking-continuation" />
                        ) : (
                          <span className="available-dot">
                            {blocked ? "Blocked" : "·"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="calendar-legend">
            <span>
              <i className="dot green" />
              Direct · simulated
            </span>
            <span>
              <i className="dot blue" />
              OTA · simulated
            </span>
            <span>Unshaded nights are available</span>
          </div>
        </Card>
      ) : (
        <Card>
          <Table
            rows={bookings}
            label="reservations"
            onRow={(b) => open(b.id)}
            columns={[
              { key: "guest", label: "Guest", sort: (b) => b.guest },
              {
                key: "property",
                label: t("property"),
                render: (b) =>
                  state.properties.find((p) => p.id === b.propertyId)?.name,
              },
              { key: "start", label: "Arrival", sort: (b) => b.start },
              { key: "end", label: "Departure" },
              { key: "channel", label: "Channel · simulated" },
              {
                key: "status",
                label: t("status"),
                render: (b) => <Badge value={b.status} />,
              },
              {
                key: "amount",
                label: "Accommodation",
                render: (b) => money(b.amount, b.currency, state.language),
              },
              {
                key: "payment",
                label: "Guest balance",
                render: (b) =>
                  money(
                    Math.max(0, b.amount + b.cleaning - b.paid),
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
export function InboxPage() {
  const { state, filters, t, open, send } = useStore(),
    s = summary(state, filters),
    [channel, setChannel] = useState(""),
    [selected, setSelected] = useState(""),
    [review, setReview] = useState(false);
  const incoming = state.messages.filter(
      (m) =>
        s.ids.includes(m.propertyId) &&
        m.direction === "Inbound" &&
        (!channel || m.channel === channel) &&
        (!review ||
          m.urgency === "Review" ||
          !state.bookings.some((b) => b.id === m.bookingId)),
    ),
    msg = incoming.find((m) => m.id === selected) || incoming[0],
    p = state.properties.find((p) => p.id === msg?.propertyId);
  const thread = state.messages.filter(
    (m) => m.propertyId === msg?.propertyId && m.guest === msg?.guest,
  );
  return (
    <>
      <SectionTitle
        eyebrow="EVERY CONVERSATION, A WARMER WELCOME"
        title={t("inbox")}
        description="Prepared multilingual conversations. Sending creates local records only."
      />
      <div className="view-toolbar">
        <Tabs>
          <button
            className={!review ? "selected" : ""}
            onClick={() => setReview(false)}
          >
            All conversations
          </button>
          <button
            className={review ? "selected" : ""}
            onClick={() => setReview(true)}
          >
            {t("reviewQueue")}
          </button>
        </Tabs>
        <select
          aria-label="Inbox channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option value="">All simulated channels</option>
          {["Airbnb", "Booking.com", "WhatsApp"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <Card className="inbox-card">
        <div className="conversation-list">
          {incoming.map((m) => (
            <button
              key={m.id}
              className={m.id === msg?.id ? "selected" : ""}
              onClick={() => setSelected(m.id)}
            >
              <span className="avatar">
                {m.guest
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </span>
              <span>
                <strong>{m.guest}</strong>
                <small>
                  {state.properties.find((p) => p.id === m.propertyId)?.name}
                </small>
                <p>{m.text}</p>
                <span className="conversation-tags">
                  <Badge value={m.urgency} />
                  <em>{m.channel} · Simulated</em>
                </span>
              </span>
            </button>
          ))}
          {!incoming.length && <Empty />}
        </div>
        <div className="conversation-panel">
          {msg && p ? (
            <>
              <div className="conversation-header">
                <span>
                  <h2>{msg.guest}</h2>
                  <small>
                    {p.name} · {msg.language.toUpperCase()} · {msg.channel}{" "}
                    simulated
                  </small>
                </span>
                <Button onClick={() => open(msg.bookingId)}>
                  Reservation
                  <ArrowUpRight size={14} />
                </Button>
              </div>
              <div className="thread">
                {thread.map((m) => (
                  <div
                    className={`message ${m.direction.toLowerCase()}`}
                    key={m.id}
                  >
                    <div className="message-meta">
                      <span>
                        {m.direction === "Inbound"
                          ? m.guest
                          : m.direction === "Draft"
                            ? "Prepared demo draft"
                            : "Local outbound message"}
                      </span>
                      <small>
                        {dateTime(m.time, state.language, p.timezone)}
                      </small>
                    </div>
                    <p>{m.text}</p>
                    {m.direction === "Draft" && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          send(
                            { type: "sendMessage", id: m.id },
                            "Message evaluated against policy. Review the approval inbox if required.",
                          )
                        }
                      >
                        <Send size={14} />
                        Send in demo
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="conversation-compose">
                <div>
                  <MessageCircle size={16} />
                  <span>Prepared templates · no live translation</span>
                </div>
                <div>
                  <Button
                    onClick={() =>
                      send(
                        {
                          type: "draftReply",
                          id: msg.id,
                          language: state.language,
                        },
                        "A contextual reply was prepared from the current property state.",
                      )
                    }
                  >
                    <SparkleIcon />
                    {`Draft ${state.language.toUpperCase()} reply`}
                  </Button>
                  <Button
                    onClick={() =>
                      send(
                        { type: "draftReply", id: msg.id, language: "es" },
                        "Spanish demo reply prepared.",
                      )
                    }
                  >
                    Español
                  </Button>
                  <Button
                    onClick={() =>
                      send(
                        { type: "draftReply", id: msg.id, language: "it" },
                        "Italian demo reply prepared.",
                      )
                    }
                  >
                    Italiano
                  </Button>
                  <Button
                    onClick={() =>
                      send(
                        {
                          type: "createTask",
                          propertyId: p.id,
                          title: `Follow up with ${msg.guest}`,
                          kind: "Guest",
                          sourceId: msg.id,
                        },
                        "Guest follow-up task created or safely reused.",
                      )
                    }
                  >
                    <Plus size={14} />
                    Service task
                  </Button>
                </div>
              </div>
              <div className="inbox-facts">
                <Mail size={14} />
                {t("prepared")} · Sentiment: {msg.sentiment} · Assigned:{" "}
                {state.staff.find((x) => x.id === msg.assigned)?.name}
                <Clock size={13} />
                {t("localTime")}:{" "}
                {dateTime(state.now, state.language, p.timezone)}
              </div>
            </>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
    </>
  );
}
const SparkleIcon = () => <span aria-hidden="true">✦</span>;
