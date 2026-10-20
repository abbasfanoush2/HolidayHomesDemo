import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { localiseText } from "../../src/localization/catalogue";
import { makeSeed } from "../../src/domain/seed";
import { summary, money } from "../../src/domain/selectors";
import type { Language } from "../../src/domain/types";
const tr = (text: string, language: Language) => localiseText(text, language);
const country = (page: Page, value: string | null, delay = 0) =>
  page.route("**/api/market", async (route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route
      .fulfill({
        json: { country: value },
        headers: { "Cache-Control": "private, no-store" },
      })
      .catch(() => {});
  });
async function preferences(page: Page, language: Language) {
  await page
    .getByRole("button", {
      name: tr("Market, language and currency", language),
      exact: true,
    })
    .click();
}
async function selectLanguage(page: Page, current: Language, next: Language) {
  await preferences(page, current);
  await page
    .getByLabel(tr("Interface language", current), { exact: true })
    .selectOption(next);
  await page
    .getByRole("button", { name: tr("Close market preferences", next) })
    .click();
}
for (const [code, language, selected, currency] of [
  ["ES", "es", "Spain", "EUR"],
  ["IT", "it", "Italy", "EUR"],
  ["GB", "en", "UK", "GBP"],
] as const)
  test(`fresh ${code} visitor initialises before rendering the dashboard`, async ({
    page,
  }) => {
    await country(page, code, 200);
    await page.addInitScript(() => {
      (
        window as unknown as { englishDashboardSeen: boolean }
      ).englishDashboardSeen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector("h1")?.textContent?.includes("Good morning"))
          (
            window as unknown as { englishDashboardSeen: boolean }
          ).englishDashboardSeen = true;
      });
      observer.observe(document, { childList: true, subtree: true });
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      { es: "es-ES", it: "it-IT", en: "en-GB" }[language],
    );
    await expect(page.getByLabel(tr("Country filter", language))).toHaveValue(
      selected,
    );
    await expect(
      page.getByLabel(tr("Display currency", language), { exact: true }),
    ).toHaveValue(currency);
    await expect(page.locator("h1")).toContainText(
      { es: "Buenos días", it: "Buongiorno", en: "Good morning" }[language],
    );
    if (language !== "en")
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { englishDashboardSeen: boolean })
              .englishDashboardSeen,
        ),
      ).toBe(false);
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("staypilot-preferences-v2")!).mode,
      ),
    ).toBe("automatic");
  });
