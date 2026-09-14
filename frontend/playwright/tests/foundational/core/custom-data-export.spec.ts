import { test, expect } from "../../../helpers/test-base";
import type { Page } from "@playwright/test";

// src/test/resources/fixtures/reporting-repeated-results.sql is loaded by the
// shared fixture loader. Its two equal readings have distinct result identities.
const accession = "REPORTING-MVP-REPEAT";

async function createReportUsers(page: Page, usernames: string[]) {
  await page.goto("/");
  const endpoint = "/api/OpenELIS-Global/rest/UnifiedSystemUser";
  const response = await page.request.get(endpoint);
  expect(response.status()).toBe(200);
  const form = await response.json();
  const reports = form.labUnitRoles.find(
    (role: { roleName: string }) => role.roleName === "Reports",
  );
  expect(reports?.roleId).toBeTruthy();
  const password = process.env.TEST_PASS;
  expect(
    password,
    "TEST_PASS is required for the disposable report users",
  ).toBeTruthy();
  const csrf = await page.evaluate(() => localStorage.getItem("CSRF") || "");
  for (const username of usernames) {
    const created = await page.request.post(endpoint, {
      headers: { "X-CSRF-Token": csrf },
      data: {
        userLoginName: username,
        userPassword: password,
        confirmPassword: password,
        userFirstName: "Reporting",
        // User management rejects duplicate first/last-name pairs.
        userLastName: username,
        expirationDate: form.expirationDate,
        timeout: form.timeout,
        accountActive: "Y",
        accountDisabled: "N",
        accountLocked: "N",
        allowCopyUserRoles: "N",
        selectedRoles: [],
        selectedTestSectionLabUnits: { AllLabUnits: [reports.roleId] },
      },
    });
    expect(created.status()).toBe(200);
    expect(await created.json()).toEqual({
      forward: "redirect:/UnifiedSystemUser",
    });
  }
}

