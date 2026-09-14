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
const field = (id, label, group = "sample") => ({ id, label, group });
const catalog = (layout) => ({
  definition: source,
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
const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  headers: { get: () => "application/json" },
  json: async () => body,
});

beforeEach(() => {
  clearReportingDraft();
  requests = [];
  failSubmission = false;
  job = undefined;
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
