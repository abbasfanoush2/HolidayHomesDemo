import { describe, it, expect } from "vitest";
import { makeSeed, day, SCENARIOS } from "../src/domain/seed";
import { execute, syncTurnover } from "../src/domain/engine";
import {
  readiness,
  summary,
  isBooked,
  scopedProperties,
} from "../src/domain/selectors";
import { demoAssistant } from "../src/domain/assistant";
import type { Command, Country, State } from "../src/domain/types";
const filters = {
  country: "All" as const,
  city: "",
  propertyId: "",
  team: "",
  from: "2026-10-01",
  to: "2026-10-31",
  currency: "GBP" as const,
  search: "",
};
const transact = (s: State, ...commands: Command[]) =>
  commands.reduce(execute, s);
describe("Shared synthetic data and reservation invariants", () => {
  it("seeds 36 distinct homes, coherent history/future, synthetic identities and no active overlaps", () => {
    const s = makeSeed();
    expect(s.properties).toHaveLength(36);
    for (const country of ["UK", "Spain", "Italy"])
      expect(s.properties.filter((p) => p.country === country)).toHaveLength(
        12,
      );
    expect(s.bookings.some((b) => b.start < day(s.now, -360))).toBe(true);
    expect(s.bookings.some((b) => b.start > day(s.now, 90))).toBe(true);
    for (const p of s.properties) {
      const bs = s.bookings
        .filter((b) => b.propertyId === p.id && b.status !== "Cancelled")
        .sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < bs.length; i++)
        expect(
          bs[i].start >= bs[i - 1].end,
          `${p.id}: ${bs[i - 1].id} / ${bs[i].id}`,
        ).toBe(true);
    }
    expect(s.bookings.every((b) => b.email.endsWith("@example.test"))).toBe(
      true,
    );
  });
  it("rejects overlap and bad ranges, allows adjacent dates, and produces exactly one turnover under replay", () => {
    let s = makeSeed();
    const b = s.bookings.find((b) => b.id === "arrival-1")!;
    const input = {
      ...b,
      start: b.start,
      end: b.end,
      guest: "Demo Guest",
      email: "new@example.test",
    };
    expect(() => execute(s, { type: "createBooking", booking: input })).toThrow(
      "already has",
    );
    expect(() =>
      execute(s, {
        type: "createBooking",
        booking: { ...input, start: "2026-11-11", end: "2026-11-10" },
      }),
    ).toThrow("after arrival");
    const start = b.end,
      end = day(start, 1);
    expect(isBooked(s, "p-1", start)).toBe(false);
    s = execute(s, {
      type: "createBooking",
      booking: { ...input, start, end },
      key: "one-booking",
    });
    s = execute(s, {
      type: "createBooking",
      booking: { ...input, start, end },
      key: "one-booking",
    });
    syncTurnover(s);
    syncTurnover(s);
    const created = s.bookings.find((x) => x.email === "new@example.test")!;
    expect(
      s.bookings.filter((x) => x.email === "new@example.test"),
    ).toHaveLength(1);
    expect(
      s.tasks.filter((t) => t.sourceId === created.id && t.kind === "Cleaning"),
    ).toHaveLength(1);
    s = execute(s, {
      type: "editBooking",
      id: created.id,
      start: "2027-03-01",
      end: "2027-03-03",
      guests: 2,
    });
    expect(
      s.tasks.find((t) => t.sourceId === created.id)!.due.slice(0, 10),
    ).toBe("2027-03-03");
  });
});
describe("Evidence and approval boundaries", () => {
  it("keeps an arrival blocked after cost approval and repair, then releases only after verification and inspection", () => {
    let s = makeSeed();
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
    s = execute(s, { type: "approve", id: "approval-quote-1" });
    expect(s.issues[0].status).toBe("Scheduled");
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
    expect(() =>
      execute(s, { type: "inspect", propertyId: "p-1", pass: true }),
    ).toThrow();
    s = execute(s, {
      type: "updateIssue",
      id: "issue-1",
      status: "Resolved",
      evidence: true,
    });
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
    s = execute(s, { type: "verifyRepair", id: "issue-1" });
    expect(readiness(s, s.properties[0]).status).toBe("At risk");
    s.tasks.find((t) => t.id === "inspect-1")!.checklist = [true, true, true];
    s = execute(s, { type: "updateTask", id: "inspect-1", photo: true });
    s = execute(s, { type: "inspect", propertyId: "p-1", pass: true });
    expect(readiness(s, s.properties[0]).status).toBe("Ready");
    expect(s.bills.filter((b) => b.id === "repair-bill-issue-1")).toHaveLength(
      1,
    );
  });
  it("rejects stale approvals and changes no cost or readiness state", () => {
    let s = makeSeed();
    s = execute(s, { type: "reviseQuote", id: "issue-1", amount: 25000 });
    expect(s.approvals.find((a) => a.id === "approval-quote-1")!.status).toBe(
      "Stale",
    );
    expect(() =>
      execute(s, { type: "approve", id: "approval-quote-1" }),
    ).toThrow("stale");
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
  });
  it("prevents incomplete cleaning evidence and infeasible staff assignments", () => {
    const s = makeSeed(),
      t = s.tasks.find((t) => t.id === "turn-arrival-1")!;
    expect(() =>
      execute(s, { type: "updateTask", id: t.id, status: "Complete" }),
    ).toThrow("evidence");
    expect(() =>
      execute(s, { type: "assignTask", id: t.id, staffId: "staff-1-1" }),
    ).toThrow("country");
    expect(() =>
      execute(s, { type: "assignTask", id: t.id, staffId: "staff-0-0" }),
    ).toThrow("skill");
  });
  it("pricing affects only available bounded nights, preserves confirmed values, deduplicates approval and supports safe undo", () => {
    let s = makeSeed();
    const booked = s.bookings.map((b) => b.amount),
      original = s.rates.map((r) => r.amount);
    s = execute(s, { type: "proposePricing", propertyId: "p-1" });
    const a = s.approvals[0],
      batch = s.batches[0];
    expect(batch.dates.length).toBeGreaterThan(0);
    for (const d of batch.dates) expect(isBooked(s, "p-1", d)).toBe(false);
    s = execute(s, { type: "approve", id: a.id });
    const once = structuredClone(s.rates);
    s = execute(s, { type: "approve", id: a.id });
    expect(s.rates).toEqual(once);
    expect(s.bookings.map((b) => b.amount)).toEqual(booked);
    expect(s.rates.filter((r, i) => r.amount !== original[i])).toHaveLength(
      batch.dates.length,
    );
    expect(batch.proposed.every((v) => v >= 9500 && v <= 65000)).toBe(true);
    s = execute(s, { type: "undoPricing", id: batch.id });
    expect(s.rates.map((r) => r.amount)).toEqual(original);
  });
  it("revalidates pricing availability at approval time and rejects changed evidence", () => {
    let s = makeSeed();
    s = execute(s, { type: "proposePricing", propertyId: "p-1" });
    const batch = s.batches[0],
      a = s.approvals[0];
    s.rates.find((r) => r.propertyId === "p-1" && r.date === batch.dates[0])!
      .amount++;
    expect(() => execute(s, { type: "approve", id: a.id })).toThrow("changed");
  });
  it("purchase approval does not receive stock; receipt and usage replay are idempotent", () => {
    let s = makeSeed();
    const before = s.inventory[0].quantity;
    s = execute(s, { type: "purchase", id: "stock-1" });
    const id = s.approvals[0].id;
    s = transact(s, { type: "approve", id }, { type: "approve", id });
    expect(s.inventory[0].quantity).toBe(before);
    s = transact(
      s,
      { type: "receive", id: "stock-1" },
      { type: "receive", id: "stock-1" },
    );
    expect(s.inventory[0].quantity).toBe(before + 12);
    s = transact(
      s,
      { type: "consume", id: "stock-1", quantity: 2, key: "usage-1" },
      { type: "consume", id: "stock-1", quantity: 2, key: "usage-1" },
    );
    expect(s.inventory[0].quantity).toBe(before + 10);
    expect(() =>
      execute(s, {
        type: "consume",
        id: "stock-1",
        quantity: 1000,
        key: "bad",
      }),
    ).toThrow("cannot exceed");
  });
  it("deduplicates agent events/tasks and requires sensitive-message approval even with routine auto-send enabled", () => {
    let s = makeSeed();
    s = execute(s, { type: "runAgents" });
    const tasks = s.tasks.length,
      runs = s.runs.length;
    s = execute(s, { type: "runAgents" });
    expect(s.tasks.length).toBe(tasks);
    expect(s.runs.length).toBe(runs);
    s = transact(
      s,
      { type: "policy", values: { routineReplies: true } },
      { type: "draftReply", id: "msg-1", language: "es" },
      { type: "draftReply", id: "msg-1", language: "es" },
      { type: "sendMessage", id: "draft-msg-1-es" },
      { type: "sendMessage", id: "draft-msg-1-es" },
    );
    expect(s.messages.filter((m) => m.id === "draft-msg-1-es")).toHaveLength(1);
    expect(s.messages.find((m) => m.id === "draft-msg-1-es")!.direction).toBe(
      "Draft",
    );
    const a = s.approvals.find((a) => a.entityId === "draft-msg-1-es")!;
    s = transact(
      s,
      { type: "approve", id: a.id },
      { type: "approve", id: a.id },
    );
    expect(
      s.messages.filter(
        (m) => m.id === "draft-msg-1-es" && m.direction === "Outbound",
      ),
    ).toHaveLength(1);
  });
});
describe("Finance, scope and simulation", () => {
  it("reconciles each native ledger and excludes duplicate draft removal from cash or earnings", () => {
    let s = makeSeed();
    const before = summary(s, filters);
    for (const l of before.native) {
      expect(l.owner + l.operator + l.channel + l.expenses).toBe(
        l.accommodation,
      );
      expect(l.gross).toBe(l.accommodation + l.cleaning);
    }
    s = execute(s, { type: "resolveBill", id: "dup-1" });
    s = execute(s, { type: "approve", id: s.approvals[0].id });
    expect(summary(s, filters).native).toEqual(before.native);
    expect(before.native.map((l) => l.currency)).toEqual(["GBP", "EUR"]);
  });
  it("honours filtered assistant scope, multilingual replies and actual command policies", () => {
    let s = makeSeed();
    const f = { ...filters, country: "Spain" as const, propertyId: "p-13" };
    const answer = demoAssistant.respond(
      s,
      f,
      "Draft a reply to the guest in Spanish.",
    );
    expect(answer.sources).toContain("p-13");
    expect(answer.action).toBeTruthy();
    s = execute(s, JSON.parse(answer.action!));
    expect(
      s.messages.some(
        (m) =>
          m.propertyId === "p-13" &&
          m.language === "es" &&
          m.direction === "Draft",
      ),
    ).toBe(true);
    const money = demoAssistant.respond(
      s,
      f,
      "What is our owner payable for this month?",
    );
    expect(money.text).toContain("Native ledgers");
    expect(money.sources.every((id) => id === "p-13")).toBe(true);
    s = execute(s, {
      type: "settings",
      values: { role: "Owner", ownerId: "own-1" },
    });
    expect(
      scopedProperties(s, filters).every((p) => p.ownerId === "own-1"),
    ).toBe(true);
    expect(() =>
      execute(s, { type: "proposePricing", propertyId: "p-1" }),
    ).toThrow("read-only");
  });
  it("clock drives checks, paused agents do not run, reset is deterministic and dates survive DST", () => {
    let s = makeSeed();
    s = transact(
      s,
      { type: "settings", values: { agentsPaused: true } },
      { type: "tick", minutes: 30 },
    );
    expect(s.now).toBe("2026-10-20T08:30:00.000Z");
    expect(s.runs).toHaveLength(1);
    expect(makeSeed()).toEqual(makeSeed());
    const fmt = (date: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
      }).format(new Date(date));
    expect(fmt("2026-10-24T08:00:00Z")).toBe("09");
    expect(fmt("2026-10-25T08:00:00Z")).toBe("08");
  });
});
describe("All five connected pitch scenarios", () => {
  for (const country of ["UK", "Spain", "Italy"] as Country[])
    for (const scenario of SCENARIOS)
      it(`${country}: ${scenario.title} reaches its documented result`, () => {
        let s = makeSeed();
        s = execute(s, { type: "startScenario", id: scenario.id, country });
        const pid = s.scenario!.propertyId,
          amounts = s.bookings.map((b) => b.amount);
        for (let i = 0; i < scenario.steps.length; i++)
          s = execute(s, { type: "stepScenario" });
        expect(s.scenario!.step).toBe(scenario.steps.length);
        expect(s.scenario!.playing).toBe(false);
        expect(s.scenario!.status).toBe("Verified result");
        if (scenario.id === 1) {
          expect(
            readiness(
              s,
              s.properties.find((p) => p.id === pid)!,
            ).status,
          ).toBe("Ready");
          expect(
            s.bills.some((b) => b.id === `repair-bill-issue-${pid.slice(2)}`),
          ).toBe(true);
        }
        if (scenario.id === 2) {
          expect(s.batches[0].applied).toBe(true);
          expect(s.bookings.map((b) => b.amount)).toEqual(amounts);
        }
        if (scenario.id === 3)
          expect(
            s.bills.find((b) => b.id === `dup-${pid.slice(2)}`)!.status,
          ).toBe("Duplicate");
        if (scenario.id === 4)
          expect(
            s.messages.find((m) => m.id === `draft-msg-${pid.slice(2)}-es`)!
              .direction,
          ).toBe("Outbound");
        if (scenario.id === 5)
          expect(
            s.tasks.filter((t) => t.propertyId === pid && t.kind === "Growth"),
          ).toHaveLength(3);
      });
});
