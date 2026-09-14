import React from "react";
import { render, screen } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { IntlProvider } from "react-intl";
import { vi, describe, it, expect, beforeEach } from "vitest";
import messages from "../../languages/en.json";

const { addNotification, generateCompliancePdf, getFromOpenElisServer } =
  vi.hoisted(() => ({
    addNotification: vi.fn(),
    generateCompliancePdf: vi.fn(),
    getFromOpenElisServer: vi.fn(),
  }));

vi.mock("../utils/Utils", () => ({
  getFromOpenElisServer,
  postToOpenElisServer: vi.fn(),
  postToOpenElisServerFullResponse: vi.fn(),
}));
vi.mock("./utils/compliancePdfGenerator", () => ({ generateCompliancePdf }));
vi.mock("@carbon/charts-react", () => ({
  LineChart: () => <div data-testid="line-chart" />,
  SimpleBarChart: () => <div data-testid="bar-chart" />,
}));
vi.mock("../layout/Layout", () => ({
  NotificationContext: React.createContext({
    notificationVisible: false,
    setNotificationVisible: vi.fn(),
    addNotification,
  }),
}));
vi.mock("../common/CustomNotification", () => ({
  AlertDialog: () => <div data-testid="alert-dialog" />,
  NotificationKinds: { error: "error", success: "success" },
}));

import EnvironmentalDashboard from "./EnvironmentalDashboard";

// Every screen fetch resolves to something harmless; individual tests override
// the one call they care about.
const stubServer = () => {
  getFromOpenElisServer.mockImplementation((url, cb) => {
    if (url.includes("configuration-properties")) {
      cb({ BANNER_TEXT: "Test LIMS" });
    } else if (url.includes("summary")) {
      cb({ totalOrders: 0, complianceRate: 0, totalExceedances: 0 });
    } else {
      cb([]);
    }
  });
};

const renderDashboard = () =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <EnvironmentalDashboard />
    </IntlProvider>,
  );

const clickExport = async () => {
  const button = await screen.findByRole("button", { name: /export pdf/i });
  await userEvent.click(button);
};

describe("EnvironmentalDashboard export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubServer();
  });

  // OGC-1160: the export reported failure as silence. `handleExport` was
  // try/finally with no catch, so a throw cleared the spinner and did nothing
  // else — no file, no message, indistinguishable from a dead button.
  it("tells the user when the export fails", async () => {
    generateCompliancePdf.mockRejectedValue(new Error("pdf boom"));
    renderDashboard();
    await clickExport();

    await waitFor(() => expect(addNotification).toHaveBeenCalled());
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "error",
        message: "The report could not be exported. Please try again.",
      }),
    );
  });

  it("stays quiet when the export succeeds", async () => {
    generateCompliancePdf.mockResolvedValue(undefined);
    renderDashboard();
    await clickExport();

    await waitFor(() => expect(generateCompliancePdf).toHaveBeenCalled());
    expect(addNotification).not.toHaveBeenCalled();
  });

  // The old header fetch hit /rest/site-information, which this build does not
  // expose (404). configuration-properties is what the banner already reads,
  // and it is not ADMIN-gated the way /rest/SiteInformation is.
  it("reads the lab name from an endpoint that exists", async () => {
    generateCompliancePdf.mockResolvedValue(undefined);
    renderDashboard();
    await clickExport();

    await waitFor(() => expect(generateCompliancePdf).toHaveBeenCalled());
    const requested = getFromOpenElisServer.mock.calls.map(([url]) => url);
    expect(requested).not.toContain("/rest/site-information?name=siteName");
    expect(generateCompliancePdf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ labName: "Test LIMS" }),
    );
  });

  // A header line must never be the reason an export never finishes: if the
  // callback never fires, the wait is bounded and the export proceeds.
  it("exports with a fallback name when the lab name never arrives", async () => {
    vi.useFakeTimers();
    generateCompliancePdf.mockResolvedValue(undefined);
    getFromOpenElisServer.mockImplementation((url, cb) => {
      if (url.includes("configuration-properties")) {
        return; // callback never fires
      }
      cb(url.includes("summary") ? { totalOrders: 0 } : []);
    });

    renderDashboard();
    const button = await screen.findByRole("button", { name: /export pdf/i });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(button);

    await vi.advanceTimersByTimeAsync(10000);
    await vi.waitFor(() => expect(generateCompliancePdf).toHaveBeenCalled());
    expect(generateCompliancePdf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ labName: "OpenELIS Lab" }),
    );
    vi.useRealTimers();
  });

  // OGC-1160 reproduction: a browser with site data blocked throws from
  // localStorage, and getFromOpenElisServer reads it while building the fetch
  // options -- so the throw lands before any request is issued. That is the
  // QA signature exactly: enabled button, zero network activity, no feedback.
  it("reports the failure when the request throws before it is sent", async () => {
    getFromOpenElisServer.mockImplementation((url, cb) => {
      if (url.includes("configuration-properties")) {
        throw new DOMException(
          "Access is denied for this document.",
          "SecurityError",
        );
      }
      cb(url.includes("summary") ? { totalOrders: 0 } : []);
    });

    renderDashboard();
    await clickExport();

    await waitFor(() => expect(addNotification).toHaveBeenCalled());
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "error" }),
    );
    expect(generateCompliancePdf).not.toHaveBeenCalled();
  });
});
