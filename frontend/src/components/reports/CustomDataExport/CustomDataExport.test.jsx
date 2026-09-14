import React from "react";
import {
  render,
  screen,
  fireEvent,
  within,
  cleanup,
} from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi, beforeEach, afterEach, test, expect } from "vitest";
import messages from "../../../languages/en.json";
import UserSessionDetailsContext from "../../../UserSessionDetailsContext";
import { createQueryClient } from "../../utils/queryClient";
import CustomDataExport, { clearReportingDraft } from "./CustomDataExport";

const source = {
  id: "SAMPLE_TESTING",
  label: "Sample & Testing",
  layouts: ["SPREADSHEET", "RESULT_LIST"],
};
let configuredFilters;
const field = (id, label, group = "sample") => ({ id, label, group });
const catalog = (layout) => ({
  definition: { ...source, filters: configuredFilters },
  variables: [
    field("accessionNumber", "Accession Number"),
    field("test:1", "Hemoglobin", "tests"),
    field("test:2", "White Cell Count", "tests"),
    field("resultValue", "Result Value", "result"),
  ],
  defaultColumns:
    layout === "SPREADSHEET"
      ? ["accessionNumber", "test:1"]
      : ["accessionNumber", "resultValue"],
  labSections: [{ id: "1", label: "Hematology" }],
  tests: [{ id: "1", label: "Hemoglobin" }],
  statuses: [{ id: "FINALIZED", label: "Finalized" }],
  maxDays: 90,
  timezone: "UTC",
});
let requests;
let failSubmission;
let job;
let savedReports;
let savedMutations;
let failSavedUpdate;
let deletedSaved;
const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  headers: { get: () => "application/json" },
  json: async () => body,
});

