# Reporting UAT runtime qualification

These tools apply to the isolated reporting deployment. They do not change the
shared OpenELIS image or other deployments.

## Single application and native API path

The inspected image declares `/api/OpenELIS-Global/` explicitly in Tomcat while
also discovering `OpenELIS-Global.war` automatically. This loads the same
application a second time at `/OpenELIS-Global`. A controlled runtime probe
observed two generating exports in one container, contrary to the reporting
plan's one-worker limit.

Prepare a versioned overlay from the selected image's actual `server.xml`:

```sh
python3 projects/reporting-uat/prepare-server-config.py original-server.xml release/server.xml
python3 projects/reporting-uat/prepare-proxy-config.py original-nginx.conf release/nginx.conf
```

The first tool disables automatic discovery and startup discovery, preserving
the existing explicit API contexts and all unrelated settings. This follows
[Tomcat's guidance for explicit context paths](https://tomcat.apache.org/tomcat-10.1-doc/config/context).
Mount the generated file read-only at `/usr/local/tomcat/conf/server.xml` in the
reporting app. The second tool removes the proxy's URI replacement so that
`/api/OpenELIS-Global/...` reaches that same native path, including its query
string. It preserves the existing upstream, headers and other locations. See
[nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Keep original configuration, application artifacts, database and report volumes.
Generate the overlay on the deployment host; whole server configurations need
not be copied into this repository. Validate nginx configuration before
switching the reporting app and proxy together. A loopback frontend preview must
likewise preserve `/api`, instead of removing it. Verify native session/login,
real CSV downloads, retry/re-run, browser navigation and the review overlay
after switching.

## Process interruption

Run this on the disposable local fixture stack, with no active reporting jobs.
The scripts require loopback API URLs and matching Docker Compose project
labels. The fixture is the May 5, 2026 `REPORTING-MVP-REPEAT` specimen: test 174
has two distinct Viral Load results, both 450. The known development login can
be overridden with `TEST_USER` and `TEST_PASS`.

```sh
python3 projects/reporting-uat/interrupt-worker.py \
  --base-url https://localhost:18485/api/OpenELIS-Global \
  --app-container reporting-mvp-iteration1-app-1 \
  --db-container reporting-mvp-iteration1-db-1 \
  --project reporting-mvp-iteration1 \
  --output /tmp/reporting-restart-evidence
```

This creates and checks a completed CSV, briefly stalls result reads in the
disposable database, submits three real jobs and observes generating/queued
states. It verifies incomplete downloads are rejected, then kills only the app
process. A bounded database transaction is released in `finally`; no specimen or
result data is rewritten. The output captures process termination, persisted job
states and existing partial files. The app remains stopped for the operator to
restart with the intended versioned configuration.

Start the same application with the retained database/output volumes, then run:

```sh
python3 projects/reporting-uat/verify-restart.py /tmp/reporting-restart-evidence/interruption.json \
  --base-url https://localhost:18485/api/OpenELIS-Global \
  --app-container reporting-mvp-iteration1-app-1 \
  --db-container reporting-mvp-iteration1-db-1 \
  --project reporting-mvp-iteration1
```

The verifier waits on that running container. A timeout is an observation limit,
not a reason to restart it. It requires unchanged completed CSV bytes, preserved
queued work, explicit interrupted failures, retained frozen requests, rejection
of incomplete downloads, removal of partial files and a linked retry with the
same independently expected CSV. Worker leases expire naturally; the test does
not alter their timestamps.

The September 14 local run killed two generating jobs and retained one queued
job. With the single-application overlay, both interrupted jobs failed visibly,
the queued job completed, old downloads were unchanged and retry succeeded. A
second controlled probe observed one generating job and two queued jobs. Tomcat
logged one Spring root initialization and 212.652 seconds total startup. Four
native-route browser workflows passed, plus authentication. These results do not
establish multi-instance crash isolation, retention, large-volume qualification
or public deployment; see the current execution record.
