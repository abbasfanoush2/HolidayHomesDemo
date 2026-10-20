import { test, expect } from "@playwright/test";

test("suggestion filtering, dismissal, approval feedback and evidence reflect shared records", async ({
  page,
}) => {
  await page.goto("/command");
  const firstRisk = page.locator(".suggestion-card").first();
  const title = await firstRisk.locator("h3").innerText();
  await firstRisk
    .getByRole("button", { name: `Dismiss ${title}`, exact: true })
    .click();
  await page
    .locator(".suggestion-toolbar")
    .getByRole("button", { name: "Dismissed", exact: true })
    .click();
  await expect(page.locator(".suggestion-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Restore ${title}`, exact: true })
    .click();
  await expect(page.locator(".suggestion-card")).toHaveCount(0);
  await page
    .locator(".suggestion-toolbar")
    .getByRole("button", { name: "Active", exact: true })
    .click();
  await page
    .locator(".suggestion-kinds")
    .getByRole("button", { name: /Decisions/ })
    .click();
  await expect(page.locator(".suggestion-card")).toHaveCount(3);
  const decision = page.locator(".suggestion-card").first();
  await decision
    .getByRole("button", { name: "Approve in demo", exact: true })
    .click();
  await expect(decision.locator(".approval-feedback")).toHaveText("Approved");
  const source = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("staypilot-demo-v1")!);
    return {
      approval: state.approvals.find(
        (a: { id: string }) => a.id === "approval-quote-1",
      ).status,
      issue: state.issues.find((i: { id: string }) => i.id === "issue-1"),
    };
  });
  expect(source.approval).toBe("Approved");
  expect(source.issue.status).toBe("Scheduled");
  expect(source.issue.verified).toBe(false);
  await decision.getByRole("button", { name: "View outcome" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Repair remains separate from cost approval.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("schedule scale and period controls expose actual tasks and source drawers", async ({
  page,
}) => {
  await page.goto("/");
  const schedule = page.locator(".schedule-card");
  await schedule.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(
    schedule.getByRole("button", { name: "Weekly", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(schedule.locator(".schedule-footnote")).toContainText(
    "Scheduled task dates",
  );
  const date = await schedule.locator(".schedule-date").innerText();
  await schedule.getByRole("button", { name: "Next schedule period" }).click();
  await expect(schedule.locator(".schedule-date")).not.toHaveText(date);
  await schedule.getByRole("button", { name: "Today", exact: true }).click();
  await expect(schedule.locator(".schedule-date")).toHaveText(date);
  await schedule.getByRole("button", { name: "Daily", exact: true }).click();
  await schedule.locator(".schedule-bar").nth(1).click();
  await expect(page.getByRole("dialog")).toContainText("Arrival inspection");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("motion settles to current values and both motion preferences preserve working interactions", async ({
  page,
}) => {
  await page.goto("/");
  const gauge = page.locator(
    ".precision-gauge .gauge-value strong .count-up > [aria-hidden=true]",
  );
  await expect(gauge).toHaveText("67");
  await expect(
    page
      .locator(".dashboard-metrics .kpi")
      .first()
      .locator("strong [aria-hidden=true]"),
  ).toHaveText("12");
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: /Presentation motion/ }).uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "false");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(gauge).toHaveText("67");
  const cssDuration = await page
    .locator(".button")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(cssDuration).toBe("0s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: /Presentation motion/ }).check();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(gauge).toHaveText("67");
  await page.locator(".dashboard-metrics .kpi").first().click();
  await expect(page.getByRole("dialog")).toContainText("Portfolio arrivals");
  await expect(page.locator(".drawer")).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