test("absent and unsupported header use browser language; a hanging lookup has bounded fallback", async ({
  browser,
}) => {
  for (const [header, locale, expected] of [
    [null, "es-ES", "es-ES"],
    ["FR", "it-IT", "it-IT"],
    [null, "fr-FR", "en-GB"],
  ]) {
    const context = await browser.newContext({ locale: locale! });
    const page = await context.newPage();
    await country(page, header);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", expected!);
    await context.close();
  }
  const context = await browser.newContext({ locale: "it-IT" });
  const page = await context.newPage();
  await page.route("**/api/market", () => new Promise(() => {}));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible({ timeout: 4000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "it-IT");
  await context.close();
});
for (const [key, language, selected] of [
  ["es", "es", "Spain"],
  ["it", "it", "Italy"],
  ["uk", "en", "UK"],
] as const)
  test(`deep outreach market=${key} wins and preserves other parameters through navigation`, async ({
    page,
  }) => {
    let requests = 0;
    await page.route("**/api/market", (route) => {
      requests++;
      return route.fulfill({ json: { country: "GB" } });
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "staypilot-preferences-v2",
        JSON.stringify({
          version: 2,
          mode: "manual",
          market: "uk",
          language: "en",
          currency: "GBP",
        }),
      ),
    );
    await page.goto(
      `/finance?utm_source=outreach&market=${key}&campaign=autumn`,
    );
    await expect(page.getByLabel(tr("Country filter", language))).toHaveValue(
      selected,
    );
    await page
      .getByRole("link", { name: tr("Properties", language), exact: true })
      .click();
    expect(new URL(page.url()).searchParams.get("market")).toBe(key);
    expect(new URL(page.url()).searchParams.get("utm_source")).toBe("outreach");
    expect(new URL(page.url()).searchParams.get("campaign")).toBe("autumn");
    await page.getByLabel(tr("Country filter", language)).selectOption("All");
    await page
      .getByRole("link", { name: tr("Finance", language), exact: true })
      .click();
    await expect(page.getByLabel(tr("Country filter", language))).toHaveValue(
      "All",
    );
    await page.reload();
    await expect(page.getByLabel(tr("Country filter", language))).toHaveValue(
      selected,
    );
    expect(requests).toBe(0);
  });
test("manual preference survives refresh, Automatic clears it, and old EN defaults do not block ES detection", async ({
  page,
}) => {
  await country(page, "ES");
  await page.addInitScript(() => {
    if (!localStorage.getItem("staypilot-demo-v1")) {
      /* A pre-v2 saved automatic language. */ localStorage.setItem(
        "staypilot-filters-v1",
        JSON.stringify({
          country: "All",
          currency: "GBP",
          from: "2026-10-01",
          to: "2026-10-31",
        }),
      );
    }
  });
  // Reproduce an actual old persisted seed, which has language=en but no provenance marker.
  await page.goto("/");
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("staypilot-demo-v1", JSON.stringify(seed));
  }, makeSeed());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
  await preferences(page, "es");
  await page.getByLabel(tr("Market selection", "es")).selectOption("uk");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await page.reload();
  await expect(page.getByLabel("Country filter")).toHaveValue("UK");
  await preferences(page, "en");
  await page.getByLabel("Market selection").selectOption("automatic");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("staypilot-preferences-v2")!),
    ),
  ).toEqual({ version: 2, mode: "automatic" });
  await page
    .getByRole("button", { name: tr("Close market preferences", "es") })
    .click();
  await page.getByLabel(tr("Country filter", "es")).selectOption("Italy");
  await page
    .getByRole("link", { name: tr("Finance", "es"), exact: true })
    .click();
  await expect(page.getByLabel(tr("Country filter", "es"))).toHaveValue(
    "Italy",
  );
  await page.reload();
  await expect(page.getByLabel(tr("Country filter", "es"))).toHaveValue(
    "Italy",
  );
});
test("finance converts totals, preserves native ledgers and exports translated records", async ({
  page,
}) => {
  await page.goto("/finance?market=es");
  await page.getByLabel(tr("Country filter", "es")).selectOption("All");
  const nativeBefore = await page.locator(".ledger").allTextContents();
  const stateBefore = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("staypilot-demo-v1")!),
  );
  const f = {
    country: "All" as const,
    city: "",
    propertyId: "",
    team: "",
    from: "2026-10-01",
    to: "2026-10-31",
    currency: "EUR" as const,
    search: "",
  };
  const s = summary(makeSeed(), f);
  await expect(page.locator(".finance-display-summary")).toContainText(
    money(s.revenue, "EUR", "es"),
  );
  await page
    .getByLabel(tr("Display currency", "es"), { exact: true })
    .selectOption("GBP");
  await expect(page.locator(".finance-display-summary")).toContainText(
    money(summary(makeSeed(), { ...f, currency: "GBP" }).revenue, "GBP", "es"),
  );
  expect(await page.locator(".ledger").allTextContents()).toEqual(nativeBefore);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: tr("Export CSV", "es"), exact: true })
    .click();
  const file = await download;
  const contents = await readFile((await file.path())!, "utf8");
  expect(contents).toContain(";");
  expect(contents).toContain(tr("currency", "es"));
  expect(contents).not.toContain("integer minor units");
  expect(contents).toContain("GBP");
  expect(contents).toContain("EUR");
  for (const tab of [
    "Invoices & reconciliation",
    "Guest balances",
    "Native ledgers",
  ]) {
    await page
      .getByRole("button", { name: tr(tab, "es"), exact: true })
      .click();
    await expect(page.locator(".tabs .tab-active-line")).toHaveCount(1);
    await expect(page.locator("main")).not.toContainText(
      /Draft versus posted|Outstanding guest|Accounting assumptions|Accommodation booked|Illustrative tax/,
    );
  }
  await selectLanguage(page, "es", "it");
  await expect(page.locator("main")).not.toContainText(
    /Accommodation booked|Native ledgers|Accounting assumptions/,
  );
  const stateAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("staypilot-demo-v1")!),
  );
  for (const field of ["bookings", "rates", "bills", "tasks", "properties"])
    expect(stateAfter[field]).toEqual(stateBefore[field]);
  await page
    .getByRole("button", {
      name: tr("View native source records", "it"),
      exact: true,
    })
    .first()
    .click();
  await expect(page.getByRole("dialog")).not.toContainText(
    /Accommodation booked|Native ledger|Original transaction/,
  );
});
for (const language of ["en", "es", "it"] as Language[])
  test(`scenario, translated dynamic history and copilot work in ${language}`, async ({
    page,
  }) => {
    await page.goto(`/studio?market=${language === "en" ? "uk" : language}`);
    await page.locator(".scenario-card").first().click();
    const next = page.locator(".scenario-controls .button.primary");
    for (let i = 0; i < 7; i++) await next.click();
    await expect(next).toBeDisabled();
    await expect(page.locator(".scenario-comparison")).toContainText(
      tr("Ready", language),
    );
    const before = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("staypilot-demo-v1")!);
      return [
        s.tasks.length,
        s.approvals.length,
        s.runs.length,
        s.bookings,
        s.rates,
      ];
    });
    await selectLanguage(page, language, language === "it" ? "es" : "it");
    const current = language === "it" ? "es" : "it";
    await expect(page.locator(".scenario-proof")).not.toContainText(
      /Repair resolved|Inspection verified|Prepared synthetic|Quote approved/,
    );
    await page.reload();
    const after = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("staypilot-demo-v1")!);
      return [
        s.tasks.length,
        s.approvals.length,
        s.runs.length,
        s.bookings,
        s.rates,
      ];
    });
    expect(after).toEqual(before);
    await page
      .getByRole("button", { name: tr("Ask StayPilot", current), exact: true })
      .click();
    await page
      .getByRole("textbox", {
        name: tr("Message the simulated copilot", current),
      })
      .fill(
        current === "es"
          ? "¿Qué importe corresponde al propietario?"
          : "Qual è l’importo al proprietario?",
      );
    await page
      .getByRole("button", { name: tr("Send assistant message", current) })
      .click();
    await expect(
      page.locator(".chat-bubble.assistant").last(),
    ).not.toContainText(/Owner payable|Native ledgers|unsupported requests/);
    await expect(page.locator(".chat-bubble.assistant").last()).toContainText(
      tr("StayPilot · Simulated AI", current),
    );
  });
