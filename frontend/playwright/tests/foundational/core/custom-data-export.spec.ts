import { test, expect } from "../../../helpers/test-base";
import type { Page } from "@playwright/test";

// src/test/resources/fixtures/reporting-repeated-results.sql is loaded by the
// shared fixture loader. Its two equal readings have distinct result identities.
const accession = "REPORTING-MVP-REPEAT";

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

test("an empty period produces a header-only download and an explicit zero-row result", async ({
  page,
}) => {
  await openBuilder(page, "2026-05-06");
  const { records } = await downloadReport(page, 0);
  expect(records).toEqual([]);
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
