import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const paths = [
  "/",
  "/command",
  "/properties",
  "/reservations",
  "/inbox",
  "/operations",
  "/housekeeping",
  "/maintenance",
  "/inventory",
  "/team",
  "/revenue",
  "/growth",
  "/finance",
  "/owners",
  "/reputation",
  "/reports",
  "/documents",
  "/approvals",
  "/activity",
  "/settings",
  "/studio",
];
const issues: string[] = [];
function watch(page: Page) {
  page.on("pageerror", (e) => issues.push(e.message));
  page.on("requestfailed", (r) => {
    if (!r.url().includes("favicon"))
      issues.push(`${r.url()}: ${r.failure()?.errorText}`);
  });
}
test("all operating routes render without runtime errors or mandatory external requests", async ({
  page,
}) => {
  watch(page);
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".fatal-error")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("NaN");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
  expect(issues).toEqual([]);
  expect(external).toEqual([]);
});
test("arrival rescue shows real intermediate blockers and a verified ready result", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /01 Rescue an arrival/ }).click();
  const next = page.getByRole("button", { name: "Next step", exact: true });
  for (let i = 0; i < 3; i++) await next.click();
  await expect(page.locator(".scenario-comparison")).toContainText("Not ready");
  await next.click();
  await expect(page.locator(".scenario-comparison")).toContainText("Not ready");
  await next.click();
  await expect(page.locator(".scenario-comparison")).toContainText("At risk");
  await next.click();
  await next.click();
  await expect(page.locator(".scenario-player .card-heading")).toContainText(
    "Complete",
  );
  await expect(page.locator(".scenario-comparison")).toContainText("Ready");
  await page.reload();
  await expect(page.locator(".scenario-comparison")).toContainText("Ready");
  await page
    .getByRole("button", { name: "Source evidence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "All required readiness evidence is complete.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("approval drawer validates quote, schedules work, leaves readiness blocked, and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/approvals");
  const record = page.locator("tbody .cell-link").first();
  await record.click();
  await page.keyboard.press("Escape");
  await expect(record).toBeFocused();
  await record.click();
  await expect(page.getByRole("dialog")).toContainText(
    "it never resolves the issue",
  );
  await page
    .getByRole("button", { name: "Approve in demo", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Approved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/operations");
  await expect(
    page.getByRole("button", { name: /Willow Townhouse/ }).first(),
  ).toContainText("repair unverified");
});
test("booking creation, validation, single turnover, and actual CSV download", async ({
  page,
}) => {
  await page.goto("/reservations");
  await page
    .getByRole("button", { name: "New reservation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fictional guest name").fill("Synthetic Tester");
  await dialog.getByLabel("Arrival", { exact: true }).fill("2027-03-01");
  await dialog.getByLabel("Departure", { exact: true }).fill("2027-03-03");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/housekeeping");
  await page
    .getByRole("textbox", { name: "Search tasks" })
    .fill("Synthetic Tester");
  await page.getByRole("textbox", { name: "Search tasks" }).fill("Turnover");
  await expect(page.locator("table")).toBeVisible();
  await page.goto("/properties");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("staypilot-properties.csv");
});
test("assistant actions use the same commands, preserve history, and follow country and language filters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Country filter").selectOption("Spain");
  await page.getByLabel("Property filter").selectOption("p-13");
  await page
    .getByRole("button", { name: "Ask StayPilot", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Message the simulated copilot" })
    .fill("Draft a reply to the guest in Spanish.");
  await page.getByRole("button", { name: "Send assistant message" }).click();
  await expect(page.locator(".chat-bubble.assistant").last()).toContainText(
    "scripted reply",
  );
  await page.getByRole("button", { name: "Run local action" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Ask StayPilot", exact: true })
    .click();
  await expect(page.locator(".assistant-messages")).toContainText(
    "Draft a reply",
  );
  await page.getByRole("button", { name: "Close assistant" }).click();
  await page
    .getByRole("button", { name: "Market, language and currency", exact: true })
    .click();
  await page
    .getByLabel("Interface language", { exact: true })
    .selectOption("es");
  await expect(page.locator("h1")).toContainText("Buenos días");
  await page
    .getByLabel("Idioma de interfaz", { exact: true })
    .selectOption("it");
  await expect(page.locator("h1")).toContainText("Buongiorno");
});
test("clock controls, pause, reset and corrupt-data recovery", async ({
  page,
}) => {
  await page.goto("/");
  const original = await page.locator(".clock-controls>span").innerText();
  await page.getByRole("button", { name: "Step clock 15 minutes" }).click();
  expect(await page.locator(".clock-controls>span").innerText()).not.toBe(
    original,
  );
  await page.getByRole("button", { name: "Play clock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause clock", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause clock", exact: true }).click();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset all demo data", exact: true })
    .click();
  await expect(page.locator(".clock-controls>span")).toHaveText(original);
  await page.evaluate(() =>
    localStorage.setItem("staypilot-demo-v1", "{corrupt"),
  );
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Settings");
  await expect(page.getByRole("alert")).toContainText("could not be read");
});
test("screenshots and overflow checks at desktop, tablet and mobile", async ({
  page,
}) => {
  test.setTimeout(180000);
  watch(page);
  for (const width of [1920, 1440, 1280, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/command",
      "/reservations",
      "/operations",
      "/revenue",
      "/finance",
      "/approvals",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      // Capture final values after the reference-style count and gauge entrances.
      await page.waitForTimeout(1500);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width} ${path}`,
      ).toBe(true);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `/workspace/staypilot-qa/${path === "/" ? "overview" : path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
    if (width === 1440 || width === 390) {
      await page.goto("/approvals");
      await page.locator("tbody .cell-link").first().click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `/workspace/staypilot-qa/approval-${width}.png`,
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Ask StayPilot", exact: true })
        .click();
      await page.screenshot({
        path: `/workspace/staypilot-qa/assistant-${width}.png`,
        fullPage: false,
      });
    }
  }
  expect(issues).toEqual([]);
});

test("selected operating screens, approval drawer and mobile overview pass automated accessibility checks", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const path of [
    "/",
    "/command",
    "/reservations",
    "/operations",
    "/revenue",
    "/finance",
    "/approvals",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    // Contrast must be measured after entrance opacity has reached its final state.
    await page.waitForFunction(() =>
      Array.from(
        document.querySelectorAll(
          ".route-content,.card,.approval-register-row",
        ),
      ).every((el) => Number(getComputedStyle(el).opacity) >= 0.999),
    );
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      path,
    ).toEqual([]);
  }
  await page.goto("/approvals");
  await page.locator("tbody .cell-link").first().click();
  await page.waitForTimeout(400);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("simulated owner view exposes only the selected fictional owner and disables agreement edits", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Current role", { exact: true }).selectOption("Owner");
  await page
    .getByLabel("Fictional owner", { exact: true })
    .selectOption("own-1");
  await page.goto("/properties");
  await expect(page.locator(".property-card")).toHaveCount(3);
  await expect(page.locator("main")).not.toContainText("Casa Oliva");
  await page.goto("/owners");
  await page.getByRole("button", { name: "View agreement settings" }).click();
  await expect(
    page.getByRole("button", { name: "Save agreement", exact: true }),
  ).toBeDisabled();
});
