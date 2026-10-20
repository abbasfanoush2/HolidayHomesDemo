import { localeFor } from "../localization/preferences";
import type { State, Filters, Property, Currency, Booking } from "./types";
import { day, FX_EUR_GBP } from "./seed";
export const activeBooking = (b: Booking) => b.status !== "Cancelled";
export function scopedProperties(s: State, f: Filters) {
  return s.properties.filter(
    (p) =>
      (s.role !== "Owner" || p.ownerId === s.ownerId) &&
      (f.country === "All" || p.country === f.country) &&
      (!f.city || p.city === f.city) &&
      (!f.propertyId || p.id === f.propertyId) &&
      (!f.team ||
        s.tasks.some((t) => t.propertyId === p.id && t.assignee === f.team)) &&
      (!f.search || p.name.toLowerCase().includes(f.search.toLowerCase())),
  );
}
export function readiness(s: State, p: Property) {
  const blockers: string[] = [];
  if (!p.clean) blockers.push("Cleaning incomplete");
  if (!p.photo) blockers.push("Bedroom inspection evidence missing");
  if (!p.inspection) blockers.push("Inspection not signed off");
  s.issues
    .filter(
      (i) => i.propertyId === p.id && i.priority === "Critical" && !i.verified,
    )
    .forEach((i) => blockers.push(`${i.title} · repair unverified`));
  return {
    status:
      blockers.some((b) => b.includes("repair")) || !p.clean
        ? "Not ready"
        : blockers.length
          ? "At risk"
          : "Ready",
    blockers,
  };
}
export const convert = (amount: number, from: Currency, to: Currency) =>
  from === to
    ? amount
    : Math.round(from === "EUR" ? amount * FX_EUR_GBP : amount / FX_EUR_GBP);
