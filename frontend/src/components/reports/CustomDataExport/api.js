import { postToOpenElisServerFullResponse } from "../../utils/Utils";
import config from "../../../config.json";

export const reportingPath = "/rest/reports/data-export";
export const downloadUrl = (id) =>
  `${config.serverBaseUrl}${reportingPath}/jobs/${encodeURIComponent(id)}/download`;
export const submitReport = (request) =>
  new Promise((resolve, reject) => {
    postToOpenElisServerFullResponse(
      `${reportingPath}/jobs`,
      JSON.stringify(request),
      async (response) => {
        if (!response) {
          reject(new Error("reporting.networkError"));
          return;
        }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          reject(new Error(body.code || "reporting.requestError"));
          return;
        }
        resolve(body);
      },
    );
  });