test("Spanish and Italian longer text fits mobile routes and preferences remain accessible", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const language of ["es", "it"] as Language[])
    for (const route of [
      "/",
      "/command",
      "/reservations",
      "/finance",
      "/owners",
      "/reports",
      "/approvals",
      "/studio",
      "/settings",
    ]) {
      await page.goto(`${route}?market=${language}`);
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".route-content,.card")].every(
          (el) => Number(getComputedStyle(el).opacity) >= 0.999,
        ),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${language} ${route}`,
      ).toBe(true);
      await expect(page.locator("main")).not.toContainText("NaN");
      if (route === "/finance" || route === "/studio")
        await page.screenshot({
          path: `/workspace/staypilot-qa/localisation/${route.slice(1)}-${language}-390.png`,
          fullPage: true,
        });
    }
});
test("market changes retain scenarios and records; later manual preferences win a delayed Automatic lookup", async ({
  page,
}) => {
  await country(page, "ES", 500);
  await page.goto("/studio?market=es&utm_source=test");
  await page.locator(".scenario-card").first().click();
  await page.locator(".scenario-controls .button.primary").click();
  const before = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("staypilot-demo-v1")!);
    return [s.scenario, s.tasks, s.approvals, s.runs, s.bookings, s.rates];
  });
  await preferences(page, "es");
  await page.getByLabel(tr("Market selection", "es")).selectOption("it");
  await expect(page.locator("html")).toHaveAttribute("lang", "it-IT");
  expect(new URL(page.url()).searchParams.has("market")).toBe(false);
  expect(new URL(page.url()).searchParams.get("utm_source")).toBe("test");
  const after = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("staypilot-demo-v1")!);
    return [s.scenario, s.tasks, s.approvals, s.runs, s.bookings, s.rates];
  });
  expect(after).toEqual(before);
  await page.getByLabel(tr("Market selection", "it")).selectOption("automatic");
  await page
    .getByLabel(tr("Interface language", "it"), { exact: true })
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await page.waitForTimeout(650);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
});
for (const language of ["es", "it"] as Language[])
  test(`all routes, native validation and printed owner statement are localised in ${language}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of [
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
    ]) {
      await page.goto(`${route}?market=${language}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("main")).not.toContainText(
        /Accounting assumptions|Accommodation booked|Presenter’s notes|Native ledgers|Scheduled check \/ domain event|No records found|Simulated AI|Your team found/,
      );
      await expect(page).not.toHaveTitle(
        /Overview|Properties|Reservations|Finance|Owners|Settings/,
      );
    }
    await page.goto(`/reservations?market=${language}`);
    await page
      .getByRole("button", {
        name: tr("New reservation", language),
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: tr("Save changes", language), exact: true })
      .click();
    expect(
      await dialog
        .locator("input:invalid")
        .first()
        .evaluate((el: HTMLInputElement) => el.validationMessage),
    ).toBe(tr("Please complete this field.", language));
    await page.keyboard.press("Escape");
    await page.goto(`/owners?market=${language}`);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".statement").first()).toBeVisible();
    await expect(page.locator(".statement").first()).not.toContainText(
      /Accommodation|Channel fees|Operator management fee|Owner payable|Fictional owner/,
    );
    const pdf = await page.pdf({
      path: `/workspace/staypilot-qa/localisation/owner-statement-${language}.pdf`,
      format: "A4",
      printBackground: true,
    });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    await page.emulateMedia({ media: "screen" });
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: tr("Export CSV", language), exact: true })
      .click();
    const file = await download;
    const csv = await readFile((await file.path())!, "utf8");
    expect(csv).not.toContain('"accommodation"');
    expect(csv).toContain(tr("accommodation", language));
    expect(errors).toEqual([]);
  });