export function money(
  amount: number,
  currency: Currency = "GBP",
  language = "en",
  compact = false,
) {
  return new Intl.NumberFormat(localeFor(language), {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    useGrouping: "always",
    currency,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(amount / 100);
}
export function ledger(
  s: State,
  bookings: Booking[],
  propertyIds: string[],
  from = "0000-01-01",
  to = "9999-12-31",
) {
  const accommodation = bookings.reduce((a, b) => a + b.amount, 0),
    cleaning = bookings.reduce((a, b) => a + b.cleaning, 0),
    channel = bookings.reduce(
      (a, b) =>
        a + Math.round(b.amount * (b.channel === "Direct" ? 0.03 : 0.15)),
      0,
    ),
    operator = bookings.reduce((total, b) => {
      const p = s.properties.find((p) => p.id === b.propertyId),
        fee = s.owners.find((o) => o.id === p?.ownerId)?.feeBps ?? 2000;
      const channelFee = Math.round(
        b.amount * (b.channel === "Direct" ? 0.03 : 0.15),
      );
      return total + Math.round(((b.amount - channelFee) * fee) / 10000);
    }, 0),
    expenses = s.bills
      .filter(
        (b) =>
          propertyIds.includes(b.propertyId) &&
          (!b.date || (b.date >= from && b.date <= to)) &&
          (b.status === "Posted" || b.status === "Matched"),
      )
      .reduce((a, b) => a + b.amount, 0),
    tax = Math.round((accommodation * s.taxBps) / 10000),
    owner = accommodation - channel - operator - expenses - tax,
    balance = bookings.reduce(
      (a, b) => a + Math.max(0, b.amount + b.cleaning - b.paid),
      0,
    );
  return {
    accommodation,
    cleaning,
    gross: accommodation + cleaning,
    channel,
    operator,
    expenses,
    tax,
    owner,
    balance,
  };
}
export function summary(s: State, f: Filters) {
  const properties = scopedProperties(s, f),
    ids = properties.map((p) => p.id),
    bookings = s.bookings.filter(
      (b) =>
        ids.includes(b.propertyId) &&
        activeBooking(b) &&
        b.start >= f.from &&
        b.start <= f.to,
    ),
    today = day(s.now),
    arrivals = bookings.filter((b) => b.start === today),
    departures = s.bookings.filter(
      (b) => ids.includes(b.propertyId) && activeBooking(b) && b.end === today,
    ),
    states = properties.map((p) => readiness(s, p));
  const days = Math.max(
    1,
    Math.round((Date.parse(f.to) - Date.parse(f.from)) / 86400000) + 1,
  );
  const nights = s.bookings
    .filter((b) => ids.includes(b.propertyId) && activeBooking(b))
    .reduce(
      (a, b) =>
        a +
        Math.max(
          0,
          (Math.min(Date.parse(b.end), Date.parse(day(f.to, 1))) -
            Math.max(Date.parse(b.start), Date.parse(f.from))) /
            86400000,
        ),
      0,
    );
  const revenue = bookings.reduce(
    (a, b) => a + convert(b.amount, b.currency, f.currency),
    0,
  );
  const occupiedRevenue = s.bookings
    .filter((b) => ids.includes(b.propertyId) && activeBooking(b))
    .reduce((a, b) => {
      const overlap = Math.max(
          0,
          (Math.min(Date.parse(b.end), Date.parse(day(f.to, 1))) -
            Math.max(Date.parse(b.start), Date.parse(f.from))) /
            86400000,
        ),
        duration = (Date.parse(b.end) - Date.parse(b.start)) / 86400000;
      return (
        a +
        convert(
          Math.round((b.amount * overlap) / duration),
          b.currency,
          f.currency,
        )
      );
    }, 0);
  const available = Math.max(
    0,
    properties.length * days -
      s.blockedNights.filter(
        (n) => ids.includes(n.propertyId) && n.date >= f.from && n.date <= f.to,
      ).length,
  );
  const native = (["GBP", "EUR"] as Currency[]).map((currency) => {
    const ps = properties
      .filter((p) => p.currency === currency)
      .map((p) => p.id);
    return {
      currency,
      ...ledger(
        s,
        bookings.filter((b) => b.currency === currency),
        ps,
        f.from,
        f.to,
      ),
    };
  });
  return {
    properties,
    ids,
    bookings,
    arrivals,
    departures,
    ready: states.filter((r) => r.status === "Ready").length,
    atRisk: states.filter((r) => r.status === "At risk").length,
    notReady: states.filter((r) => r.status === "Not ready").length,
    nights,
    available,
    occupancy: available ? (100 * nights) / available : 0,
    revenue,
    adr: nights ? Math.round(occupiedRevenue / nights) : 0,
    revpar: available ? Math.round(occupiedRevenue / available) : 0,
    owner: native.reduce(
      (a, l) => a + convert(l.owner, l.currency, f.currency),
      0,
    ),
    operator: native.reduce(
      (a, l) => a + convert(l.operator, l.currency, f.currency),
      0,
    ),
    native,
    issues: s.issues.filter((i) => ids.includes(i.propertyId) && !i.verified),
    approvals: s.approvals.filter(
      (a) => ids.includes(a.propertyId) && a.status === "Pending",
    ),
    tasks: s.tasks.filter(
      (t) =>
        ids.includes(t.propertyId) &&
        t.status !== "Complete" &&
        day(t.due) === today,
    ),
    sentiment: s.reviews
      .filter((r) => ids.includes(r.propertyId))
      .reduce((a, r, _, arr) => a + r.rating / arr.length, 0),
  };
}
export const isBooked = (s: State, pid: string, date: string) =>
  s.bookings.some(
    (b) =>
      b.propertyId === pid &&
      activeBooking(b) &&
      b.start <= date &&
      b.end > date,
  );
export const isUnavailable = (s: State, pid: string, date: string) =>
  isBooked(s, pid, date) ||
  s.blockedNights.some((n) => n.propertyId === pid && n.date === date);
export function scenarioSnapshot(s: State, pid: string, id: number) {
  const p = s.properties.find((p) => p.id === pid)!;
  if (id === 1) {
    const r = readiness(s, p);
    return `${r.status} · ${r.blockers.length} readiness blockers`;
  }
  if (id === 2) {
    const rates = s.rates
      .filter(
        (r) =>
          r.propertyId === pid &&
          r.date >= day(s.now, 7) &&
          !isUnavailable(s, pid, r.date),
      )
      .slice(0, 5);
    return `${rates.length} available-night rates: ${money(
      rates.reduce((a, r) => a + r.amount, 0),
      p.currency,
      s.language,
    )} total`;
  }
  if (id === 3) {
    const bills = s.bills.filter((b) => b.propertyId === pid);
    return `${bills.filter((b) => b.duplicateOf && b.status === "Draft").length} draft duplicates · posted period costs ${money(
      bills
        .filter(
          (b) =>
            (b.status === "Posted" || b.status === "Matched") &&
            b.date.startsWith(s.now.slice(0, 7)),
        )
        .reduce((a, b) => a + b.amount, 0),
      p.currency,
      s.language,
    )}`;
  }
  if (id === 4) {
    return `${s.issues.filter((i) => i.propertyId === pid && !i.verified && i.priority === "Critical").length} unverified critical repairs · ${s.tasks.filter((t) => t.propertyId === pid && t.kind === "Guest" && t.status === "Complete").length} verified handovers · ${s.messages.filter((m) => m.propertyId === pid && m.direction === "Outbound").length} local replies`;
  }
  const tasks = s.tasks.filter(
    (t) => t.propertyId === pid && t.kind === "Growth",
  );
  return `${tasks.filter((t) => t.status === "Complete").length}/${tasks.length} growth actions complete · business outcome remains a hypothesis`;
}
export function pricingForecast(s: State, pid: string) {
  const rates = s.rates.filter(
    (r) =>
      r.propertyId === pid &&
      r.date >= day(s.now) &&
      r.date < day(s.now, 28) &&
      !isUnavailable(s, pid, r.date),
  );
  return {
    nights: rates.length,
    before: rates.reduce((a, r) => a + Math.round(r.original * 0.45), 0),
    current: rates.reduce(
      (a, r) =>
        a + Math.round(r.amount * (r.amount === r.original ? 0.45 : 0.5)),
      0,
    ),
  };
}
export function entityProperty(s: State, id: string) {
  return (
    s.properties.find((p) => p.id === id) ||
    s.properties.find((p) =>
      [
        ...s.bookings,
        ...s.tasks,
        ...s.issues,
        ...s.messages,
        ...s.approvals,
        ...s.documents,
        ...s.bills,
        ...s.reviews,
        ...s.inventory,
      ].some((e) => e.id === id && e.propertyId === p.id),
    )
  );
}
export function dateTime(
  date: string,
  language = "en",
  timezone = "Europe/London",
) {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(date));
}
