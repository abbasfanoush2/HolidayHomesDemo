import type { State, Country, Property, Booking, Task } from "./types";
export const BRAND = {
  name: "StayPilot",
  suffix: "AI",
  workspace: "The Collection",
  tagline: "A little less managing. A lot more hosting.",
};
export const DEMO_DATE = "2026-10-20T08:00:00.000Z";
export const FX_EUR_GBP = 0.86;
export const day = (date: string, offset = 0) =>
  new Date(new Date(date).getTime() + offset * 86400000)
    .toISOString()
    .slice(0, 10);
export const at = (date: string, hour = 14) =>
  `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
export function zonedAt(date: string, hour: number, timezone: string) {
  const guess = Date.parse(at(date, hour));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const value = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
  );
  return new Date(guess - (wall - guess)).toISOString();
}
export const AGENTS = [
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
];
export const SCENARIOS = [
  {
    id: 1,
    title: "Rescue an arrival",
    subtitle: "From blocked to guest-ready",
    steps: [
      "Detect the blockers",
      "Prepare a repair quote",
      "Approve the cost",
      "Complete the repair",
      "Verify the repair",
      "Inspect the home",
      "Reassure guest & owner",
    ],
  },
  {
    id: 2,
    title: "Fill a quiet week",
    subtitle: "A bounded, evidence-led pricing decision",
    steps: [
      "Identify available nights",
      "Prepare a pricing proposal",
      "Approve & apply",
      "Verify the rate history",
    ],
  },
  {
    id: 3,
    title: "Make the numbers add up",
    subtitle: "Resolve a duplicate supplier bill",
    steps: [
      "Detect the duplicate",
      "Request finance review",
      "Approve the exception",
      "Verify the statement",
    ],
  },
  {
    id: 4,
    title: "Never miss a guest",
    subtitle: "A careful handover across shifts",
    steps: [
      "Receive a night-shift message",
      "Classify & create a task",
      "Prepare a Spanish reply",
      "Approve & send in demo",
      "Resolve & follow up",
    ],
  },
  {
    id: 5,
    title: "Turn opportunity into action",
    subtitle: "A measurable 30 / 60 / 90 day plan",
    steps: [
      "Find the channel opportunity",
      "Create the linked plan",
      "Assign the owner",
      "Complete the first action",
      "Schedule measurement",
    ],
  },
];
const cities = [
  ["London", "York", "Cornwall"],
  ["Málaga", "Valencia", "Mallorca"],
  ["Rome", "Florence", "Lake Como"],
];
const names = [
  [
    "Willow Townhouse",
    "The Wren Loft",
    "Meadow Cottage",
    "Saltwater House",
    "Juniper Mews",
    "The Reading Room",
    "Fern & Field",
    "Harbour Hideaway",
    "Rowan Retreat",
    "Copper Lane",
    "The Garden Flat",
    "Tide Cottage",
  ],
  [
    "Casa Oliva",
    "Luz Apartment",
    "Villa Azahar",
    "Patio Sereno",
    "Casa Brisa",
    "El Naranjo",
    "Mar y Sol",
    "La Terraza",
    "Casa Laurel",
    "Alba Retreat",
    "El Mirador",
    "Villa Arena",
  ],
  [
    "Casa Luminosa",
    "Terrazza Verde",
    "Villa Sera",
    "Il Giardino",
    "Casa Aurora",
    "Olive & Stone",
    "La Pergola",
    "Cielo Apartment",
    "Casa Fiori",
    "Villa Quiete",
    "Lago Retreat",
    "Pietra House",
  ],
];
const guests = [
  "Avery Rowan",
  "Luca Marin",
  "Nora Finch",
  "Elliot Vale",
  "Sofia Lune",
  "Milo Ash",
  "Isla Reed",
  "Theo Moss",
  "Alma Cove",
  "Leo Fern",
  "Clara Wren",
  "Finn Sage",
];
export function makeSeed(): State {
  const s: State = {
    schema: 1,
    revision: 0,
    sequence: 1000,
    taxBps: 0,
    now: DEMO_DATE,
    playing: false,
    speed: 5,
    agentsPaused: false,
    policies: { paused: false, autoTasks: true, routineReplies: false },
    language: "en",
    role: "Admin",
    ownerId: "own-1",
    motion: true,
    properties: [],
    owners: [],
    bookings: [],
    tasks: [],
    issues: [],
    approvals: [],
    messages: [],
    inventory: [],
    staff: [],
    bills: [],
    documents: [],
    reviews: [],
    rates: [],
    blockedNights: [],
    batches: [],
    events: [],
    runs: [],
    processed: [],
    scenario: null,
    chat: [],
    notifications: [],
    lastCheck: DEMO_DATE,
  };
  (["UK", "Spain", "Italy"] as Country[]).forEach((country, c) => {
    for (let j = 0; j < 4; j++)
      s.staff.push({
        id: `staff-${c}-${j}`,
        name: [
          ["Jamie Brook", "Ellis Fern", "Robin Vale", "Casey Moss"],
          ["Alex Oliva", "Dani Luz", "Noa Alba", "Mar Sol"],
          ["Andrea Sera", "Elia Verde", "Sasha Lago", "Teo Fiori"],
        ][c][j],
        role: ["Inspector", "Cleaner", "Technician", "Operations lead"][j],
        country,
        city: j === 3 ? "All" : cities[c][j],
        shift: j === 2 ? "09:00–18:00" : "07:00–16:00",
        available: true,
        skills: [
          ["Inspection"],
          ["Cleaning"],
          ["Maintenance"],
          ["Guest", "Growth", "Document", "Inspection"],
        ][j],
      });
    for (let i = 0; i < 12; i++) {
      const n = c * 12 + i + 1,
        id = `p-${n}`,
        ownerId = `own-${c * 4 + Math.floor(i / 3) + 1}`,
        city = cities[c][Math.floor(i / 4)],
        currency = c === 0 ? "GBP" : "EUR";
      if (!s.owners.some((o) => o.id === ownerId))
        s.owners.push({
          id: ownerId,
          name: `${["Harper", "Morgan", "Riley", "Jordan"][Math.floor(i / 3)]} ${["Willow", "Oliva", "Sera"][c]}`,
          email: `owner${c * 4 + Math.floor(i / 3) + 1}@example.test`,
          feeBps: 2000,
        });
      const p: Property = {
        id,
        name: names[c][i],
        country,
        city,
        type: ["Townhouse", "Apartment", "Cottage", "Villa"][i % 4],
        capacity: 2 + (i % 4) * 2,
        bedrooms: 1 + (i % 4),
        currency,
        timezone: ["Europe/London", "Europe/Madrid", "Europe/Rome"][c],
        ownerId,
        address: `${12 + i} Fictional ${["Willow Walk", "Olive Passage", "Stone Court"][c]}`,
        amenities: [
          "Wi-Fi",
          "Kitchen",
          "Fresh linen",
          ...(i % 2 ? ["Terrace"] : ["Garden"]),
        ],
        baseRate: 14500 + i * 1750 + c * 1000,
        minRate: 9500,
        maxRate: 65000,
        clean: i % 5 !== 3,
        inspection: i % 4 !== 0,
        photo: i % 4 !== 0,
        rules: "Quiet hours 22:00–08:00. No parties. No smoking indoors.",
        checkin: "Self check-in from 15:00. Demo access code: DEMO-ONLY.",
        onboarded: i !== 11,
      };
      s.properties.push(p);
      for (let d = -365, seq = 0; d <= 98; d += 9, seq++) {
        const start = day(DEMO_DATE, d + (i % 3)),
          end = day(start, 3 + (seq % 3));
        const amount = p.baseRate * (3 + (seq % 3)),
          b: Booking = {
            id: `b-${n}-${seq}`,
            propertyId: id,
            guest: guests[(seq + i) % guests.length],
            email: `guest${n}-${seq}@example.test`,
            guests: Math.min(p.capacity, 2 + (seq % 3)),
            start,
            end,
            channel: ["Airbnb", "Booking.com", "Direct", "Airbnb"][seq % 4],
            status:
              seq % 13 === 7
                ? "Cancelled"
                : end < day(DEMO_DATE)
                  ? "Checked out"
                  : start < day(DEMO_DATE)
                    ? "Checked in"
                    : "Confirmed",
            amount,
            cleaning: 6500,
            paid:
              seq % 8 === 1 ? Math.floor((amount + 6500) * 0.5) : amount + 6500,
            currency,
            requests:
              seq % 7 === 0 ? "Late arrival; please leave a warm welcome." : "",
            created: at(day(start, -30)),
            history: ["Synthetic reservation created"],
          };
        s.bookings.push(b);
        if (b.status !== "Cancelled") {
          const past = end < day(DEMO_DATE);
          const t: Task = {
            id: `turn-${b.id}`,
            propertyId: id,
            title: `Turnover · ${p.name}`,
            kind: "Cleaning",
            status: past ? "Complete" : "Queued",
            due: at(end, 13),
            assignee: past ? `staff-${c}-1` : "",
            sourceId: b.id,
            checklist: [past, past, past],
            photo: past,
            notes: "",
          };
          s.tasks.push(t);
        }
      }
      // A coherent same-day arrival replaces any conflicting generated reservation.
      if (i < 4) {
        s.bookings = s.bookings.filter(
          (b) =>
            !(
              b.propertyId === id &&
              b.start < day(DEMO_DATE, 3) &&
              b.end > day(DEMO_DATE)
            ),
        );
        const b: Booking = {
          id: `arrival-${n}`,
          propertyId: id,
          guest: guests[n % guests.length],
          email: `arrival${n}@example.test`,
          guests: 2,
          start: day(DEMO_DATE),
          end: day(DEMO_DATE, 3),
          channel: i % 2 ? "Direct" : "Airbnb",
          status: "Confirmed",
          amount: p.baseRate * 3,
          cleaning: 6500,
          paid: p.baseRate * 3 + 6500,
          currency,
          requests: "Arriving early. Is the home ready?",
          created: at(day(DEMO_DATE, -10)),
          history: ["Synthetic reservation created"],
        };
        s.bookings.push(b);
      }
      s.tasks.push({
        id: `inspect-${n}`,
        propertyId: id,
        title: `Arrival inspection · ${p.name}`,
        kind: "Inspection",
        status: p.inspection ? "Complete" : "Queued",
        due: at(day(DEMO_DATE), 9),
        assignee: `staff-${c}-0`,
        sourceId: id,
        checklist: [p.inspection, p.inspection, p.inspection],
        photo: p.photo,
        notes: p.inspection
          ? "Required rooms checked."
          : "Bedroom evidence required.",
      });
      if (i === 0 || i === 3 || i === 7)
        s.issues.push({
          id: `issue-${n}`,
          propertyId: id,
          title:
            i === 0
              ? "Heating not responding"
              : i === 3
                ? "Bedroom window latch"
                : "Dishwasher needs attention",
          priority: i === 0 ? "Critical" : i === 3 ? "High" : "Normal",
          status: "Open",
          quote: i === 0 ? 18500 : 9500,
          currency,
          version: 1,
          supplier: `${city} Demo Repairs`,
          asset: i === 0 ? "Heating / cooling" : "Fixtures",
          evidence: false,
          verified: false,
          ownerResponsibility: true,
          notes:
            "Reported in a synthetic guest conversation. Repair and independent verification required.",
        });
      s.messages.push({
        id: `msg-${n}`,
        propertyId: id,
        bookingId:
          i < 4
            ? `arrival-${n}`
            : s.bookings.find((b) => b.propertyId === id)!.id,
        guest: guests[n % 12],
        channel: ["Airbnb", "Booking.com", "WhatsApp"][i % 3],
        language: (["en", "es", "it"] as const)[c],
        sentiment: i === 0 ? "Negative" : i % 3 ? "Positive" : "Neutral",
        urgency: i === 0 ? "Urgent" : "Routine",
        text:
          i === 0
            ? [
                "The heating is not responding. Can you check before we arrive?",
                "La calefacción no funciona. ¿Podéis revisarla antes de llegar?",
                "Il riscaldamento non risponde. Potete controllare prima del nostro arrivo?",
              ][c]
            : [
                "Looking forward to our stay! Could you share the check-in details?",
                "¡Tenemos muchas ganas de llegar! ¿Nos enviáis las instrucciones?",
                "Non vediamo l’ora! Potete inviarci le istruzioni per il check-in?",
              ][c],
        direction: "Inbound",
        time: at(day(DEMO_DATE), 7),
        assigned: `staff-${c}-3`,
      });
      s.inventory.push({
        id: `stock-${n}`,
        propertyId: id,
        name: i % 2 ? "Linen sets" : "Welcome kits",
        quantity: i % 5 === 0 ? 2 : 14 + i,
        minimum: 6,
        unitCost: 1250,
        ordered: 0,
        received: false,
        version: 1,
      });
      s.bills.push({
        id: `bill-${n}`,
        propertyId: id,
        supplier: `${city} Demo Linen`,
        reference: `LIN-${n}-1026`,
        amount: 8500 + i * 500,
        currency,
        status: "Posted",
        category: "Supplies",
        date: "2026-10-15",
      });
      for (let m = 1; m <= 12; m++) {
        const dt = new Date(DEMO_DATE);
        dt.setUTCMonth(dt.getUTCMonth() - m);
        dt.setUTCDate(15);
        s.bills.push({
          id: `history-bill-${n}-${m}`,
          propertyId: id,
          supplier: `${city} Demo Services`,
          reference: `SERVICE-${n}-${m}`,
          amount: 4500 + i * 250 + (m % 3) * 500,
          currency,
          status: "Posted",
          category: "Operations",
          date: day(dt.toISOString()),
        });
      }
      if (i === 0)
        s.bills.push({
          ...s.bills.find((b) => b.id === `bill-${n}`)!,
          id: `dup-${n}`,
          status: "Draft",
          duplicateOf: `bill-${n}`,
        });
      s.documents.push({
        id: `doc-${n}`,
        propertyId: id,
        title:
          i % 2
            ? "Illustrative insurance record"
            : "Illustrative safety checklist",
        due: day(DEMO_DATE, i % 5 === 0 ? 3 : 60 + i),
        status: i % 5 === 0 ? "Needs review" : i === 11 ? "Unknown" : "Current",
      });
      s.reviews.push({
        id: `review-${n}`,
        propertyId: id,
        guest: guests[(n + 3) % 12],
        rating: i % 7 === 0 ? 3 : i % 3 === 0 ? 4 : 5,
        text:
          i % 7 === 0
            ? "Lovely place. The heating took a little time to warm up."
            : "A thoughtful space and a wonderfully smooth stay.",
        response: "",
        bookingId: s.bookings.find(
          (b) => b.propertyId === id && b.status === "Checked out",
        )!.id,
      });
      for (let d = 0; d < 100; d++) {
        const date = day(DEMO_DATE, d);
        s.rates.push({
          id: `rate-${n}-${date}`,
          propertyId: id,
          date,
          amount: p.baseRate,
          original: p.baseRate,
        });
      }
    }
  });
  // Remove turnover tasks for reservations replaced above; add their replacements exactly once.
  s.tasks = s.tasks.filter(
    (t) => t.kind !== "Cleaning" || s.bookings.some((b) => b.id === t.sourceId),
  );
  s.bookings
    .filter((b) => b.id.startsWith("arrival-"))
    .forEach((b) =>
      s.tasks.push({
        id: `turn-${b.id}`,
        propertyId: b.propertyId,
        title: `Turnover · ${s.properties.find((p) => p.id === b.propertyId)!.name}`,
        kind: "Cleaning",
        status: "Queued",
        due: at(b.end, 13),
        assignee: "",
        sourceId: b.id,
        checklist: [false, false, false],
        photo: false,
        notes: "",
      }),
    );
  s.events = [
    {
      id: "evt-seed",
      time: DEMO_DATE,
      title:
        "Morning handover prepared. Three arrival risks need your attention.",
      sourceId: "issue-1",
      propertyId: "p-1",
      actor: "Central manager",
    },
  ];
  [1, 13, 25].forEach((n) =>
    s.approvals.push({
      id: `approval-quote-${n}`,
      type: "Quote",
      entityId: `issue-${n}`,
      propertyId: `p-${n}`,
      title: `Heating repair · ${s.properties[n - 1].name}`,
      amount: 18500,
      currency: s.properties[n - 1].currency,
      status: "Pending",
      version: 1,
      evidence: [`issue-${n}`, `msg-${n}`, `inspect-${n}`],
      requested: DEMO_DATE,
    }),
  );
  s.issues
    .filter((i) => [1, 13, 25].some((n) => i.id === `issue-${n}`))
    .forEach((i) => (i.status = "Awaiting approval"));
  s.runs = [
    {
      id: "run-seed",
      agent: "Operations",
      trigger: "Morning handover",
      time: DEMO_DATE,
      sources: ["issue-1", "inspect-1", "arrival-1"],
      evidence:
        "Willow Townhouse has an unresolved critical heating issue and missing bedroom inspection evidence.",
      policy:
        "Readiness requires repair verification and complete inspection evidence.",
      action: "Request human cost approval",
      expected: "A scheduled repair; readiness remains blocked.",
      result: "Quote prepared for review.",
      verification: "Property remains Not ready.",
      status: "awaiting approval",
    },
  ];
  for (const n of [2, 14, 26]) {
    const propertyId = `p-${n}`;
    const rate = s.rates.find(
      (r) =>
        r.propertyId === propertyId &&
        r.date >= day(DEMO_DATE, 5) &&
        !s.bookings.some(
          (b) =>
            b.propertyId === propertyId &&
            b.status !== "Cancelled" &&
            b.start <= r.date &&
            b.end > r.date,
        ),
    );
    if (rate)
      s.blockedNights.push({
        id: `block-seed-${n}`,
        propertyId,
        date: rate.date,
        reason: "Fictional owner maintenance window",
      });
  }
  return s;
}
