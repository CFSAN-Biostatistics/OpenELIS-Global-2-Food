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
native-route browser workflows passed, plus authentication. These local results
alone do not establish public deployment or the remaining operational criteria.

Runtime configuration `7780ee2cd9` was subsequently deployed to Reporting UAT on
September 14. The public app logged one Spring root initialization and 457.170
seconds startup. Five public application workflows plus authentication and the
pinned-mock capture passed. A separate accelerated local expiry check also
verified unavailable expired downloads, removed files, retained history and an
unaffected existing download. Multi-instance crash isolation remains open.
Local large-volume and migration/rollback qualification now pass. See
[the current execution record](../../specs/479-reporting-mvp/execution.md) for
exact deployment identity, evidence and limits.

## Database upgrade and rollback

From the repository root:

```sh
mvn test -Dtest=ReportingMigrationRollbackTest,ReportingPersistenceTest
```

Two standalone PostgreSQL 14.4 containers initialize the full application
changelog before executing reporting rollback/reapplication. The fresh case
verifies migration registration, schema/indexes and idempotency. The populated
case covers 1,000 existing definitions, 100 shared definitions and 50,000 jobs
across all six states. Actual Liquibase recovery rollback retains every prior
job field and all definition fields, including request text, lineage, history
metadata and last editor. The five reported checks include three existing
ORM/persistence tests.

Recovery rollback removes its cleanup marker/index and reapplication starts
those markers empty. Full reporting rollback also removes the job table and
the report-definition last-editor column; it does not preserve dropped data.
See [the acceptance record](../../specs/479-reporting-mvp/quickstart.md#database-upgrade-and-rollback-qualification-2026-09-14)
for tested boundaries. This test never rolls back the running local application,
the shared test context or Reporting UAT. It changes no deployed application code.

## 50,000-result workload

Use the disposable local stack with the single-application overlay and the
existing May 5 repeat fixture. The runner requires loopback access, matching
Compose project labels, no active reporting jobs and a new evidence directory.
The idempotent synthetic fixture adds 5,001 specimens, 10,001 analyses and
50,000 results on May 7, including 10,000 repeats for one specimen. It refuses
an occupied date or incomplete fixture and deletes no existing records.

```sh
python3 -u projects/reporting-uat/qualify-workload.py \
  --base-url https://localhost:18485/api/OpenELIS-Global \
  --app-container reporting-mvp-iteration1-app-1 \
  --db-container reporting-mvp-iteration1-db-1 \
  --project reporting-mvp-iteration1 \
  --seed \
  --output /tmp/reporting-workload-evidence
```

It submits two large exports plus three routine exports, proves the sixth
concurrent submission is rejected, samples atomic job states and ordinary
authenticated reads, and verifies every downloaded cell against independent
expected values. Spreadsheet checks preserve repeated-value multiplicity;
detailed-list checks additionally require every distinct result identity. Both
layouts retain their own 30/90-minute turnaround values.

The runner locates the actual Java process, resets only its Linux
resident-memory peak counter, and samples current/peak resident memory. See
[Linux process-memory counters](https://docs.kernel.org/filesystems/proc.html).
It temporarily enables statement logging in the disposable PostgreSQL instance
using its existing administrator, captures cursor-fetch counts, then restores
the original setting and override state even on a failed check or ordinary
interrupt. Timings include that logging overhead. Cursor fetches provide runtime
evidence for the transactional 250-row streaming query; see
[PostgreSQL JDBC cursor behavior](https://jdbc.postgresql.org/documentation/query/).
The verifier may collect the downloaded CSV in memory; the measured memory is
the separate application process that generates it.

Run the focused browser check from `frontend/` while the qualified jobs are
still available in the queue:

```sh
BASE_URL=http://127.0.0.1:18489 \
REPORTING_WORKLOAD_RECEIPT=/tmp/reporting-workload-evidence/verified.json \
npm run pw:test -- playwright/tests/performance/core/reporting-workload.spec.ts \
  --project=core-performance --reporter=line \
  --output=/tmp/reporting-workload-browser
```

Both layouts are checked at desktop and phone widths for ready state, row count,
reload, horizontal overflow and actual browser download bytes against the
independently qualified receipt. Without an explicit receipt the workload tests
skip; they do not silently claim qualification against an unseeded environment.
Native Playwright `--list` and execution verify project registration. The
packaged project-validator currently omits `CORE_PERFORMANCE_TESTS` from the
constants it resolves. The test audit found semantic/test-ID selectors,
event/assertion waits, diagnostic capture and no forced interactions or fixed
timing gates.

The September 14 final run passed: 50,000 rows per layout in 46.1 seconds each,
1,501,904 KiB peak resident memory, 144 ordinary reads without failures, one
generating worker observed, five active jobs allowed and the sixth rejected.
Both large streams had 200 follow-up cursor fetches. A preceding run produced
identical files; nine writer tests and both browser workflows also pass. See
[the measurement record](../../specs/479-reporting-mvp/quickstart.md#recorded-50000-result-run-2026-09-14)
for exact hashes, environment and limits. This is local qualification; the
public application and its synthetic fixture set remain unchanged.
