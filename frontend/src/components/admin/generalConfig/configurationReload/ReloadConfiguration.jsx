import React, { useState } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Renew } from "@carbon/icons-react";

const ReloadConfiguration = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReload = () => {
    setLoading(true);
    setStatus(null);
    fetch("/api/OpenELIS-Global/rest/configuration/domains/reload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domains: ["test-sections", "tests", "sample-types", 
                  "dictionaries", "nce-types", "roles"],
        force: true,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.hasErrors ? "error" : "success");
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ padding: "1rem" }}>
      <Button
        kind="secondary"
        renderIcon={Renew}
        onClick={handleReload}
        disabled={loading}
      >
        {loading ? "Reloading…" : "Reload Configuration"}
      </Button>
      {status === "success" && (
        <InlineNotification
          kind="success"
          title="Reloaded successfully"
          subtitle={`at ${new Date().toLocaleTimeString()}`}
          style={{ marginTop: "1rem" }}
        />
      )}
      {status === "error" && (
        <InlineNotification
          kind="error"
          title="Reload failed"
          subtitle="Check server logs"
          style={{ marginTop: "1rem" }}
        />
      )}
    </div>
  );
};

export default ReloadConfiguration;
