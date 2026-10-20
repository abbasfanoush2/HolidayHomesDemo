import { useState, type FormEvent } from "react";
import { Check, Plus } from "lucide-react";
import { useStore } from "../store";
import { scopedProperties, money } from "../domain/selectors";
import { day } from "../domain/seed";
import type { Country, Property, Task } from "../domain/types";
import { Button, Overlay } from "./ui";
export function Forms() {
  const { modal } = useStore();
  return modal ? <RecordForm key={modal} modal={modal} /> : null;
}
function RecordForm({ modal }: { modal: string }) {
  const { state, send, setModal, filters, t } = useStore(),
    [kind, id, date] = modal.split(":"),
    editing = kind === "EditBooking",
    booking = state.bookings.find((b) => b.id === id),
    property =
      kind === "Property"
        ? state.properties.find((p) => p.id === id)
        : undefined,
    ps = scopedProperties(state, filters);
  const [pid, setPid] = useState(
      booking?.propertyId ||
        (!property && id && kind !== "Property" ? id : "") ||
        filters.propertyId ||
        ps[0]?.id ||
        "",
    ),
    [country, setCountry] = useState<Country>(property?.country || "UK"),
    [name, setName] = useState(property?.name || ""),
    [capacity, setCapacity] = useState(property?.capacity || 4),
    [arrival, setArrival] = useState(
      booking?.start || date || day(state.now, 2),
    ),
    [departure, setDeparture] = useState(
      booking?.end || day(date || state.now, 5),
    ),
    [guest, setGuest] = useState(booking?.guest || ""),
    [guests, setGuests] = useState(booking?.guests || 2),
    [email, setEmail] = useState(booking?.email || "demo.guest@example.test"),
    [channel, setChannel] = useState(booking?.channel || "Direct"),
    [title, setTitle] = useState(""),
    [taskKind, setTaskKind] = useState<Task["kind"]>("Guest"),
    [priority, setPriority] = useState<"Critical" | "High" | "Normal">(
      "Normal",
    ),
    [amount, setAmount] = useState(185),
    [reference, setReference] = useState(""),
    [city, setCity] = useState(property?.city || "London"),
    [type, setType] = useState(property?.type || "Apartment"),
    [rules, setRules] = useState(
      property?.rules || "Quiet hours 22:00–08:00. No smoking indoors.",
    ),
    [checkin, setCheckin] = useState(
      property?.checkin || "Self check-in from 15:00. Access code: DEMO-ONLY.",
    ),
    [base, setBase] = useState((property?.baseRate || 18000) / 100);
  const p = state.properties.find((p) => p.id === pid);
  const close = () => setModal(null);
  const formTitle =
    kind === "Property"
      ? property
        ? "Edit property"
        : t("newProperty")
      : editing
        ? "Edit reservation"
        : kind === "Booking"
          ? t("newBooking")
          : kind === "Task"
            ? t("newTask")
            : kind === "Issue"
              ? t("newIssue")
              : t("newBill");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    let ok = false;
    if (kind === "Property") {
      const n =
          Math.max(
            0,
            ...state.properties.map((p) => Number(p.id.slice(2)) || 0),
          ) + 1,
        newProperty: Property = {
          id: property?.id || `p-${n}`,
          name: name.trim(),
          country,
          city,
          type,
          capacity,
          bedrooms: property?.bedrooms || 2,
          currency: country === "UK" ? "GBP" : "EUR",
          timezone:
            country === "UK"
              ? "Europe/London"
              : country === "Spain"
                ? "Europe/Madrid"
                : "Europe/Rome",
          ownerId:
            property?.ownerId ||
            state.owners.find((o) =>
              state.properties.some(
                (p) => p.ownerId === o.id && p.country === country,
              ),
            )!.id,
          address: property?.address || "Fictional Demo Lane",
          amenities: property?.amenities || ["Wi-Fi", "Kitchen", "Fresh linen"],
          baseRate: Math.round(base * 100),
          minRate: 9500,
          maxRate: 65000,
          clean: property?.clean || false,
          inspection: property?.inspection || false,
          photo: property?.photo || false,
          rules,
          checkin,
          onboarded: property?.onboarded || false,
        };
      ok = send(
        { type: "saveProperty", property: newProperty },
        "Property saved with local onboarding records.",
      );
    } else if (editing && booking)
      ok = send(
        {
          type: "editBooking",
          id: booking.id,
          start: arrival,
          end: departure,
          guests,
        },
        "Reservation updated. Its single turnover job follows the checkout date.",
      );
    else if (kind === "Booking" && p) {
      const nights = Math.max(
          1,
          (Date.parse(departure) - Date.parse(arrival)) / 86400000,
        ),
        amount = nights * p.baseRate;
      ok = send(
        {
          type: "createBooking",
          booking: {
            propertyId: pid,
            guest: guest.trim(),
            email,
            guests,
            start: arrival,
            end: departure,
            channel,
            status: "Confirmed",
            amount,
            cleaning: 6500,
            paid: 0,
            currency: p.currency,
            requests: "Created through local demo form.",
          },
        },
        "Reservation created. One checkout cleaning job has been scheduled.",
      );
    } else if (kind === "Task")
      ok = send(
        {
          type: "createTask",
          propertyId: pid,
          title,
          kind: taskKind,
          sourceId: pid,
        },
        "Linked task created.",
      );
    else if (kind === "Issue")
      ok = send(
        { type: "createIssue", propertyId: pid, title, priority },
        "Maintenance issue created and linked to its home.",
      );
    else if (kind === "Bill")
      ok = send(
        {
          type: "createBill",
          propertyId: pid,
          amount: Math.round(amount * 100),
          reference,
        },
        "Unique draft invoice created.",
      );
    if (ok) close();
  };
  return (
    <Overlay title={formTitle} onClose={close}>
      <form className="record-form" onSubmit={submit}>
        <p className="muted small">
          {t("noLive")}. Use fictional names and reserved example.test emails.
        </p>
        {kind !== "Property" && (
          <label>
            {t("property")}
            <select
              required
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              disabled={editing}
            >
              {ps.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.city}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "Property" ? (
          <>
            <label>
              Property name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={70}
              />
            </label>
            <div className="form-row">
              <label>
                {t("country")}
                <select
                  value={country}
                  disabled={!!property}
                  onChange={(e) => {
                    const c = e.target.value as Country;
                    setCountry(c);
                    setCity(
                      c === "UK" ? "London" : c === "Spain" ? "Málaga" : "Rome",
                    );
                  }}
                >
                  {["UK", "Spain", "Italy"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                City
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {(country === "UK"
                    ? ["London", "York", "Cornwall"]
                    : country === "Spain"
                      ? ["Málaga", "Valencia", "Mallorca"]
                      : ["Rome", "Florence", "Lake Como"]
                  ).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Home type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {["Apartment", "Townhouse", "Cottage", "Villa"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Guest capacity
                <input
                  required
                  type="number"
                  min="1"
                  max="20"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              Base nightly rate ({country === "UK" ? "GBP" : "EUR"})
              <input
                required
                type="number"
                min="95"
                max="650"
                step="0.01"
                value={base}
                onChange={(e) => setBase(Number(e.target.value))}
              />
            </label>
            <label>
              House rules
              <textarea
                required
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />
            </label>
            <label>
              Prepared check-in instructions
              <textarea
                required
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
              />
            </label>
          </>
        ) : kind === "Booking" || editing ? (
          <>
            {!editing && (
              <>
                <label>
                  Fictional guest name
                  <input
                    required
                    value={guest}
                    onChange={(e) => setGuest(e.target.value)}
                  />
                </label>
                <label>
                  Demo email
                  <input
                    required
                    type="email"
                    pattern=".+@example\.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </>
            )}
            <div className="form-row">
              <label>
                Arrival
                <input
                  required
                  type="date"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                />
              </label>
              <label>
                Departure
                <input
                  required
                  type="date"
                  min={day(arrival || state.now, 1)}
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Guests
                <input
                  required
                  type="number"
                  min="1"
                  max={p?.capacity || 20}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                />
              </label>
              <label>
                Simulated channel
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  disabled={editing}
                >
                  {["Direct", "Airbnb", "Booking.com"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            {p && !editing && (
              <div className="form-estimate">
                Accommodation:{" "}
                {money(
                  Math.max(
                    0,
                    (Date.parse(departure) - Date.parse(arrival)) / 86400000,
                  ) * p.baseRate,
                  p.currency,
                )}{" "}
                + {money(6500, p.currency)} cleaning. The new guest balance is
                unpaid.
              </div>
            )}
          </>
        ) : kind === "Task" || kind === "Issue" ? (
          <>
            <label>
              {kind === "Task" ? "Task title" : "Issue description"}
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={180}
              />
            </label>
            {kind === "Task" ? (
              <label>
                Task type
                <select
                  value={taskKind}
                  onChange={(e) => setTaskKind(e.target.value as Task["kind"])}
                >
                  {[
                    "Guest",
                    "Cleaning",
                    "Inspection",
                    "Maintenance",
                    "Growth",
                    "Document",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                >
                  {["Normal", "High", "Critical"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <label>
              Unique invoice reference
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={60}
              />
            </label>
            <label>
              Amount ({p?.currency})
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
          </>
        )}
        <div className="form-footer">
          <Button type="button" onClick={close}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {kind === "Property" || editing ? (
              <Check size={15} />
            ) : (
              <Plus size={15} />
            )}{" "}
            {t("save")}
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