async function signInAsReportUser(page: Page, username: string) {
  // A clean browser state proves shared definitions come from the server,
  // rather than the previous user's locally retained draft.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#loginName").fill(username);
  await page.locator("#password").fill(process.env.TEST_PASS!);
  await page.locator('[data-cy="loginButton"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("navigation", { name: "Side navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page
    .getByRole("link", { name: "Custom Data Export", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Custom Data Export", exact: true }),
  ).toBeVisible();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && char === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += char;
  }
  expect(quoted).toBe(false);
  expect(cell).toBe("");
  expect(row).toEqual([]);
  return rows;
}

async function openBuilder(page: Page, date = "2026-05-05") {
  await page.goto("/CustomDataExport");
  await expect(
    page.getByRole("heading", { name: "Custom Data Export", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Date from", { exact: true }).fill(date);
  await page.getByLabel("Date to", { exact: true }).fill(date);
}

async function downloadReport(page: Page, count: number) {
  const preview = page.getByRole("region", { name: "CSV header preview" });
  const headers = await preview.getByRole("columnheader").allTextContents();
  await page
    .getByRole("button", { name: "Review report", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate CSV", exact: true }).click();
  const current = page.getByRole("region", { name: "Your current report" });
  const link = current.getByRole("link", { name: "Download CSV" });
  await expect(link).toBeVisible({ timeout: 20_000 });
  await expect(current).toContainText(`${count} rows`);
  const completed = page.waitForEvent("download");
  await link.click();
  const download = await completed;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
  const rows = parseCsv(bytes.subarray(3).toString("utf8"));
  expect(rows[0]).toEqual(headers);
  expect(rows.slice(1)).toHaveLength(count);
  await test
    .info()
    .attach("download.csv", { body: bytes, contentType: "text/csv" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("report-ready.png"),
    fullPage: true,
  });
  return { headers, records: rows.slice(1) };
}

test("spreadsheet preserves both identical readings in an instance-configured test column", async ({
  page,
}) => {
  await openBuilder(page);
  await expect(
    page.getByRole("combobox", { name: "CSV layout" }),
  ).toContainText("Spreadsheet");
  await page
    .getByRole("button", { name: "Move Specimen ID up", exact: true })
    .click();
  const { headers, records } = await downloadReport(page, 2);
  expect(headers.slice(0, 2)).toEqual(["Specimen ID", "Accession Number"]);
  expect(headers).toContain("Viral Load");
  expect(
    records.map((row) => row[headers.indexOf("Accession Number")]),
  ).toEqual([accession, accession]);
  expect(records.map((row) => row[headers.indexOf("Viral Load")])).toEqual([
    "450",
    "450",
  ]);
  expect(new Set(records.map((row) => row[0])).size).toBe(1);
});

test("turnaround beside a test preserves each repeated result's own duration", async ({
  page,
}) => {
  await openBuilder(page, "2026-05-06");
  const duration = "Viral Load — Resulted to Validated (min)";
  await page.getByText(duration, { exact: true }).click();
  const preview = page.getByRole("region", { name: "CSV header preview" });
  const initial = await preview.getByRole("columnheader").allTextContents();
  // Exercise the user's ordering controls and compare actual downloaded cells.
  const moves = initial.indexOf(duration) - initial.indexOf("Viral Load") - 1;
  expect(moves).toBeGreaterThanOrEqual(0);
  for (let index = 0; index < moves; index++)
    await page
      .getByRole("button", { name: `Move ${duration} up`, exact: true })
      .click();
  const { headers, records } = await downloadReport(page, 2);
  const testColumn = headers.indexOf("Viral Load");
  expect(headers[testColumn + 1]).toBe(duration);
  expect(
    records.map((row) => [
      row[headers.indexOf("Accession Number")],
      row[testColumn],
      row[testColumn + 1],
    ]),
  ).toEqual([
    ["REPORTING-MVP-TURNAROUND", "450", "30"],
    ["REPORTING-MVP-TURNAROUND", "450", "90"],
  ]);
  await page.getByRole("button", { name: "Edit report", exact: true }).click();
  await page.getByRole("combobox", { name: "CSV layout" }).click();
  await page
    .getByRole("option", {
      name: "Detailed list — results in rows",
      exact: true,
    })
    .click();
  await page.getByText("Resulted to Validated (min)", { exact: true }).click();
  const detail = await downloadReport(page, 2);
  expect(
    detail.records.map((row) => [
      row[detail.headers.indexOf("Result Value")],
      row[detail.headers.indexOf("Resulted to Validated (min)")],
    ]),
  ).toEqual([
    ["450", "30"],
    ["450", "90"],
  ]);
});

test("detailed layout exports both result identities and keeps the chosen period", async ({
  page,
}) => {
  await openBuilder(page);
  await page.getByRole("combobox", { name: "CSV layout" }).click();
  await page
    .getByRole("option", {
      name: "Detailed list — results in rows",
      exact: true,
    })
    .click();
  // Carbon hides the checkbox input; the associated visible label is its action target.
  await page.locator('label[for="reporting-field-resultId"]').click();
  await expect(page.getByLabel("Date from", { exact: true })).toHaveValue(
    "2026-05-05",
  );
  const { headers, records } = await downloadReport(page, 2);
  expect(
    records.map((row) => row[headers.indexOf("Accession Number")]),
  ).toEqual([accession, accession]);
  expect(records.map((row) => row[headers.indexOf("Result Value")])).toEqual([
    "450",
    "450",
  ]);
  const identities = records.map((row) => row[headers.indexOf("Result ID")]);
  expect(identities.every(Boolean)).toBe(true);
  expect(new Set(identities).size).toBe(2);
});

test("another configured report uses its own defaults and the same builder and queue", async ({
  page,
}) => {
  await openBuilder(page);
  await page.getByRole("combobox", { name: "Report type" }).click();
  await page
    .getByRole("option", { name: "Sample summary", exact: true })
    .click();
  const preview = page.getByRole("region", { name: "CSV header preview" });
  await expect(preview.getByRole("columnheader")).toHaveText([
    "Specimen ID",
    "Accession Number",
  ]);
  await expect(
    page.getByRole("checkbox", { name: "Patient Name", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Viral Load", exact: true }),
  ).not.toBeChecked();
  // Add an instance-configured test that is available but deliberately not a default.
  await page
    .locator("label")
    .filter({ hasText: /^Viral Load$/ })
    .click();
  const { headers, records } = await downloadReport(page, 2);
  expect(headers).toEqual(["Specimen ID", "Accession Number", "Viral Load"]);
  expect(records.map((row) => row.slice(1))).toEqual([
    [accession, "450"],
    [accession, "450"],
  ]);
  await expect(
    page.getByRole("region", { name: "Your current report" }),
  ).toContainText("Sample summary");
  await page
    .getByRole("button", { name: "My Report Queue", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "My Report Queue" }),
  ).toContainText("Sample summary");
});

test("an empty period produces a header-only download and an explicit zero-row result", async ({
  page,
}) => {
  await openBuilder(page, "2026-05-07");
  const { records } = await downloadReport(page, 0);
  expect(records).toEqual([]);
});

test("switching to a report without optional filters cannot retain a hidden test restriction", async ({
  page,
}) => {
  await openBuilder(page);
  const response = await page.request.get(
    "/api/OpenELIS-Global/rest/reports/data-export/variables?reportType=SAMPLE_TESTING&layout=SPREADSHEET",
  );
  expect(response.status()).toBe(200);
  const catalog = await response.json();
  // Any other configured test excludes this fixture's Viral Load records.
  const excluded = catalog.tests.find(
    (item: { label: string }) => item.label !== "Viral Load",
  );
  expect(excluded).toBeTruthy();
  const tests = page.getByRole("combobox", { name: /^Tests/ });
  await tests.click();
  await page.getByRole("option", { name: excluded.label, exact: true }).click();
  await tests.press("Escape");
  await page.getByRole("combobox", { name: "Report type" }).click();
  await page
    .getByRole("option", { name: "Finalized sample summary", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: /^Lab sections/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /^Tests/ })).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: /^Result statuses/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Some previous filters are unavailable for this report. Review the current filters before generating.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .locator("label")
    .filter({ hasText: /^Viral Load$/ })
    .click();
  const { headers, records } = await downloadReport(page, 2);
  expect(headers).toEqual(["Specimen ID", "Accession Number", "Viral Load"]);
  expect(records.map((row) => row.slice(1))).toEqual([
    [accession, "450"],
    [accession, "450"],
  ]);
  await page.getByRole("button", { name: "Edit report", exact: true }).click();
  await page.getByRole("combobox", { name: "Report type" }).click();
  await page
    .getByRole("option", { name: "Sample & Testing", exact: true })
    .click();
  await tests.click();
  await expect(
    page.getByRole("option", { name: excluded.label, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Reports entry explains invalid periods and restores a reviewed draft after navigation", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000); // Includes entering Reports and a full page reload.
  await page.goto("/");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page
    .getByRole("link", { name: "Custom Data Export", exact: true })
    .click();
  const from = page.getByLabel("Date from", { exact: true });
  const to = page.getByLabel("Date to", { exact: true });
  const review = page.getByRole("button", {
    name: "Review report",
    exact: true,
  });
  await expect(from).toBeVisible();
  await expect(review).toBeDisabled();
  await from.fill("2026-01-01");
  await to.fill("2025-12-31");
  await expect(
    page.getByText("End date must be on or after the start date.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(review).toBeDisabled();
  await to.fill("2026-04-01");
  await expect(
    page.getByText(
      "Choose a period of 90 days or fewer, including both dates.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(review).toBeDisabled();
  await to.fill("2026-03-31");
  await expect(review).toBeEnabled();
  await from.fill("2026-05-05");
  await to.fill("2026-05-05");
  await page.screenshot({
    path: testInfo.outputPath("report-builder.png"),
    fullPage: true,
  });
  await review.click();
  const headers = await page
    .getByRole("region", { name: "CSV header preview" })
    .getByRole("columnheader")
    .allTextContents();
  const queueLoaded = page.waitForResponse((response) =>
    response.url().includes("/rest/reports/data-export/jobs?page=0"),
  );
  await page
    .getByRole("button", { name: "My Report Queue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My Report Queue", exact: true }),
  ).toBeVisible();
  await queueLoaded;
  await expect(
    page.getByText("Loading report options…", { exact: true }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Back to report builder", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Generate CSV", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Generate CSV", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("2026-05-05 – 2026-05-05", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "CSV header preview" })
      .getByRole("columnheader"),
  ).toHaveText(headers);
});

test("a shared report reopens with fresh dates and supports confirmed update, copy, and delete", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const reportName = `Reporting UAT ${Date.now()}`;
  const copyName = `${reportName} copy`;

  await openBuilder(page);
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await page.getByLabel("Report name", { exact: true }).fill(reportName);
  await page
    .getByRole("button", { name: "Save shared report", exact: true })
    .click();
  await expect(
    page.getByText(`Saved as ${reportName}.`, { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Shared reports", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search shared reports", exact: true })
    .fill(reportName);
  let card = page.getByRole("article", { name: reportName, exact: true });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Date from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Date to", { exact: true })).toHaveValue("");
  await expect(
    page.getByText("Choose fresh dates before running this saved report.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.locator('label[for="reporting-field-patientName"]').click();
  await page
    .getByRole("button", { name: "Update shared report", exact: true })
    .click();
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(
    page.getByText(`Updated ${reportName}.`, { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Save a copy", exact: true }).click();
  await page.getByLabel("Report name", { exact: true }).fill(copyName);
  await page
    .getByRole("button", { name: "Save shared report", exact: true })
    .click();
  await expect(
    page.getByText(`Saved as ${copyName}.`, { exact: true }),
  ).toBeVisible();

  for (const name of [reportName, copyName]) {
    await page
      .getByRole("button", { name: "Shared reports", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search shared reports", exact: true })
      .fill(name);
    card = page.getByRole("article", { name, exact: true });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Delete shared report/ }).click();
    await page.getByRole("button", { name: /Delete$/, exact: false }).click();
    await expect(card).toBeHidden();
    if (name === reportName)
      await page
        .getByRole("button", { name: "Back to report builder", exact: true })
        .click();
  }
});

test("ordinary report users share a definition and independently download its repeated results", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000); // Two real sign-ins, persisted jobs and downloads.
  const run = Date.now();
  // The instance's configured username alphabet excludes digits.
  const suffix = String(run).replace(/\d/g, (digit) =>
    String.fromCharCode(97 + Number(digit)),
  );
  const firstUser = `reporting${suffix}a`;
  const secondUser = `reporting${suffix}b`;
  const reportName = `Shared reporting ${run}`;
  await createReportUsers(page, [firstUser, secondUser]);

  await signInAsReportUser(page, firstUser);
  await page.getByLabel("Date from", { exact: true }).fill("2026-05-05");
  await page.getByLabel("Date to", { exact: true }).fill("2026-05-05");
  await page.locator('label[for="reporting-field-patientName"]').click();
  await page
    .getByRole("button", { name: "Move Specimen ID up", exact: true })
    .click();
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await page.getByLabel("Report name", { exact: true }).fill(reportName);
  await page
    .getByRole("button", { name: "Save shared report", exact: true })
    .click();
  await expect(
    page.getByText(`Saved as ${reportName}.`, { exact: true }),
  ).toBeVisible();
  const original = await downloadReport(page, 2);
  expect(original.headers.slice(0, 2)).toEqual([
    "Specimen ID",
    "Accession Number",
  ]);
  expect(
    original.records.map(
      (row) => row[original.headers.indexOf("Patient Name")],
    ),
  ).toEqual(["Synthetic Reporting Fixture", "Synthetic Reporting Fixture"]);
  expect(
    original.records.map((row) => row[original.headers.indexOf("Viral Load")]),
  ).toEqual(["450", "450"]);

  await signInAsReportUser(page, secondUser);
  await page
    .getByRole("button", { name: "Shared reports", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "Search shared reports",
    exact: true,
  });
  await search.fill(reportName);
  const card = page.getByRole("article", { name: reportName, exact: true });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Date from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Date to", { exact: true })).toHaveValue("");
  await expect(
    page.getByText("Choose fresh dates before running this saved report.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Date from", { exact: true }).fill("2026-05-05");
  await page.getByLabel("Date to", { exact: true }).fill("2026-05-05");
  const reused = await downloadReport(page, 2);
  expect(reused).toEqual(original);

  await page
    .getByRole("button", { name: "Shared reports", exact: true })
    .click();
  await search.fill(reportName);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Delete shared report/ }).click();
  await page.getByRole("button", { name: /Delete$/, exact: false }).click();
  await expect(card).toBeHidden();
});
