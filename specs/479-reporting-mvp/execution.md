# Reporting MVP Implementation and Deployment

The user authorized implementing the complete agreed MVP and deploying an
OpenELIS instance on the Catalyst server. Both milestones remain in scope.
Application implementation is in progress; deployment has not started.

## Acceptance-driven Iteration 1

Outcome: select instance-configured Sample & Testing columns in native Reports,
generate a persisted job and download both layouts without losing repeated
results. Do not close this iteration until browser downloads agree with the
fixture records. Unit tests alone do not complete it.

Current evidence on 2026-09-13:

- Three source integration tests pass, including the actual source writing
  both layouts from two identical readings with distinct identities.
- Three Carbon component tests pass: selecting/reordering columns, retaining
  the draft and request identity after rejected submission, and retaining each
  layout's columns and dates through queue navigation.
- The backend packages and frontend builds. The real worker now completes
  browser-submitted jobs, and browser-triggered downloads pass content checks.
- The isolated local test database successfully applied the reporting migration.
  Public Catalyst seed scripts reproduced the manifest's 96 synthetic patients,
  1,152 results and nine test types. A separate reporting fixture adds one
  synthetic patient/specimen with two independent finalized readings of 450.
- Three focused browser tests are registered in `core-app` for repeat
  preservation, distinct detailed-result identities and zero-row downloads.
  Their fixture is part of the existing test fixture loader. On 2026-09-13 at
  19:36 UTC, all three plus native login passed against the running local app
  (four checks in 41 seconds). The checks assert actual downloaded bytes,
  UTF-8 BOM, the exact previewed column order, both identical 450 readings,
  distinct detailed result IDs and header-only output for an empty period.
  Evidence: `/private/tmp/reporting-iteration1-browser-ready.log`.

This proves the first complete local builder-to-download increment. Remaining
Sample & Testing acceptance includes entry through the Reports menu, broader
field coverage (including turnaround measures and additional questions),
configuration variation, date/status boundary cases, draft validation and
source/database workload qualification. It does not complete M1 or deployment.

## Acceptance-driven Iteration 2

Outcome: enter Custom Data Export through the native Reports menu, reject
invalid periods before submission and restore a reviewed draft after a queue
visit, navigation and full page reload.

Current evidence on 2026-09-13:

- Five focused component checks pass for dynamic selection and ordering, both
  layouts, inline download, retained choices after a rejected submission,
  inclusive 90-day validation and reviewed-draft restoration.
- The native menu migration was applied to the isolated database. The current
  menu API returned Custom Data Export under Reports, and a browser user entered
  the builder through that menu.
- Two focused browser checks (authentication plus the workflow) passed in 18.8
  seconds. They proved reversed and 91-day periods are rejected, an inclusive
  90-day period is accepted, and review state, dates and ordered columns survive
  a queue visit and full reload.
- The current frontend build passes. The reviewed builder screenshot is retained
  in the Playwright result for the workflow.

This completes the local navigation, period-validation and session-draft
increment. Shared definitions, wider Sample & Testing field coverage, access
cases and complete queue behavior remain open.

## Acceptance-driven Iteration 3

Outcome: create and reuse instance-shared report definitions without saving a
date range, support confirmed update/copy/delete, and reject a genuinely stale
edit without losing the draft.

Current evidence on 2026-09-13:

- Shared definitions use the existing `report_definition` store under the
  distinct `CSV_SAVED` type. The registered Liquibase change adds updater
  attribution and applied successfully to the isolated database.
- Four service checks cover date-free creation, shared searchable listing,
  optimistic update conflicts and versioned soft deletion. Eight component
  checks cover the builder plus save/reopen/fresh-date/conflict/copy/delete
  behavior.
- The first real-browser attempt exposed that an update response must carry the
  database's post-flush version. A later attempt exposed a cached-card race that
  could submit the pre-update version to delete. Both defects were fixed without
  weakening conflict detection.
- A clean qualification run passed authentication plus all five reporting
  scenarios in 26.2 seconds against the packaged backend, current production
  frontend bundle and real isolated PostgreSQL database. The shared scenario
  created a named report, reopened it with blank dates, updated it, saved a copy
  and deleted both definitions.
- All 29 focused reporting backend checks pass, including database migrations,
  source mapping, repeated results, persistence and CSV behavior. The production
  frontend build and all eight focused component checks pass.

This completes the local shared-definition increment. Wider Sample & Testing
field coverage, access/admission cases and the M2 source/recovery behavior remain
open; no deployment or human UAT conclusion follows from this local result.

## M1 Acceptance Checkpoint

The implementation is reviewable as a foundation, but M1 is not complete. The
following ledger is the gate for continued work:

