import { test, expect } from "../../../helpers/test-base";
import type { Locator, Page } from "@playwright/test";

// The shared fixture loader supplies these public synthetic terminal jobs. Their
// requests select the same two equal Viral Load readings as the routine UAT flow.
const failedId = "47900000-0000-4000-8000-000000000101";
const expiredId = "47900000-0000-4000-8000-000000000102";
const jobsPath = "/api/OpenELIS-Global/rest/reports/data-export/jobs";

let browserErrors: string[];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
});
test.afterEach(() => expect(browserErrors).toEqual([]));

async function openHistoricalJob(page: Page, id: string) {
  const loaded = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `${jobsPath}/${id}`,
  );
  await page.goto(`/CustomDataExport?view=queue&job=${id}`);
  const response = await loaded;
  expect(response.status()).toBe(200);
  const job = await response.json();
  await expect(
    page.getByRole("heading", { name: "My Report Queue", exact: true }),
  ).toBeVisible();
  // Job identity locates either a row on the current page or the separate
  // deep-link card when older records fall outside that page.
  const card = page.getByTestId(`reporting-job-${id}`);
  await expect(card).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  return { card, job };
}

async function downloadRepeatCsv(page: Page, link: Locator) {
  await expect(link).toBeVisible({ timeout: 20_000 });
  const completed = page.waitForEvent("download");
  await link.click();
  const download = await completed;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  // This independent fixture oracle checks BOM, ordered headers, both distinct
  // result occurrences and their equal values, including CSV record endings.
  expect(bytes.toString("utf8")).toBe(
    "\uFEFFAccession Number,Viral Load\r\n" +
      "REPORTING-MVP-REPEAT,450\r\n" +
      "REPORTING-MVP-REPEAT,450\r\n",
  );
  await test.info().attach("recovered-report.csv", {
    body: bytes,
    contentType: "text/csv",
  });
}

test("a failed report retries its frozen request and remains reachable after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { card, job: parent } = await openHistoricalJob(page, failedId);
  await expect(card).toContainText("Failed");
  await page.screenshot({
    path: test.info().outputPath("failed-queue-desktop.png"),
    fullPage: false,
  });

  const retried = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `${jobsPath}/${failedId}/retry`,
  );
  await card.getByRole("button", { name: "Retry", exact: true }).click();
  const response = await retried;
  expect(response.status()).toBe(202);
  const child = await response.json();
  expect(child.id).not.toBe(failedId);
  expect(child.parentId).toBe(failedId);
  expect(child.request).toEqual(parent.request);
  await expect(page).toHaveURL(new RegExp(`view=queue.*job=${child.id}`));
  await page.reload();
  const row = page.getByRole("row").filter({ hasText: child.id });
  await downloadRepeatCsv(
    page,
    row.getByRole("link", { name: "Download CSV", exact: true }),
  );
  await expect(row).toContainText("Ready");
  await page.screenshot({
    path: test.info().outputPath("retry-ready-desktop.png"),
    fullPage: false,
  });

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`job=${failedId}`));
  await expect(card).toContainText("Failed");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`job=${child.id}`));
  await expect(
    row.getByRole("link", { name: "Download CSV", exact: true }),
  ).toBeVisible();
});

test("an expired report retains its columns and filters but requests fresh dates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { card } = await openHistoricalJob(page, expiredId);
  await expect(card).toContainText("Expired");
  await expect(
    card.getByRole("link", { name: "Download CSV", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("expired-queue-narrow.png"),
    fullPage: false,
  });
  await card.getByRole("button", { name: "Re-run", exact: true }).click();
  await expect(page).toHaveURL(
    /view=builder&step=filters&type=SAMPLE_TESTING&layout=SPREADSHEET/,
  );
  await expect(
    page.getByText("Choose fresh dates before running this report.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Date from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Date to", { exact: true })).toHaveValue("");
  await page.getByLabel("Date from", { exact: true }).fill("2026-05-05");
  await page.getByLabel("Date to", { exact: true }).fill("2026-05-05");
  await page
    .getByRole("button", { name: "Next: Review & Submit", exact: true })
    .click();
  await expect(
    page
      .getByRole("list", { name: "CSV columns in order" })
      .getByRole("listitem"),
  ).toHaveText(["Accession Number", "Viral Load"]);
  await page.reload();
  await expect(page).toHaveURL(/step=review/);
  const submitted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === jobsPath &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Generate CSV", exact: true }).click();
  const response = await submitted;
  expect(response.status()).toBe(202);
  const child = await response.json();
  expect(child.id).not.toBe(expiredId);
  expect(child.request.filterSpec.testIds).toHaveLength(1);
  expect(child.request.filterSpec.dateFrom).toBe("2026-05-05");
  expect(child.request.filterSpec.dateTo).toBe("2026-05-05");
  const current = page.getByRole("region", { name: "Your current report" });
  await downloadRepeatCsv(
    page,
    current.getByRole("link", { name: "Download CSV", exact: true }),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("rerun-ready-narrow.png"),
    fullPage: false,
  });
});
