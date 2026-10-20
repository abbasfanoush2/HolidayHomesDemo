import { localiseText } from "../localization/catalogue";
import type {
  State,
  Command,
  Task,
  Approval,
  Message,
  AgentRun,
  Country,
} from "./types";
import { AGENTS, day, at, SCENARIOS, DEMO_DATE, zonedAt } from "./seed";
import {
  isUnavailable,
  readiness,
  activeBooking,
  scenarioSnapshot,
} from "./selectors";
export class DomainError extends Error {}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}
function requireEntity<T extends { id: string }>(arr: T[], id: string): T {
  const item = arr.find((e) => e.id === id);
  if (!item) throw new DomainError(`Record ${id} was not found.`);
  return item;
}
function unique(s: State, prefix: string) {
  return `${prefix}-${s.revision + 1}-${++s.sequence}`;
}
function event(
  s: State,
  title: string,
  sourceId: string,
  propertyId: string,
  actor = "You",
) {
  s.events.unshift({
    id: unique(s, "event"),
    time: s.now,
    title,
    sourceId,
    propertyId,
    actor,
  });
  s.events = s.events.slice(0, 250);
  s.notifications.unshift(sourceId);
  s.notifications = s.notifications.slice(0, 20);
}
function approval(s: State, a: Omit<Approval, "id" | "status" | "requested">) {
  const existing = s.approvals.find(
    (x) =>
      x.entityId === a.entityId &&
      x.type === a.type &&
      x.version === a.version &&
      (x.status === "Pending" || x.status === "Approved"),
  );
  if (existing) return existing;
  const result: Approval = {
    ...a,
    id: unique(s, "approval"),
    status: "Pending",
    requested: s.now,
  };
  s.approvals.unshift(result);
  event(
    s,
    `Approval requested · ${a.title}`,
    result.id,
    a.propertyId,
    "Simulated agent",
  );
  return result;
}
export function syncTurnover(s: State) {
  s.bookings.filter(activeBooking).forEach((b) => {
    const id = `turn-${b.id}`,
      existing = s.tasks.find((t) => t.id === id);
    if (existing) {
      existing.due = at(b.end, 13);
      return;
    }
    s.tasks.push({
      id,
      propertyId: b.propertyId,
      title: `Turnover · ${requireEntity(s.properties, b.propertyId).name}`,
      kind: "Cleaning",
      status: "Queued",
      due: at(b.end, 13),
      assignee: "",
      sourceId: b.id,
      checklist: [false, false, false],
      photo: false,
      notes: "",
    });
  });
  s.tasks = s.tasks.filter(
    (t) =>
      t.kind !== "Cleaning" ||
      s.bookings.some((b) => b.id === t.sourceId && activeBooking(b)),
  );
}
function task(
  s: State,
  pid: string,
  title: string,
  kind: Task["kind"],
  sourceId: string,
) {
  const existing = s.tasks.find(
    (t) => t.title === title && t.sourceId === sourceId,
  );
  if (existing) return existing;
  const t: Task = {
    id: unique(s, "task"),
    propertyId: pid,
    title,
    kind,
    status: "Queued",
    due: at(day(s.now), 15),
    assignee: "",
    sourceId,
    checklist: [false, false, false],
    photo: false,
    notes: "",
  };
  s.tasks.unshift(t);
  event(s, `Task created · ${title}`, t.id, pid, "Simulated agent");
  return t;
}
function run(
  s: State,
  agent: string,
  sourceId: string,
  evidence: string,
  action: string,
  result: string,
  status: AgentRun["status"] = "completed",
) {
  s.runs.unshift({
    id: unique(s, "run"),
    agent,
    trigger: "Scheduled check / domain event",
    time: s.now,
    sources: [sourceId],
    evidence,
    policy:
      "Local simulation. Sensitive actions require explicit approval. Readiness requires evidence.",
    action,
    expected: "A traceable local change, with no external side effect.",
    result,
    verification:
      status === "completed"
        ? "Postcondition checked against shared state."
        : "Human review or more evidence required.",
    status,
  });
  s.runs = s.runs.slice(0, 150);
}
function checkRole(s: State, c: Command) {
  if (
    s.role === "Owner" &&
    !["chat", "settings", "tick", "scenarioPlay"].includes(c.type)
  )
    throw new DomainError(
      "The simulated owner role is read-only. Switch to Admin to change portfolio records.",
    );
  if (
    s.role === "Operations" &&
    ["approve", "postBill", "resolveBill", "createBill"].includes(c.type)
  )
    throw new DomainError(
      "A simulated Finance or Admin role is required for this action.",
    );
}
function validateBooking(
  s: State,
  b: {
    id?: string;
    propertyId: string;
    start: string;
    end: string;
    guests: number;
  },
) {
  const p = requireEntity(s.properties, b.propertyId);
  assert(
    !s.blockedNights.some(
      (n) =>
        n.propertyId === b.propertyId && n.date >= b.start && n.date < b.end,
    ),
    "This stay includes a blocked night. Remove the block or choose different dates.",
  );
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(b.start) && /^\d{4}-\d{2}-\d{2}$/.test(b.end),
    "Use valid arrival and departure dates.",
  );
  assert(
    !Number.isNaN(Date.parse(b.start)) &&
      !Number.isNaN(Date.parse(b.end)) &&
      day(b.start) === b.start &&
      day(b.end) === b.end &&
      b.end > b.start,
    "Departure must be after arrival.",
  );
  assert(
    Number.isInteger(b.guests) && b.guests > 0 && b.guests <= p.capacity,
    `Guest count must be between 1 and ${p.capacity}.`,
  );
  assert(
    !s.bookings.some(
      (x) =>
        x.id !== b.id &&
        x.propertyId === b.propertyId &&
        activeBooking(x) &&
        x.start < b.end &&
        x.end > b.start,
    ),
    "This home already has a reservation on those nights. Adjacent checkout/check-in is allowed.",
  );
}
function approve(s: State, id: string, reject = false) {
  const a = requireEntity(s.approvals, id);
  if (a.status === "Approved" || a.status === "Rejected") return;
  assert(
    a.status === "Pending",
    "This approval is stale. Request a fresh review.",
  );
  if (reject) {
    a.status = "Rejected";
    event(s, `Rejected · ${a.title}`, a.id, a.propertyId);
    return;
  }
  if (a.type === "Quote") {
    const i = requireEntity(s.issues, a.entityId);
    assert(
      i.version === a.version && i.quote === a.amount,
      "The quote has changed. This approval is stale; request a fresh review.",
    );
    assert(
      i.status === "Awaiting approval",
      "The repair is no longer awaiting this approval.",
    );
    i.status = "Scheduled";
  }
  if (a.type === "Pricing") {
    const b = requireEntity(s.batches, a.entityId),
      p = requireEntity(s.properties, b.propertyId);
    assert(
      !b.applied && b.version === a.version,
      "Pricing proposal is no longer current.",
    );
    b.dates.forEach((d, i) => {
      const r = s.rates.find((r) => r.propertyId === p.id && r.date === d);
      assert(
        r && r.amount === b.before[i] && !isUnavailable(s, p.id, d),
        "Availability or rates changed. Request a fresh pricing proposal.",
      );
      assert(
        b.proposed[i] >= p.minRate && b.proposed[i] <= p.maxRate,
        "Proposed rate is outside property bounds.",
      );
    });
    b.dates.forEach((d, i) => {
      s.rates.find((r) => r.propertyId === p.id && r.date === d)!.amount =
        b.proposed[i];
    });
    b.applied = true;
    b.appliedRevision = s.revision + 1;
  }
  if (a.type === "Purchase") {
    const item = requireEntity(s.inventory, a.entityId);
    assert(
      item.version === a.version && item.ordered === 0,
      "Stock request changed; request a fresh review.",
    );
    item.ordered = 12;
    item.received = false;
  }
  if (a.type === "Finance") {
    const b = requireEntity(s.bills, a.entityId);
    assert(
      b.status === "Draft" && !!b.duplicateOf,
      "This draft is no longer an unresolved duplicate.",
    );
    b.status = "Duplicate";
  }
  if (a.type === "Message") {
    const m = requireEntity(s.messages, a.entityId);
    assert(m.direction === "Draft", "Only a current draft can be sent.");
    m.direction = "Outbound";
    m.time = s.now;
  }
  a.status = "Approved";
  a.approver = s.role;
  event(s, `Approved · ${a.title}`, a.id, a.propertyId);
  if (a.type === "Quote")
    run(
      s,
      "Maintenance",
      a.entityId,
      "Cost approval recorded. No repair evidence supplied.",
      "Schedule repair",
      "Repair scheduled; property remains blocked.",
      "awaiting approval",
    );
}
function draft(s: State, id: string, language: "en" | "es" | "it") {
  const msg = requireEntity(s.messages, id),
    p = requireEntity(s.properties, msg.propertyId);
  assert(
    s.bookings.some((b) => b.id === msg.bookingId),
    "This guest is unmatched. Resolve the visible review queue before preparing a reply.",
  );
  const existing = s.messages.find((m) => m.id === `draft-${id}-${language}`);
  if (existing) return existing;
  const blocked = readiness(s, p).status !== "Ready";
  const prepared = blocked
    ? `Thank you for letting us know. Our team is reviewing the issue at ${p.name}. We will confirm once the repair and inspection have been verified. Please contact the demo operations desk for urgent assistance.`
    : `Your home at ${p.name} is inspected and ready. ${p.checkin} We look forward to welcoming you.`;
  const m: Message = {
    ...msg,
    id: `draft-${id}-${language}`,
    text: localiseText(prepared, language),
    language,
    direction: "Draft",
    time: s.now,
  };
  s.messages.push(m);
  event(
    s,
    "Prepared guest reply · scripted demo content",
    m.id,
    p.id,
    "Guest Experience",
  );
  return m;
}
export function evaluateAgents(s: State) {
  if (s.agentsPaused || s.policies.paused) return;
  const slot = Math.floor(Date.parse(s.now) / 900000),
    key = `agents-${slot}`;
  if (s.processed.includes(key)) return;
  s.processed.push(key);
  s.lastCheck = s.now;
  for (const p of s.properties) {
    const r = readiness(s, p);
    if (
      r.status !== "Ready" &&
      s.bookings.some(
        (b) =>
          b.propertyId === p.id && b.start === day(s.now) && activeBooking(b),
      )
    ) {
      if (s.policies.autoTasks && !p.inspection)
        task(
          s,
          p.id,
          `Verify arrival readiness · ${p.name}`,
          "Inspection",
          p.id,
        );
      run(
        s,
        "Operations",
        p.id,
        r.blockers.join("; "),
        "Check arrival readiness",
        r.status,
        r.status === "Not ready" ? "escalated" : "needs information",
      );
    }
  }
  for (const i of s.issues.filter(
    (i) => !i.verified && i.priority === "Critical",
  )) {
    run(
      s,
      "Maintenance",
      i.id,
      `${i.title}; ${i.status}`,
      "Review critical repair",
      i.evidence
        ? "Independent verification needed."
        : "Repair evidence still missing.",
      "needs information",
    );
  }
  for (const bill of s.bills.filter(
    (b) => b.duplicateOf && b.status === "Draft",
  ))
    run(
      s,
      "Finance",
      bill.id,
      `Same supplier reference as ${bill.duplicateOf}`,
      "Flag duplicate draft",
      "Excluded from posted expenses.",
      "proposed",
    );
  for (const stock of s.inventory.filter(
    (i) => i.quantity < i.minimum && i.ordered === 0,
  ))
    run(
      s,
      "Housekeeping & Quality",
      stock.id,
      `${stock.quantity} units; minimum ${stock.minimum}`,
      "Propose restocking",
      "Purchase requires approval.",
      "proposed",
    );
  for (const name of AGENTS.filter(
    (a) =>
      ![
        "Operations",
        "Maintenance",
        "Finance",
        "Housekeeping & Quality",
      ].includes(a),
  ))
    run(
      s,
      name,
      s.properties[0].id,
      "Shared records evaluated against deterministic demo rules.",
      "Portfolio check",
      "Check complete. No autonomous sensitive changes.",
    );
  event(
    s,
    "Agent check complete · evidence and policies evaluated",
    s.runs[0]?.id || "p-1",
    "p-1",
    "Central manager",
  );
}
function scenarioStep(s: State) {
  const q = s.scenario;
  assert(q, "Launch a scenario first.");
  const def = SCENARIOS.find((x) => x.id === q.id)!;
  if (q.step >= def.steps.length) {
    q.playing = false;
    return;
  }
  const p = requireEntity(s.properties, q.propertyId),
    n = p.id.slice(2),
    issueId = `issue-${n}`,
    msgId = `msg-${n}`,
    billId = `dup-${n}`;
  const cmd = (c: Command) => apply(s, c);
  if (q.id === 1) {
    switch (q.step) {
      case 0:
        run(
          s,
          "Operations",
          p.id,
          readiness(s, p).blockers.join("; "),
          "Detect arrival blockers",
          "Repair and inspection required.",
          "escalated",
        );
        break;
      case 1:
        cmd({ type: "requestQuote", id: issueId });
        break;
      case 2:
        cmd({
          type: "approve",
          id: s.approvals.find(
            (a) => a.entityId === issueId && a.status === "Pending",
          )!.id,
        });
        break;
      case 3:
        cmd({
          type: "updateIssue",
          id: issueId,
          status: "Resolved",
          evidence: true,
        });
        break;
      case 4:
        cmd({ type: "verifyRepair", id: issueId });
        break;
      case 5: {
        const t = requireEntity(s.tasks, `inspect-${n}`);
        t.checklist = [true, true, true];
        t.photo = true;
        p.clean = true;
        p.photo = true;
        cmd({ type: "inspect", propertyId: p.id, pass: true });
        break;
      }
      case 6: {
        const m = draft(s, msgId, "en");
        m.direction = "Outbound";
        task(s, p.id, "Prepare owner arrival-rescue update", "Guest", issueId);
        event(
          s,
          "Verified ready · guest message sent locally and owner update prepared",
          m.id,
          p.id,
          "Guest Experience",
        );
        break;
      }
    }
  }
  if (q.id === 2) {
    switch (q.step) {
      case 0:
        run(
          s,
          "Revenue & Pricing",
          p.id,
          "Unbooked future nights identified using current availability.",
          "Review a quiet period",
          "Hypothesis: a modest reduction may improve enquiry volume.",
          "proposed",
        );
        break;
      case 1:
        cmd({ type: "proposePricing", propertyId: p.id });
        break;
      case 2:
        cmd({
          type: "approve",
          id: s.approvals.find(
            (a) =>
              a.type === "Pricing" &&
              a.propertyId === p.id &&
              a.status === "Pending",
          )!.id,
        });
        break;
      case 3:
        run(
          s,
          "Revenue & Pricing",
          p.id,
          "Applied batch checked against availability and bounds.",
          "Verify rates",
          "Available rates changed; confirmed reservation amounts unchanged.",
        );
        break;
    }
  }
  if (q.id === 3) {
    switch (q.step) {
      case 0:
        run(
          s,
          "Finance",
          billId,
          "Duplicate supplier and reference; one posted bill, one draft.",
          "Identify duplicate",
          "Draft excluded from posted totals.",
          "proposed",
        );
        break;
      case 1:
        cmd({ type: "resolveBill", id: billId });
        break;
      case 2:
        cmd({
          type: "approve",
          id: s.approvals.find(
            (a) => a.entityId === billId && a.status === "Pending",
          )!.id,
        });
        break;
      case 3:
        run(
          s,
          "Finance",
          billId,
          "Duplicate draft excluded; original posted bill retained.",
          "Reconcile statement",
          "No cash recovered. Posted ledger unchanged and reconciled.",
        );
        break;
    }
  }
  if (q.id === 4) {
    switch (q.step) {
      case 0: {
        const msg = requireEntity(s.messages, msgId);
        msg.text =
          "A late-night guest reports a heating concern. Human review requested.";
        msg.urgency = "Urgent";
        msg.time = s.now;
        event(
          s,
          "Night-shift guest message received · synthetic replay",
          msg.id,
          p.id,
          "Guest Experience",
        );
        break;
      }
      case 1:
        task(s, p.id, "Night-shift guest handover", "Guest", msgId);
        run(
          s,
          "Guest Experience",
          msgId,
          "Urgent heating concern; no unverified safety claim.",
          "Escalate to operations",
          "Human review and service task created.",
          "escalated",
        );
        break;
      case 2:
        draft(s, msgId, "es");
        break;
      case 3: {
        const m = requireEntity(s.messages, `draft-${msgId}-es`);
        cmd({ type: "sendMessage", id: m.id });
        cmd({
          type: "approve",
          id: s.approvals.find(
            (a) => a.entityId === m.id && a.status === "Pending",
          )!.id,
        });
        const issue = requireEntity(s.issues, issueId);
        if (
          !issue.verified &&
          !["Scheduled", "In progress", "Resolved"].includes(issue.status)
        ) {
          cmd({ type: "requestQuote", id: issueId });
          const cost = s.approvals.find(
            (a) => a.entityId === issueId && a.status === "Pending",
          );
          assert(
            cost,
            "Request a current cost approval before continuing the handover.",
          );
          cmd({ type: "approve", id: cost.id });
        }
        break;
      }
      case 4: {
        const issue = requireEntity(s.issues, issueId);
        if (!issue.verified) {
          if (issue.status !== "Resolved")
            cmd({
              type: "updateIssue",
              id: issueId,
              status: "Resolved",
              evidence: true,
            });
          cmd({ type: "verifyRepair", id: issueId });
        }
        const t = s.tasks.find((t) => t.sourceId === msgId)!;
        t.status = "Complete";
        t.notes =
          "Demo operations desk confirmed guest handover after independent repair verification. Follow-up remains factual and local.";
        const followId = `followup-${issue.id}-${issue.version}`;
        if (!s.messages.some((m) => m.id === followId))
          s.messages.push({
            ...requireEntity(s.messages, msgId),
            id: followId,
            direction: "Draft",
            language: "en",
            time: s.now,
            text: "Prepared factual follow-up: the repair has been independently verified. Any remaining inspection requirements are still visible in operations.",
          });
        event(
          s,
          "Prepared factual post-repair follow-up",
          followId,
          p.id,
          "Guest Experience",
        );
        event(
          s,
          "Shift handover verified · factual follow-up prepared",
          t.id,
          p.id,
          "Guest Experience",
        );
        break;
      }
    }
  }
  if (q.id === 5) {
    switch (q.step) {
      case 0:
        run(
          s,
          "Growth",
          p.id,
          "Current reservations show OTA exposure; direct bookings have a lower illustrative channel fee.",
          "Evaluate channel mix",
          "Hypothesis: a direct-stay follow-up may reduce future acquisition cost.",
          "proposed",
        );
        break;
      case 1:
        cmd({ type: "growthPlan", propertyId: p.id });
        break;
      case 2: {
        const staff = s.staff.find(
          (x) => x.country === p.country && x.role === "Operations lead",
        )!;
        s.tasks
          .filter((t) => t.propertyId === p.id && t.kind === "Growth")
          .forEach((t) =>
            cmd({ type: "assignTask", id: t.id, staffId: staff.id }),
          );
        break;
      }
      case 3: {
        const t = s.tasks.find(
          (t) => t.propertyId === p.id && t.kind === "Growth",
        )!;
        t.status = "Complete";
        event(
          s,
          "First growth action completed · results remain a hypothesis",
          t.id,
          p.id,
          "Growth",
        );
        break;
      }
      case 4:
        event(
          s,
          "30 / 60 / 90 day measurement scheduled. No revenue uplift claimed.",
          p.id,
          p.id,
          "Growth",
        );
        break;
    }
  }
  q.status = def.steps[q.step];
  q.step++;
  if (q.step >= def.steps.length) {
    q.playing = false;
    q.status = "Verified result";
  } else q.status = def.steps[q.step];
}
function apply(s: State, c: Command) {
  checkRole(s, c);
  switch (c.type) {
    case "updateOwner": {
      assert(
        s.role === "Admin" || s.role === "Finance",
        "Finance or Admin is required to edit a fictional owner agreement.",
      );
      assert(
        Number.isInteger(c.feeBps) && c.feeBps >= 0 && c.feeBps <= 5000,
        "Management fee must be between 0% and 50%.",
      );
      const owner = requireEntity(s.owners, c.id);
      owner.feeBps = c.feeBps;
      const p = s.properties.find((p) => p.ownerId === owner.id)!;
      event(s, "Fictional owner agreement updated", owner.id, p.id);
      break;
    }
    case "categorizeBill": {
      const bill = requireEntity(s.bills, c.id);
      assert(
        [
          "Operations",
          "Maintenance",
          "Supplies",
          "Cleaning",
          "Uncategorised",
        ].includes(c.category),
        "Choose a supported expense category.",
      );
      bill.category = c.category;
      event(s, "Expense category updated", bill.id, bill.propertyId);
      break;
    }
    case "blockNight": {
      requireEntity(s.properties, c.propertyId);
      assert(
        !Number.isNaN(Date.parse(c.date)) && day(c.date) === c.date,
        "Choose a valid date.",
      );
      if (
        s.blockedNights.some(
          (n) => n.propertyId === c.propertyId && n.date === c.date,
        )
      )
        return;
      assert(
        !isUnavailable(s, c.propertyId, c.date),
        "A confirmed stay cannot be blocked.",
      );
      s.blockedNights.push({
        id: unique(s, "block"),
        propertyId: c.propertyId,
        date: c.date,
        reason: c.reason || "Owner / operations block",
      });
      event(s, `Night blocked · ${c.date}`, c.propertyId, c.propertyId);
      break;
    }
    case "unblockNight":
      s.blockedNights = s.blockedNights.filter(
        (n) => n.propertyId !== c.propertyId || n.date !== c.date,
      );
      event(s, `Night released · ${c.date}`, c.propertyId, c.propertyId);
      break;
    case "createBooking": {
      if (c.key && s.processed.includes(c.key)) return;
      validateBooking(s, {
        propertyId: c.booking.propertyId,
        start: c.booking.start,
        end: c.booking.end,
        guests: c.booking.guests,
      });
      assert(
        [c.booking.amount, c.booking.cleaning, c.booking.paid].every(
          (v) => Number.isInteger(v) && v >= 0,
        ),
        "Amounts must be non-negative.",
      );
      assert(
        c.booking.email.endsWith("@example.test"),
        "Use a synthetic @example.test guest email.",
      );
      const b = {
        ...c.booking,
        id: unique(s, "booking"),
        created: s.now,
        history: ["Created in local demo"],
      };
      s.bookings.unshift(b);
      syncTurnover(s);
      if (c.key) s.processed.push(c.key);
      event(s, `Reservation created · ${b.guest}`, b.id, b.propertyId);
      break;
    }
    case "editBooking": {
      const b = requireEntity(s.bookings, c.id);
      validateBooking(s, { ...b, ...c });
      Object.assign(b, { start: c.start, end: c.end, guests: c.guests });
      b.history.push(`Dates updated at ${s.now}`);
      syncTurnover(s);
      event(s, "Reservation updated; turnover rescheduled", b.id, b.propertyId);
      break;
    }
    case "cancelBooking": {
      const b = requireEntity(s.bookings, c.id);
      if (b.status === "Cancelled") return;
      b.status = "Cancelled";
      b.history.push(`Cancelled at ${s.now}`);
      syncTurnover(s);
      event(s, "Reservation cancelled in demo", b.id, b.propertyId);
      break;
    }
    case "saveProperty": {
      assert(
        c.property.name.trim() && c.property.capacity > 0,
        "A name and positive capacity are required.",
      );
      const old = s.properties.find((p) => p.id === c.property.id);
      if (old) {
        assert(
          old.country === c.property.country &&
            old.currency === c.property.currency,
          "An existing home's country and ledger currency must stay fixed. Create a new property for another country.",
        );
        assert(
          !s.bookings.some(
            (b) =>
              b.propertyId === old.id &&
              activeBooking(b) &&
              b.guests > c.property.capacity,
          ),
          "This capacity would be smaller than an existing reservation's guest count.",
        );
        Object.assign(old, c.property);
      } else {
        s.properties.push(c.property);
        s.tasks.push({
          id: `inspect-${c.property.id.slice(2)}`,
          propertyId: c.property.id,
          title: `Arrival inspection · ${c.property.name}`,
          kind: "Inspection",
          status: "Queued",
          due: at(day(s.now), 14),
          assignee: "",
          sourceId: c.property.id,
          checklist: [false, false, false],
          photo: false,
          notes: "New home: inspection and evidence required.",
        });
        s.inventory.push({
          id: `stock-${c.property.id.slice(2)}`,
          propertyId: c.property.id,
          name: "Welcome kits",
          quantity: 0,
          minimum: 6,
          unitCost: 1250,
          ordered: 0,
          received: false,
          version: 1,
        });
        for (let d = 0; d < 100; d++) {
          const date = day(s.now, d);
          s.rates.push({
            id: `rate-${c.property.id.slice(2)}-${date}`,
            propertyId: c.property.id,
            date,
            amount: c.property.baseRate,
            original: c.property.baseRate,
          });
        }
        s.documents.push({
          id: `doc-${c.property.id}`,
          propertyId: c.property.id,
          title: "Onboarding document review",
          due: day(s.now, 7),
          status: "Unknown",
        });
      }
      event(s, "Property details saved", c.property.id, c.property.id);
      break;
    }
    case "createTask":
      if (c.key && s.processed.includes(c.key)) return;
      requireEntity(s.properties, c.propertyId);
      assert(c.title.trim(), "Enter a task title.");
      task(s, c.propertyId, c.title, c.kind, c.sourceId);
      if (c.key) s.processed.push(c.key);
      break;
    case "assignTask": {
      const t = requireEntity(s.tasks, c.id),
        staff = requireEntity(s.staff, c.staffId),
        p = requireEntity(s.properties, t.propertyId);
      assert(
        staff.available && staff.country === p.country,
        "Choose an available team member in the property’s country.",
      );
      assert(
        staff.city === "All" || staff.city === p.city,
        "This person is outside the property’s service area.",
      );
      assert(
        staff.skills.includes(t.kind),
        "This person does not have the required skill.",
      );
      assert(
        s.tasks.filter(
          (x) =>
            x.assignee === staff.id &&
            x.status !== "Complete" &&
            day(x.due) === day(t.due) &&
            x.id !== t.id,
        ).length < 4,
        "This shift is at capacity. Choose another feasible assignment.",
      );
      t.assignee = staff.id;
      event(s, `Assigned to ${staff.name}`, t.id, t.propertyId);
      break;
    }
    case "updateTask": {
      const t = requireEntity(s.tasks, c.id);
      if (c.check !== undefined) t.checklist[c.check] = !t.checklist[c.check];
      if (c.photo !== undefined) t.photo = c.photo;
      if (c.photoData !== undefined) t.photoData = c.photoData;
      if (c.notes !== undefined) t.notes = c.notes;
      if (c.status) {
        if (
          c.status === "Complete" &&
          ["Cleaning", "Inspection"].includes(t.kind)
        )
          assert(
            t.checklist.every(Boolean) && t.photo,
            "Complete all checklist items and add demo photo evidence first.",
          );
        t.status = c.status;
      }
      const p = requireEntity(s.properties, t.propertyId);
      if (
        t.kind === "Inspection" &&
        (!t.photo || !t.checklist.every(Boolean) || t.status === "Blocked")
      ) {
        p.inspection = false;
        p.photo = t.photo;
      }
      if (
        t.kind === "Cleaning" &&
        day(t.due) === day(s.now) &&
        t.status === "Complete"
      )
        p.clean = true;
      event(s, `Task updated · ${t.title}`, t.id, t.propertyId);
      break;
    }
    case "inspect": {
      const p = requireEntity(s.properties, c.propertyId),
        t = s.tasks.find(
          (t) => t.propertyId === p.id && t.kind === "Inspection",
        );
      assert(t, "Create an inspection task first.");
      if (c.pass) {
        assert(p.clean, "Cleaning must be complete before inspection.");
        assert(
          t.photo && t.checklist.every(Boolean),
          "Required bedroom photo and checklist evidence are missing.",
        );
        assert(
          !s.issues.some(
            (i) =>
              i.propertyId === p.id && i.priority === "Critical" && !i.verified,
          ),
          "An unresolved critical repair blocks readiness.",
        );
        t.status = "Complete";
        p.inspection = true;
        p.photo = true;
      } else {
        t.status = "Blocked";
        p.inspection = false;
        p.photo = false;
        task(s, p.id, "Inspection rework requested", "Cleaning", t.id);
      }
      event(
        s,
        c.pass
          ? "Inspection verified · home ready"
          : "Inspection failed · rework requested",
        t.id,
        p.id,
      );
      break;
    }
    case "createIssue": {
      requireEntity(s.properties, c.propertyId);
      assert(c.title.trim(), "Enter an issue description.");
      const p = requireEntity(s.properties, c.propertyId),
        i = {
          id: unique(s, "issue"),
          propertyId: p.id,
          title: c.title,
          priority: c.priority,
          status: "Open" as const,
          quote: 18500,
          currency: p.currency,
          version: 1,
          supplier: `${p.city} Demo Repairs`,
          asset: "General",
          evidence: false,
          verified: false,
          ownerResponsibility: true,
          notes: "Created locally in demo",
        };
      s.issues.unshift(i);
      event(s, "Maintenance issue created", i.id, p.id);
      break;
    }
    case "requestQuote": {
      const i = requireEntity(s.issues, c.id);
      assert(
        !i.verified && i.status !== "Closed",
        "This issue is already verified.",
      );
      i.status = "Awaiting approval";
      approval(s, {
        type: "Quote",
        entityId: i.id,
        propertyId: i.propertyId,
        title: `Repair quote · ${i.title}`,
        amount: i.quote,
        currency: i.currency,
        version: i.version,
        evidence: [i.id, `msg-${i.propertyId.slice(2)}`],
      });
      break;
    }
    case "reviseQuote": {
      const i = requireEntity(s.issues, c.id);
      assert(
        Number.isInteger(c.amount) && c.amount > 0,
        "Quote must be a positive amount.",
      );
      i.quote = c.amount;
      i.version++;
      s.approvals
        .filter((a) => a.entityId === i.id && a.status === "Pending")
        .forEach((a) => (a.status = "Stale"));
      event(
        s,
        "Quote revised · previous approvals are stale",
        i.id,
        i.propertyId,
      );
      break;
    }
    case "approve":
      approve(s, c.id, c.reject);
      break;
    case "updateIssue": {
      const i = requireEntity(s.issues, c.id);
      const allowed: Record<string, string[]> = {
        Open: ["Assigned", "Awaiting approval"],
        Assigned: ["In progress", "Awaiting approval"],
        "In progress": ["Awaiting approval", "Resolved"],
        "Awaiting approval": [],
        Scheduled: ["In progress", "Resolved"],
        Resolved: [],
        Closed: [],
      };
      assert(
        allowed[i.status].includes(c.status),
        `Cannot move a repair from ${i.status} to ${c.status}.`,
      );
      if (c.status === "Resolved")
        assert(c.evidence, "Repair completion requires evidence.");
      i.status = c.status;
      if (c.evidence) i.evidence = true;
      event(
        s,
        `Repair ${c.status.toLowerCase()} · independent verification still required`,
        i.id,
        i.propertyId,
      );
      break;
    }
    case "verifyRepair": {
      const i = requireEntity(s.issues, c.id);
      if (i.verified) return;
      assert(
        i.status === "Resolved" && i.evidence,
        "Resolve the repair with evidence before verification.",
      );
      i.verified = true;
      i.status = "Closed";
      if (!s.bills.some((b) => b.id === `repair-bill-${i.id}`))
        s.bills.unshift({
          id: `repair-bill-${i.id}`,
          propertyId: i.propertyId,
          supplier: i.supplier,
          reference: `REPAIR-${i.id}`,
          amount: i.quote,
          currency: i.currency,
          status: "Posted",
          category: "Maintenance",
          date: day(s.now),
        });
      event(
        s,
        "Repair independently verified · expense posted once",
        i.id,
        i.propertyId,
      );
      break;
    }
    case "proposePricing": {
      const p = requireEntity(s.properties, c.propertyId);
      if (c.key && s.processed.includes(c.key)) return;
      const existing = s.approvals.find(
        (a) =>
          a.propertyId === p.id &&
          a.type === "Pricing" &&
          a.status === "Pending",
      );
      assert(!existing, "Review the existing pricing proposal first.");
      const rates = s.rates
        .filter(
          (r) =>
            r.propertyId === p.id &&
            r.date >= day(s.now, 7) &&
            !isUnavailable(s, p.id, r.date),
        )
        .slice(0, 5);
      assert(rates.length, "No available future nights in the pricing window.");
      const b = {
        id: unique(s, "batch"),
        propertyId: p.id,
        dates: rates.map((r) => r.date),
        before: rates.map((r) => r.amount),
        proposed: rates.map((r) =>
          Math.max(p.minRate, Math.min(p.maxRate, Math.round(r.amount * 0.92))),
        ),
        version: 1,
        applied: false,
        undone: false,
      };
      s.batches.unshift(b);
      approval(s, {
        type: "Pricing",
        entityId: b.id,
        propertyId: p.id,
        title: `5-night pricing proposal · ${p.name}`,
        amount: b.proposed.reduce((a, x, i) => a + x - b.before[i], 0),
        currency: p.currency,
        version: b.version,
        evidence: [p.id, ...rates.map((r) => r.id)],
      });
      if (c.key) s.processed.push(c.key);
      break;
    }
    case "undoPricing": {
      const b = requireEntity(s.batches, c.id);
      assert(b.applied && !b.undone, "This batch cannot be undone.");
      b.dates.forEach((d, i) => {
        const r = s.rates.find(
          (r) => r.propertyId === b.propertyId && r.date === d,
        )!;
        assert(
          r.amount === b.proposed[i] && !isUnavailable(s, b.propertyId, d),
          "Later rate changes or bookings prevent undo. Create a compensating proposal.",
        );
      });
      b.dates.forEach((d, i) => {
        s.rates.find(
          (r) => r.propertyId === b.propertyId && r.date === d,
        )!.amount = b.before[i];
      });
      b.undone = true;
      event(
        s,
        "Pricing batch undone · original available rates restored",
        b.id,
        b.propertyId,
      );
      break;
    }
    case "purchase": {
      const item = requireEntity(s.inventory, c.id),
        p = requireEntity(s.properties, item.propertyId);
      assert(item.ordered === 0, "A purchase is already on order.");
      approval(s, {
        type: "Purchase",
        entityId: item.id,
        propertyId: p.id,
        title: `12 × ${item.name}`,
        amount: item.unitCost * 12,
        currency: p.currency,
        version: item.version,
        evidence: [item.id, p.id],
      });
      break;
    }
    case "receive": {
      const item = requireEntity(s.inventory, c.id);
      if (item.received) return;
      assert(item.ordered > 0, "Approve a purchase before recording receipt.");
      const received = item.ordered;
      item.quantity += received;
      item.ordered = 0;
      item.received = true;
      item.version++;
      s.bills.unshift({
        id: `receipt-${item.id}-${item.version}`,
        propertyId: item.propertyId,
        supplier: "Fictional stock supplier",
        reference: `RECEIPT-${item.id}-${item.version}`,
        amount: received * item.unitCost,
        currency: requireEntity(s.properties, item.propertyId).currency,
        status: "Posted",
        category: "Supplies",
        date: day(s.now),
      });
      event(
        s,
        `Receipt confirmed · ${received} ${item.name}`,
        item.id,
        item.propertyId,
      );
      break;
    }
    case "consume": {
      if (s.processed.includes(c.key)) return;
      const item = requireEntity(s.inventory, c.id);
      assert(
        Number.isInteger(c.quantity) &&
          c.quantity > 0 &&
          item.quantity >= c.quantity,
        "Stock usage must be positive and cannot exceed available units.",
      );
      item.quantity -= c.quantity;
      s.processed.push(c.key);
      event(s, `${c.quantity} units consumed`, item.id, item.propertyId);
      break;
    }
    case "resolveBill": {
      const b = requireEntity(s.bills, c.id);
      assert(
        b.duplicateOf && b.status === "Draft",
        "Only a flagged duplicate draft requires this review.",
      );
      approval(s, {
        type: "Finance",
        entityId: b.id,
        propertyId: b.propertyId,
        title: `Exclude duplicate · ${b.reference}`,
        amount: b.amount,
        currency: b.currency,
        version: 1,
        evidence: [b.id, b.duplicateOf],
      });
      break;
    }
    case "postBill": {
      const b = requireEntity(s.bills, c.id);
      assert(
        b.status === "Draft" && !b.duplicateOf,
        "Only a unique draft invoice can be matched.",
      );
      b.status = "Matched";
      event(
        s,
        "Invoice matched and posted to the demo ledger",
        b.id,
        b.propertyId,
      );
      break;
    }
    case "createBill": {
      const p = requireEntity(s.properties, c.propertyId);
      assert(
        Number.isInteger(c.amount) && c.amount > 0 && c.reference.trim(),
        "A reference and positive amount are required.",
      );
      assert(
        !s.bills.some(
          (b) => b.propertyId === p.id && b.reference === c.reference,
        ),
        "This invoice reference already exists.",
      );
      const b = {
        id: unique(s, "bill"),
        propertyId: p.id,
        supplier: "Fictional supplier",
        reference: c.reference,
        amount: c.amount,
        currency: p.currency,
        status: "Draft" as const,
        category: "Uncategorised",
        date: day(s.now),
      };
      s.bills.unshift(b);
      event(s, "Draft invoice created", b.id, p.id);
      break;
    }
    case "draftReply":
      draft(s, c.id, c.language);
      break;
    case "sendMessage": {
      const m = requireEntity(s.messages, c.id);
      if (m.direction === "Outbound") return;
      assert(m.direction === "Draft", "Prepare a draft first.");
      if (m.urgency !== "Routine" || !s.policies.routineReplies) {
        approval(s, {
          type: "Message",
          entityId: m.id,
          propertyId: m.propertyId,
          title: `Guest reply · ${m.guest}`,
          amount: 0,
          currency: requireEntity(s.properties, m.propertyId).currency,
          version: 1,
          evidence: [m.id, m.bookingId],
        });
      } else {
        m.direction = "Outbound";
        m.time = s.now;
        event(
          s,
          "Routine reply sent locally under enabled demo policy",
          m.id,
          m.propertyId,
        );
      }
      break;
    }
    case "reviewReply": {
      const r = requireEntity(s.reviews, c.id);
      r.response =
        "Thank you for sharing your experience. We have passed your factual feedback to our operations team and will follow up on the recorded issue.";
      event(
        s,
        "Factual review response drafted · prepared demo content",
        r.id,
        r.propertyId,
      );
      break;
    }
    case "growthPlan": {
      const p = requireEntity(s.properties, c.propertyId);
      [
        "30 days · prepare direct-stay follow-up template",
        "60 days · evaluate direct versus OTA enquiry mix",
        "90 days · measure acquisition cost per confirmed stay",
      ].forEach((title, i) => {
        const t = task(s, p.id, title, "Growth", p.id);
        t.due = at(day(s.now, (i + 1) * 30));
        t.notes =
          "Hypothesis: a direct-stay follow-up may reduce future channel cost. Owner: Operations lead. Measure direct share and channel fee per booking; no guaranteed uplift.";
      });
      break;
    }
    case "runAgents":
      evaluateAgents(s);
      break;
    case "tick":
      assert(
        c.minutes > 0 && c.minutes <= 1440,
        "Clock step must be 1–1440 minutes.",
      );
      {
        const previous = s.now;
        s.now = new Date(Date.parse(s.now) + c.minutes * 60000).toISOString();
        for (const booking of s.bookings.filter(activeBooking)) {
          const p = requireEntity(s.properties, booking.propertyId),
            checkout = zonedAt(booking.end, 11, p.timezone),
            key = `checkout-${booking.id}`;
          if (
            checkout > previous &&
            checkout <= s.now &&
            !s.processed.includes(key)
          ) {
            s.processed.push(key);
            booking.status = "Checked out";
            p.clean = false;
            p.inspection = false;
            p.photo = false;
            const inspection = s.tasks.find(
              (t) => t.propertyId === p.id && t.kind === "Inspection",
            );
            if (inspection) {
              inspection.status = "Queued";
              inspection.checklist = [false, false, false];
              inspection.photo = false;
              inspection.photoData = undefined;
              inspection.due = zonedAt(booking.end, 14, p.timezone);
            }
            event(
              s,
              "Simulated checkout · cleaning and inspection evidence required",
              `turn-${booking.id}`,
              p.id,
              "Operations",
            );
          }
        }
      }
      evaluateAgents(s);
      break;
    case "settings":
      if (c.values.taxBps !== undefined)
        assert(
          Number.isInteger(c.values.taxBps) &&
            c.values.taxBps >= 0 &&
            c.values.taxBps <= 5000,
          "Illustrative tax adjustment must be between 0% and 50%.",
        );
      Object.assign(s, c.values);
      break;
    case "policy":
      Object.assign(s.policies, c.values);
      break;
    case "startScenario": {
      assert(c.id >= 1 && c.id <= 5, "Unknown scenario.");
      s.now = DEMO_DATE;
      s.playing = false;
      const n = ({ UK: 1, Spain: 13, Italy: 25 } as Record<Country, number>)[
          c.country
        ],
        p = requireEntity(s.properties, `p-${n}`);
      s.scenario = {
        id: c.id,
        country: c.country,
        propertyId: p.id,
        step: 0,
        playing: false,
        status: SCENARIOS[c.id - 1].steps[0],
        before: `${readiness(s, p).status}; ${s.tasks.filter((t) => t.propertyId === p.id && t.status !== "Complete").length} open tasks`,
      };
      if (c.id === 1) {
        p.clean = true;
        p.inspection = false;
        p.photo = false;
        const i = requireEntity(s.issues, `issue-${n}`);
        i.status = "Open";
        i.evidence = false;
        i.verified = false;
        i.version++;
        s.approvals
          .filter((a) => a.entityId === i.id && a.status === "Pending")
          .forEach((a) => (a.status = "Stale"));
        const t = requireEntity(s.tasks, `inspect-${n}`);
        t.status = "Queued";
        t.checklist = [true, true, false];
        t.photo = false;
      }
      if (c.id === 4) {
        s.messages = s.messages.filter((m) => m.id !== `draft-msg-${n}-es`);
        s.approvals
          .filter((a) => a.entityId === `draft-msg-${n}-es`)
          .forEach((a) => (a.status = "Stale"));
      }
      if (c.id === 2)
        s.approvals
          .filter(
            (a) =>
              a.type === "Pricing" &&
              a.propertyId === p.id &&
              a.status === "Pending",
          )
          .forEach((a) => (a.status = "Stale"));
      if (c.id === 3) {
        const b = requireEntity(s.bills, `dup-${n}`);
        b.status = "Draft";
        s.approvals
          .filter((a) => a.entityId === b.id)
          .forEach((a) => {
            a.status = "Stale";
            a.version++;
          });
      }
      s.scenario.before = scenarioSnapshot(s, p.id, c.id);
      event(
        s,
        `Scenario launched · ${SCENARIOS[c.id - 1].title}`,
        p.id,
        p.id,
        "Demo Studio",
      );
      break;
    }
    case "stepScenario":
      scenarioStep(s);
      break;
    case "scenarioPlay":
      if (s.scenario) s.scenario.playing = c.playing;
      break;
    case "retryIntegration":
      event(
        s,
        "Synthetic sync replayed · no external connection",
        c.propertyId,
        c.propertyId,
        "Simulated integration",
      );
      break;
    case "chat":
      s.chat.push(c.message);
      s.chat = s.chat.slice(-50);
      break;
  }
}
export function execute(state: State, command: Command): State {
  const next = structuredClone(state);
  apply(next, command);
  next.revision++;
  return next;
}
export function toolCatalog() {
  return [
    "getPortfolioSummary",
    "getPropertyReadiness",
    "listOpenIssues",
    "createTask",
    "assignTask",
    "draftGuestReply",
    "sendDemoMessage",
    "requestApproval",
    "applyPricingBatch",
    "approveQuote",
    "markRepairResolved",
    "verifyRepair",
    "recordStockReceipt",
    "matchInvoice",
    "prepareOwnerStatement",
    "generateGrowthPlan",
  ];
}