| Capability                                             | Current evidence                                                                                                  | State                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Native Reports entry                                   | Menu migration plus browser navigation                                                                            | Proven locally                                                        |
| Instance-derived tests/components                      | Catalog reads active configured records; source/configuration tests pass                                          | Partially proven; second instance configuration still required        |
| Spreadsheet download                                   | Browser compares downloaded bytes with two independent identical fixture readings                                 | Proven locally for current fixture                                    |
| Detailed-list download                                 | Browser compares two distinct result identities and values                                                        | Proven locally for current fixture                                    |
| CSV contract and streaming                             | Nine focused writer checks include BOM, escaping, nulls, ordering, zero rows, repeats and 50,000 streamed records | Proven at formatter level; database workload remains open             |
| Date validation and retained draft                     | Component and browser checks cover the inclusive limit, invalid ranges, queue visit and reload                    | Proven locally                                                        |
| Immutable jobs and owner submission identity           | Database persistence checks pass                                                                                  | Proven at persistence level; API concurrency/access cases remain open |
| Shared saved reports                                   | Service, component and real-browser create/reopen/update/copy/delete checks; dates are omitted and stale edits return 409 | Proven locally; second-user deployed UAT remains open                 |
| Wider Sample & Testing fields and additional questions | Core sample, patient and result fields exist                                                                      | Open; mapping oracles and browser comparisons incomplete              |
| Queue lifecycle and recovery                           | Submit, generate, poll and download work                                                                          | Open; retry, cancel, recovery, expiry and audit remain M2             |
| Referral and Non-Conformance definitions               | Not implemented                                                                                                   | Open in M2                                                            |
| Catalyst deployment                                    | Server inspected only                                                                                             | Open                                                                  |

Do not expand to M2 or describe M1 as complete until the M1-open rows required
by T002, T004-T006, T008-T010 and T012-T017 have passed. A draft M1 PR is the
review checkpoint; it does not change or narrow the accepted scope.

The Catalyst manifest explicitly declares the cohort synthetic. No evidence of
private clinical data was identified. An automatic review rejected a proposed
whole-database copy before execution; the public seed scripts reproduced the
cohort directly in the isolated database.

Iteration discipline: after two attempts with neither verified progress nor new
diagnostic evidence, stop implementation and reassess. Pause affected work for
ambiguities that change scope, data meaning, acceptance or deployment effects.
Never change acceptance criteria to make a check pass. Record the concrete
failure, evidence and next step before resuming.

Checkpoint discipline: do not begin another implementation increment while a
verified user-visible increment remains uncommitted or its acceptance ledger is
stale. The first working M1 slice requires a draft implementation PR. Later
commits update that same PR; they do not create a new scope or replace the M1
completion gate.

## Current Source