beforeEach(() => {
  configuredFilters = ["labSectionIds", "testIds", "resultStatuses"];
  clearReportingDraft();
  requests = [];
  failSubmission = false;
  failSavedUpdate = false;
  job = undefined;
  savedReports = [];
  savedMutations = [];
  deletedSaved = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options = {}) => {
      if (url.includes("/report-types")) return json([source]);
      if (url.includes("/variables"))
        return json(
          catalog(
            url.includes("layout=RESULT_LIST") ? "RESULT_LIST" : "SPREADSHEET",
          ),
        );
      if (
        url.includes("/saved-configs") &&
        (!options.method || options.method === "GET")
      )
        return json({ reports: savedReports, hasMore: false, page: 0 });
      if (url.includes("/saved-configs") && options.method === "POST") {
        const body = JSON.parse(options.body);
        savedMutations.push(body);
        const created = {
          id: `saved-${savedReports.length + 1}`,
          name: body.name,
          version: "2026-09-13T20:00:00Z",
          createdBy: "1",
          updatedBy: "1",
          definition: body.definition,
        };
        savedReports.push(created);
        return json(created, 201);
      }
      if (url.includes("/saved-configs/") && options.method === "PUT") {
        const body = JSON.parse(options.body);
        savedMutations.push(body);
        if (failSavedUpdate)
          return json({ code: "reporting.saved.changed" }, 409);
        const updated = {
          ...savedReports[0],
          ...body,
          version: "next-version",
        };
        savedReports[0] = updated;
        return json(updated);
      }
      if (url.includes("/saved-configs/") && options.method === "DELETE") {
        const id = decodeURIComponent(
          url.split("/saved-configs/")[1].split("?")[0],
        );
        deletedSaved.push(id);
        savedReports = savedReports.filter((saved) => saved.id !== id);
        return json({}, 204);
      }
      if (options.method === "POST") {
        const body = JSON.parse(options.body);
        requests.push(body);
        if (failSubmission) return json({ code: "reporting.jobs.limit" }, 429);
        job = {
          id: "job-1",
          state: "READY",
          rowCount: 2,
          request: { definition: source, filterSpec: body.filterSpec },
        };
        return json(job, 202);
      }
      if (url.includes("/jobs/job-1")) return json(job);
      return json({ jobs: job ? [job] : [], hasMore: false, activeCount: 0 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <IntlProvider locale="en" messages={messages}>
          <UserSessionDetailsContext.Provider
            value={{ userSessionDetails: { userId: "1" } }}
          >
            <CustomDataExport />
          </UserSessionDetailsContext.Provider>
        </IntlProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
async function period() {
  await screen.findByLabelText("Date from");
  fireEvent.change(screen.getByLabelText("Date from"), {
    target: { value: "2026-08-01" },
  });
  fireEvent.change(screen.getByLabelText("Date to"), {
    target: { value: "2026-08-31" },
  });
}

test("configured selection and reordered preview are submitted, then a download appears in place", async () => {
  open();
  await period();
  fireEvent.click(
    screen.getByLabelText("White Cell Count", { selector: "input" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Move White Cell Count up" }),
  );
  const preview = screen.getByRole("region", { name: "CSV header preview" });
  expect(
    within(preview)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent),
  ).toEqual(["Accession Number", "White Cell Count", "Hemoglobin"]);
  fireEvent.click(screen.getByRole("button", { name: "Review report" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate CSV" }));
  expect(
    await screen.findByRole("link", { name: "Download CSV" }),
  ).toHaveAttribute("href", expect.stringContaining("/jobs/job-1/download"));
  expect(requests[0].selectedVariables).toEqual([
    "accessionNumber",
    "test:2",
    "test:1",
  ]);
  expect(requests[0].filterSpec.dateFrom).toBe("2026-08-01");
});

test("failed submission retains choices and retries with the same request identity", async () => {
  failSubmission = true;
  open();
  await period();
  fireEvent.click(screen.getByRole("button", { name: "Review report" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate CSV" }));
  await screen.findByText(messages["reporting.jobs.limit"]);
  failSubmission = false;
  fireEvent.click(screen.getByRole("button", { name: "Generate CSV" }));
  await screen.findByRole("link", { name: "Download CSV" });
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
});

test("switching layouts and visiting the queue retains each layout's columns and the period", async () => {
  open();
  await period();
  fireEvent.click(
    screen.getByLabelText("White Cell Count", { selector: "input" }),
  );
  fireEvent.click(screen.getByRole("combobox", { name: "CSV layout" }));
  fireEvent.click(
    screen.getByRole("option", { name: "Detailed list — results in rows" }),
  );
  expect(
    await screen.findByRole("columnheader", { name: "Result Value" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "My Report Queue" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Back to report builder" }),
  );
  expect(screen.getByLabelText("Date from")).toHaveValue("2026-08-01");
  fireEvent.click(screen.getByRole("combobox", { name: "CSV layout" }));
  fireEvent.click(
    screen.getByRole("option", { name: "Spreadsheet — tests in columns" }),
  );
  expect(
    await screen.findByRole("columnheader", { name: "White Cell Count" }),
  ).toBeInTheDocument();
});

test("missing, reversed and excessive dates are explained before submitting", async () => {
  open();
  const from = await screen.findByLabelText("Date from");
  const to = screen.getByLabelText("Date to");
  fireEvent(from, new FocusEvent("focusout", { bubbles: true }));
  expect(screen.getByText("Choose a start date.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review report" })).toBeDisabled();
  fireEvent.change(from, { target: { value: "2026-01-01" } });
  fireEvent.change(to, { target: { value: "2025-12-31" } });
  expect(
    screen.getByText("End date must be on or after the start date."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review report" })).toBeDisabled();
  fireEvent.change(to, { target: { value: "2026-04-01" } });
  expect(
    screen.getByText(
      "Choose a period of 90 days or fewer, including both dates.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review report" })).toBeDisabled();
  fireEvent.change(to, { target: { value: "2026-03-31" } });
  expect(screen.getByRole("button", { name: "Review report" })).toBeEnabled();
  expect(requests).toHaveLength(0);
});

test("returning to a draft restores its review step and signing out clears it", async () => {
  const first = open();
  await period();
  fireEvent.click(screen.getByRole("button", { name: "Review report" }));
  first.unmount();
  const returned = open();
  expect(
    await screen.findByRole("button", { name: "Generate CSV" }),
  ).toBeEnabled();
  expect(screen.getByText("2026-08-01 – 2026-08-31")).toBeInTheDocument();
  returned.unmount();
  clearReportingDraft();
  open();
  expect(await screen.findByLabelText("Date from")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Review report" })).toBeDisabled();
});

test("a shared report saves choices without dates and reopening requires fresh dates", async () => {
  open();
  await period();
  fireEvent.click(
    screen.getByLabelText("White Cell Count", { selector: "input" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save report" }));
  fireEvent.change(screen.getByLabelText("Report name"), {
    target: { value: "Monthly hematology" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save shared report" }));
  expect(
    await screen.findByText("Saved as Monthly hematology."),
  ).toBeInTheDocument();
  expect(savedMutations[0].definition.selectedVariables).toEqual([
    "accessionNumber",
    "test:1",
    "test:2",
  ]);
  expect(JSON.stringify(savedMutations[0])).not.toContain("dateFrom");
  expect(JSON.stringify(savedMutations[0])).not.toContain("dateTo");

  fireEvent.click(screen.getByRole("button", { name: "Shared reports" }));
  const card = await screen.findByRole("article", {
    name: "Monthly hematology",
  });
  fireEvent.click(within(card).getByRole("button", { name: "Open" }));
  expect(await screen.findByLabelText("Date from")).toHaveValue("");
  expect(screen.getByLabelText("Date to")).toHaveValue("");
  expect(
    screen.getByText("Choose fresh dates before running this saved report."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "White Cell Count" }),
  ).toBeInTheDocument();
});

test("a stale shared-report update keeps the draft and explains the conflict", async () => {
  savedReports.push({
    id: "saved-1",
    name: "Monthly hematology",
    version: "old-version",
    createdBy: "1",
    updatedBy: "1",
    definition: {
      schemaVersion: 1,
      reportType: "SAMPLE_TESTING",
      layout: "SPREADSHEET",
      selectedVariables: ["accessionNumber", "test:1"],
      filters: {
        labSectionIds: [],
        testIds: [],
        resultStatuses: ["FINALIZED"],
      },
    },
  });
  failSavedUpdate = true;
  open();
  fireEvent.click(
    await screen.findByRole("button", { name: "Shared reports" }),
  );
  const card = await screen.findByRole("article", {
    name: "Monthly hematology",
  });
  fireEvent.click(within(card).getByRole("button", { name: "Open" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Update shared report" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  expect(
    await screen.findByText(messages["reporting.saved.changed"]),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Hemoglobin" }),
  ).toBeInTheDocument();
});

test("configured filters exclude unsupported restored choices from review, save, and generation", async () => {
  configuredFilters = ["labSectionIds"];
  savedReports.push({
    id: "saved-1",
    name: "Monthly hematology",
    version: "v1",
    definition: {
      schemaVersion: 1,
      reportType: "SAMPLE_TESTING",
      layout: "SPREADSHEET",
      selectedVariables: ["accessionNumber", "test:1"],
      filters: {
        labSectionIds: ["1"],
        testIds: ["2"],
        resultStatuses: ["CANCELED"],
      },
    },
  });
  open();
  fireEvent.click(
    await screen.findByRole("button", { name: "Shared reports" }),
  );
  const card = await screen.findByRole("article", {
    name: "Monthly hematology",
  });
  fireEvent.click(within(card).getByRole("button", { name: "Open" }));
  await period();
  expect(
    screen.getByRole("combobox", { name: /^Lab sections/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: /^Tests/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: /^Result statuses/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(
      "Some previous filters are unavailable for this report. Review the current filters before generating.",
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Update shared report" }));
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  await screen.findByText("Updated Monthly hematology.");
  expect(savedMutations.at(-1).definition.filters).toEqual({
    labSectionIds: ["1"],
    testIds: [],
    resultStatuses: [],
  });
  fireEvent.click(screen.getByRole("button", { name: "Review report" }));
  expect(
    screen.getByText("Hematology", { selector: "dd" }),
  ).toBeInTheDocument();
  expect(screen.getByText("All", { selector: "dd" })).toBeInTheDocument();
  expect(screen.getByText("Finalized", { selector: "dd" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Generate CSV" }));
  await screen.findByRole("link", { name: "Download CSV" });
  expect(requests[0].filterSpec).toEqual({
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
    labSectionIds: ["1"],
    testIds: [],
    resultStatuses: [],
  });
});

test("a shared report can be copied and deleted without changing generated jobs", async () => {
  savedReports.push({
    id: "saved-1",
    name: "Monthly hematology",
    version: "old-version",
    createdBy: "1",
    updatedBy: "1",
    definition: {
      schemaVersion: 1,
      reportType: "SAMPLE_TESTING",
      layout: "SPREADSHEET",
      selectedVariables: ["accessionNumber", "test:1"],
      filters: {
        labSectionIds: [],
        testIds: [],
        resultStatuses: ["FINALIZED"],
      },
    },
  });
  open();
  fireEvent.click(
    await screen.findByRole("button", { name: "Shared reports" }),
  );
  let card = await screen.findByRole("article", { name: "Monthly hematology" });
  fireEvent.click(within(card).getByRole("button", { name: "Save a copy" }));
  expect(screen.getByLabelText("Report name")).toHaveValue(
    "Copy of Monthly hematology",
  );
  fireEvent.click(screen.getByRole("button", { name: "Save shared report" }));
  expect(
    await screen.findByText("Saved as Copy of Monthly hematology."),
  ).toBeInTheDocument();
  expect(savedMutations.at(-1).expectedVersion).toBeUndefined();

  fireEvent.click(screen.getByRole("button", { name: "Shared reports" }));
  card = await screen.findByRole("article", { name: "Monthly hematology" });
  fireEvent.click(
    within(card).getByRole("button", { name: /Delete shared report/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Delete$/ }));
  await vi.waitFor(() => expect(deletedSaved).toEqual(["saved-1"]));
  expect(requests).toHaveLength(0);
});
