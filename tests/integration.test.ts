import { describe, it, expect } from "vitest";
import { makeSeed, day, zonedAt } from "../src/domain/seed";
import { execute } from "../src/domain/engine";
import { isBooked, readiness, summary } from "../src/domain/selectors";
import { restoreState } from "../src/store";
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
describe("Connected workflow regressions", () => {
  it("scenario playback honours the same finance-role approval boundary as the interface", () => {
    let s = makeSeed();
    s = execute(s, { type: "settings", values: { role: "Operations" } });
    s = execute(s, { type: "startScenario", id: 1, country: "UK" });
    s = execute(s, { type: "stepScenario" });
    s = execute(s, { type: "stepScenario" });
    expect(() => execute(s, { type: "stepScenario" })).toThrow(
      "Finance or Admin",
    );
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
    s = execute(s, { type: "settings", values: { role: "Finance" } });
    s = execute(s, { type: "stepScenario" });
    expect(s.issues[0].status).toBe("Scheduled");
    expect(readiness(s, s.properties[0]).status).toBe("Not ready");
  });

  it("blocks unavailable nights consistently across booking, capacity metrics and pricing", () => {
    let s = makeSeed();
    const date = s.rates.find(
      (r) =>
        r.propertyId === "p-1" &&
        r.date >= day(s.now, 7) &&
        r.date <= filters.to &&
        !isBooked(s, "p-1", r.date),
    )!.date;
    expect(isBooked(s, "p-1", date)).toBe(false);
    const before = summary(s, filters).available;
    s = execute(s, {
      type: "blockNight",
      propertyId: "p-1",
      date,
      reason: "Owner use",
    });
    expect(summary(s, filters).available).toBe(before - 1);
    const original = s.bookings.find((b) => b.id === "arrival-1")!;
    expect(() =>
      execute(s, {
        type: "createBooking",
        booking: {
          ...original,
          start: date,
          end: day(date, 1),
          email: "blocked@example.test",
        },
      }),
    ).toThrow("blocked night");
    s = execute(s, { type: "proposePricing", propertyId: "p-1" });
    expect(s.batches[0].dates).not.toContain(date);
    s = execute(s, { type: "unblockNight", propertyId: "p-1", date });
    expect(summary(s, filters).available).toBe(before);
  });
  it("posts a receipt expense once and keeps approval separate from stock and costs", () => {
    let s = makeSeed();
    const before = summary(s, filters).native.find(
      (l) => l.currency === "GBP",
    )!;
    s = execute(s, { type: "purchase", id: "stock-1" });
    s = execute(s, { type: "approve", id: s.approvals[0].id });
    expect(
      summary(s, filters).native.find((l) => l.currency === "GBP")!.expenses,
    ).toBe(before.expenses);
    s = execute(s, { type: "receive", id: "stock-1" });
    s = execute(s, { type: "receive", id: "stock-1" });
    expect(
      summary(s, filters).native.find((l) => l.currency === "GBP")!.expenses,
    ).toBe(before.expenses + 15000);
    expect(
      s.bills.filter((b) => b.id.startsWith("receipt-stock-1-")),
    ).toHaveLength(1);
  });
  it("reconciles configurable owner fees and illustrative tax without combining currencies", () => {
    let s = makeSeed();
    const before = summary(s, filters);
    s = execute(s, { type: "updateOwner", id: "own-1", feeBps: 2500 });
    s = execute(s, { type: "settings", values: { taxBps: 500 } });
    const after = summary(s, filters);
    expect(after.native[0].operator).toBeGreaterThan(before.native[0].operator);
    for (const l of after.native)
      expect(l.owner + l.operator + l.channel + l.expenses + l.tax).toBe(
        l.accommodation,
      );
    expect(after.native[1].accommodation).toBe(before.native[1].accommodation);
    expect(() =>
      execute(s, {
        type: "saveProperty",
        property: { ...s.properties[0], country: "Spain", currency: "EUR" },
      }),
    ).toThrow("stay fixed");
  });
  it("a simulated checkout invalidates yesterday’s readiness and preserves one turnover", () => {
    let s = makeSeed();
    const b = s.bookings.find(
      (b) =>
        b.end === day(s.now) &&
        b.status !== "Cancelled" &&
        readiness(
          s,
          s.properties.find((p) => p.id === b.propertyId)!,
        ).status === "Ready",
    )!;
    expect(b).toBeTruthy();
    s = execute(s, { type: "tick", minutes: 240 });
    const p = s.properties.find((p) => p.id === b.propertyId)!;
    expect(p.clean).toBe(false);
    expect(p.inspection).toBe(false);
    expect(readiness(s, p).status).toBe("Not ready");
    expect(s.tasks.filter((t) => t.id === `turn-${b.id}`)).toHaveLength(1);
    s = execute(s, { type: "tick", minutes: 15 });
    expect(
      s.events.filter(
        (e) => e.title.includes("Simulated checkout") && e.propertyId === p.id,
      ),
    ).toHaveLength(1);
  });
  it("evidence removal invalidates a previously ready home and timezone conversion respects DST", () => {
    let s = makeSeed();
    expect(readiness(s, s.properties[1]).status).toBe("Ready");
    s = execute(s, { type: "updateTask", id: "inspect-2", photo: false });
    expect(readiness(s, s.properties[1]).status).toBe("At risk");
    expect(zonedAt("2026-10-24", 11, "Europe/London")).toBe(
      "2026-10-24T10:00:00.000Z",
    );
    expect(zonedAt("2026-10-25", 11, "Europe/London")).toBe(
      "2026-10-25T11:00:00.000Z",
    );
    expect(zonedAt("2026-10-25", 11, "Europe/Madrid")).toBe(
      "2026-10-25T10:00:00.000Z",
    );
  });
  it("replays completed scenarios without duplicate messages, costs, growth tasks or invalid approvals", () => {
    for (const id of [1, 2, 3, 4, 5]) {
      let s = makeSeed();
      for (let replay = 0; replay < 2; replay++) {
        s = execute(s, { type: "startScenario", id, country: "UK" });
        const count = [7, 4, 4, 5, 5][id - 1];
        for (let i = 0; i < count; i++)
          s = execute(s, { type: "stepScenario" });
        expect(s.scenario!.status).toBe("Verified result");
      }
      if (id === 1 || id === 4)
        expect(
          s.bills.filter((b) => b.id === "repair-bill-issue-1"),
        ).toHaveLength(1);
      if (id === 5)
        expect(
          s.tasks.filter((t) => t.propertyId === "p-1" && t.kind === "Growth"),
        ).toHaveLength(3);
    }
  });
  it("maintains unique audit and command IDs when the bounded event log is full", () => {
    let s = makeSeed();
    s.events = Array.from({ length: 250 }, (_, i) => ({
      ...s.events[0],
      id: `history-${i}`,
    }));
    s = execute(s, { type: "growthPlan", propertyId: "p-1" });
    expect(new Set(s.events.map((e) => e.id)).size).toBe(s.events.length);
    expect(new Set(s.tasks.map((t) => t.id)).size).toBe(s.tasks.length);
  });
  it("restores valid state with paused processes and rejects corrupted or incompatible saved state", () => {
    const s = makeSeed();
    s.playing = true;
    s.scenario = {
      id: 1,
      country: "UK",
      propertyId: "p-1",
      step: 2,
      playing: true,
      status: "Approve cost",
      before: "Not ready",
    };
    const restored = restoreState(JSON.stringify(s));
    expect(restored.notice).toBe("restored");
    expect(restored.state.playing).toBe(false);
    expect(restored.state.scenario!.playing).toBe(false);
    expect(restored.state.scenario!.step).toBe(2);
    for (const raw of [
      "{broken",
      JSON.stringify({ ...s, schema: 9 }),
      JSON.stringify({ ...s, messages: null }),
    ])
      expect(restoreState(raw).notice).toBe("corrupt");
  });
});