- Specification PR:
  [#4291](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4291), commit
  `02ebf606d9`, based on `e57a53399c`. The development baseline was refreshed
  and unchanged at implementation start.
- Implementation branch: `feat/479-ogc-479-reporting-mvp-m1-result-export`.
- The primary checkout has unrelated changes and was not used for
  implementation.
- The specification and clarification check-ins are complete. No further
  approval is needed to implement the agreed scope or perform the requested
  deployment. Merge authorization is separate.

## Implemented Foundation

- Two CSV layouts with captured headers, correct escaping/BOM/nulls, specimen
  grouping and preservation of independent repeated values. Actual event groups
  can align values; unrelated repeats remain separate without cross-products.
- Streaming writer retains at most the selected fields' pending first readings,
  rather than all repeats of a specimen.
- Inclusive date validation and laboratory-timezone query boundaries.
- Immutable job request persistence, submission uniqueness per owner, lifecycle
  transitions, ORM registration and a Liquibase migration with rollback.
- Typed source-configuration parsing, an instance-aware catalog and a shared
  source interface now connect to Sample & Testing execution. Shared
  saved-report editing is implemented; deployment configuration loading remains
  pending.
- Existing `ReportDefinition` storage will hold source definitions and shared
  saved reports, using distinct CSV report types. Its current patient-report
  consumer selects `PATIENT` explicitly. Two initially drafted new definition
  entities were removed before any migration or commit.

## Validation Recorded So Far

| Check                         | Observed result                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specification checks          | Eight Markdown files, 36 local/source links, JSON example and requirement/task consistency passed                                                                                                          |
| Baseline backend              | Java 21 build/install passed with both test-skip flags; first cache installation attempt needed normal filesystem permission                                                                               |
| CSV writer and dates          | 12 focused JUnit tests passed; the repeat workload writes 50,000 rows incrementally                                                                                                                        |
| ORM and lifecycle             | Three tests passed; factory startup is under five seconds and needs no database                                                                                                                            |
| Source configuration          | Four tests passed, including an extra definition over the same supported source                                                                                                                            |
| PostgreSQL job persistence    | Three tests passed against a disposable database using the repository test setup; migration `479-001-reporting-export-jobs` ran successfully                                                               |
| Stored source relationships   | Two tests passed: configured component identity survives rename and repeated values; collection dates distinguish specimens under one accession                                                            |
| Combined reporting validation | All 29 focused Java tests passed on 2026-09-13, including source, saved-definition and database checks; JaCoCo report generated                                                                            |
| Frontend component/build      | Eight focused component checks and the production frontend build passed on 2026-09-13                                                                                                                       |
| Focused browser acceptance    | Six Playwright checks passed in 26.2 seconds against the packaged app on 2026-09-13: sign-in, both CSV layouts, repeated values, zero-row output, date validation, queue/draft restoration and shared reports |
| Formatting                    | Feature-scoped Java formatting passed; frontend dependencies installed from the lockfile                                                                                                                   |

The numeric streaming test is a formatter test, not the complete source/database
workload qualification. Database checks prove immutable requests, per-owner
submission uniqueness and lifecycle persistence; they do not yet prove worker
concurrency, shared-definition edits or browser workflows. Migration rollback
and production-volume qualification remain pending.

The focused JaCoCo report currently measures 1,980 of 4,161 instructions in the
new reporting packages, or 47.6%. This is below the feature coverage goal.
Service, controller, access and worker tests remain part of T004, T005 and T012;
the draft checkpoint must not be presented as coverage-complete.

## Progress and Drift Check

The 2026-09-13 status audit found execution drift: too much time went into
isolated foundations and test environment setup before the first usable
workflow. The unsupported privacy detour compounded that delay. A second audit
found that the drift had been reported without completing the corrective
checkpoint: implementation continued while its changes remained uncommitted and
the acceptance ledger lagged behind the passing browser workflows.

The correction is to freeze new scope, reconcile current acceptance evidence,
run the focused backend, component, build and browser checks, review the whole
change and publish a draft M1 PR before implementation continues. The accepted
scope remains intact. Specification PR checks do not validate this code.

## Server Inspection

Read-only inspection on 2026-09-13 confirmed SSH access to
`catalyst.openelis-global.org`. The host runs existing Catalyst, OpenELIS, HAPI
FHIR and separate CSiM containers. At inspection it had approximately 16 GB free
disk and 14 GB available memory; refresh capacity before deploying.

The existing OpenELIS container is `catalyst-mvp-isolated-openelis-app`, with
backend port `127.0.0.1:28443`; its database is
`catalyst-mvp-isolated-openelis-db`. Their compose configuration lives under
`/home/ubuntu/catalyst-release/targets/catalyst`, with an override under
`/home/ubuntu/catalyst-release/compose`. The public proxy is
`catalyst-demo-caddy-1`, configured by
`/home/ubuntu/catalyst-demo/targets/catalyst/Caddyfile`.

The inspected public routes currently serve Catalyst and dashboards; no public
OpenELIS route was found. The final OpenELIS URL and deployment arrangement must
be verified against the actual frontend/proxy configuration. Existing demo data,
services and unrelated CSiM deployments must be preserved.

## UAT Readiness Check

The MVP is not yet deployed for UAT. On 2026-09-13,
`reporting.catalyst.openelis-global.org` resolved to the Catalyst host through
the existing wildcard DNS, but the public Caddy configuration had no OpenELIS
reporting route. The existing OpenELIS backend remained internal on
`127.0.0.1:28443` and its database was part of the Catalyst stack.

The established `DIGI-UW/openelis-review-tooling` service is reachable and its
server-side Grist authoring identity owns the `UAT Checklists` document. Neither
`reporting` nor `catalyst` existed as a public checklist slug: both returned
404 from the live read service. The review repository supports integration with
an existing deployment, stable story/step keys, verified target metadata and
authenticated submissions. It currently has no `reporting` backend mapping.

FR-023, SC-010, T032–T038 and `uat.md` now make the actual delivery gate
explicit: complete the MVP, deploy an exact qualified revision at the reporting
hostname, seed stable public synthetic fixtures, pass deployed browser/CSV
preflight, author the four critical stories in Grist, inject the overlay and
verify a revision-bound review handoff. Human acceptance remains pending until
a reviewer returns a report.

## Remaining Delivery Work

- Complete T002 and M1: prove current result/component/value and
  configured-field mappings, bounded access/admission behavior and the remaining
  native builder cases; verify real downloaded CSVs and M1 review evidence.
- Complete M2 through the same engine: referral/non-conformance mappings and
  definitions, retry/cancel/restart/expiry, full source/recovery/workload tests
  and the second milestone PR.
- D001: Choose and validate the public OpenELIS route; prepare an isolated or
  safely upgradeable deployment using actual server configuration and capacity.
- D002: Build reproducible backend/frontend artifacts from the tested revisions;
  prepare persistent storage, configuration, backups and rollback procedure.
- D003: Deploy the requested OpenELIS instance without disturbing existing data
  and services; verify backend readiness and browser sign-in.
- D004: Run all three reporting types, both Sample & Testing layouts, shared
  report reuse and queue/recovery checks against actual records on the deployed
  instance; compare downloaded CSV contents and record the final URL/revisions.

Do not mark the goal complete until the full functional specification and the
requested deployment are verified. Hindsight retrieval and initiative capture
were attempted but timed out; no retrieved memory was used as current evidence.
