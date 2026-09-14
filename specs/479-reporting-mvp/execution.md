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

## Acceptance-driven Iteration 4

Outcome: broaden Sample & Testing to the mock's routine reporting fields and
prove that configured questions, access checks and job admission use current
instance state.

Current evidence on 2026-09-13:

- Eight database-backed source checks pass. They cover linked common/patient
  fields, independent repeated
  results in both layouts, specimen-bound dates, configured-component identity
  through a rename, corrected finalized results, the five turnaround intervals,
  received time, the ordered-test count, dictionary qualifiers, grouped
  multiselect values and verbatim free text.
- The source catalog now discovers described observation-history types from the
  instance. A database-backed check creates a new question without changing
  reporting code, exports literal, dictionary and localized-key answers, joins
  multiple answers, renames it and proves that the stable field identity is
  retained while the current label is shown. A separate check configures and
  exports a second test/component arrangement through the same source.
- Three access checks cover ordinary report access, missing/inactive users and
  requested laboratory scope. Five job checks cover immutable accepted
  requests, idempotent submission, changed-request conflicts, configured active
  job limits, owner-only download and revoked-scope download denial.
- A four-case database check uses two simultaneous transactions at an active-job
  limit of one. The owner-row lock serializes them, yielding one accepted job and
  one 429 response; the submission uniqueness and immutable-request checks also
  remain green.

This is a verified backend increment. Browser comparison of the new columns and
ordinary-user access-negative cases remain required before M1 is complete.

Source review also identified two unproven combinations for the next increment:
the spreadsheet writer retains the first specimen record's attributes even
when later results have different turnaround times, and the question query
includes all observations matching the patient, including those attached to
other samples. The current single-result/single-sample field oracles do not
validate these combinations. Add explicit multi-result/multi-sample oracles and
resolve their output semantics before closing T010 or field acceptance. The
question-scope defect is resolved by Iteration 5 below; turnaround remains open.

## Acceptance-driven Iteration 5

Outcome: configured answers in each exported specimen row come from its own
order and specimen, including when another order belongs to the same patient.

Current evidence on 2026-09-13:

- The first fixture attempt exposed an existing constraint: observation history
  requires an order ID. Patient and specimen links are optional. The regression
  fixture was corrected to use valid stored relationships, without changing the
  application schema.
- The regression then reproduced the defect in actual CSV: both specimen rows
  contained the other specimen's answer and an answer from another order for the
  same patient.
- The source now selects the current order's answers and limits specimen-linked
  answers to the current specimen. Two regression checks cover exact CSV content
  in both layouts and an order with no linked patient.
- All 45 focused reporting backend tests pass in 47 seconds. The output is
  retained at `/private/tmp/reporting-answer-scope-green.log`; the reproduced
  failing assertion is in `/private/tmp/reporting-answer-scope-red.log`.
- The backend build/install and regenerated coverage report pass; build output
  is in `/private/tmp/reporting-answer-scope-build.log`. Both required
  formatters ran, with no frontend changes produced.

The turnaround ambiguity is paused for the user's decision: separate per-test
turnaround columns (recommended) or overall sample turnaround ending with the
last included test. The current first-record attribute behavior is not accepted
as correct. T010 and T011 remain open. No new browser or deployment validation
has been performed for this source correction.

## Acceptance-driven Iteration 6

Outcome: two ordinary report users independently generate the same report from
an instance-shared definition without extra setup in the reporting workflow.

Current evidence on 2026-09-13:

- The focused browser fixture creates two temporary accounts through the
  existing user-management API. Both have only the existing Reports laboratory
  role, assigned to All Lab Units, and no global roles. Setup uses the current
  instance's role catalog and naming rules; no reporting permissions were added.
- The first user signs in through the login page, enters Reports → Custom Data
  Export, selects patient information, reorders columns, saves a shared report
  and downloads a CSV containing both independent readings of 450.
- The browser's cookies and local/session storage are cleared before the second
  user signs in. That user finds the saved report, reopens it with blank dates,
  supplies a fresh period and downloads exactly the same headers and rows.
  The shared definition is deleted through its visible confirmation afterward.
- The new scenario plus authentication passed in 27 seconds. The complete
  focused file then passed all seven checks in 44.5 seconds against the packaged
  `eaf54b1e20` backend and existing production frontend bundle. Evidence:
  `/private/tmp/reporting-shared-users-browser.log` and
  `/private/tmp/reporting-shared-users-full-browser.log`.
- Download bytes, CSV attachments and the completed-report screenshot were
  inspected. Reporting scenarios had no page errors or failed application
  responses. Authentication setup logged the existing self-signed-certificate
  service-worker warning; reporting scenarios explicitly block service workers.
- The final two-user run passed again in 28.5 seconds after normalizing the
  screenshot scroll position. The corrected image was inspected. Project
  registration, lint, both required formatters, build/install and ten edited
  local document links pass. No backend tests were rerun for this test/document
  checkpoint; the unchanged backend retains its 45-test result from Iteration 5.
  Final browser output: `/private/tmp/reporting-shared-users-final-browser.log`.

This closes the ordinary-user flow gap in T005 and proves local second-user
shared reuse. It does not complete broader field/configuration qualification,
the remaining access-negative browser cases, the turnaround decision, M2,
deployment or human UAT.

## Acceptance-driven Iteration 7

Outcome: add a report through deployment configuration, select its configured
defaults and instance fields in the existing builder, and download its repeated
results through the existing queue.

Current evidence on 2026-09-13:

- `reporting-sources/*.json` is registered with the existing configuration
  initializer and persists versioned `CSV_SOURCE` records in `ReportDefinition`.
  Loading is idempotent. Invalid mappings, fields, catalogs, filters, layout
  defaults, conflicting report kinds and unversioned edits cannot replace a
  working definition.
- Spreadsheet defaults no longer append every test unconditionally. A definition
  selects its ordered common fields and can explicitly expand `catalog:tests`
  or another allowed group. Sample & Testing retains its previous effective
  defaults through this explicit configuration; its definition version is now 2.
- Two regression checks failed before the implementation. Six real-database
  configuration cases then passed: actual file loading/checksum skips, same-source
  CSV output in both layouts, dynamic defaults, versioned updates, invalid-update
  preservation and report-kind collisions. The test context excludes startup
  configuration, so these checks instantiate the real initializer with the
  actual Spring-managed handlers rather than changing the shared test context.
- All 53 focused reporting backend tests pass, as do Java 21 build/install,
  both required formatters, 44-file reporting Spotless validation, browser lint,
  project registration and edited local document links. Reporting instruction
  coverage is 4,069/5,773 (70.5%); it remains below the feature goal.
- The isolated application loaded `sample-summary.json` from its normal mounted
  configuration directory. Startup took 359.5 seconds. The local configuration
  parent initially belonged to root; assigning it to the existing Tomcat account
  allowed the subsequent startup load to save its checksum. No shared server or
  other application was changed.
- All eight focused browser checks passed in 1.1 minutes against that packaged
  backend. The additional report initially selects only Specimen ID and Accession
  Number while exposing instance tests. The browser adds Viral Load and downloads
  exactly two independent rows with value 450, then finds Sample summary in the
  common queue. Screenshot and downloaded CSV were inspected.
- Logs retain the known self-signed-certificate service-worker setup warning and
  request-cancellation messages. Downloads passed exact byte/content checks; both
  saved-report deletions associated with cancellation messages were independently
  confirmed inactive in the database. No page exceptions were logged.

Evidence: `/private/tmp/reporting-source-config-red.log`,
`/private/tmp/reporting-source-config-integration-2.log`,
`/private/tmp/reporting-source-config-all.log`,
`/private/tmp/reporting-source-config-build-2.log` and
`/private/tmp/reporting-source-config-browser.log`.

This proves configuration-loaded fields/defaults and same-engine execution.
T009 remains open for complete catalog qualification, including configured
filter subsets in the builder/request path. T010/T011 remain open for the
turnaround decision. Remaining M1 qualification, M2, deployment and human UAT
are unchanged.

## Acceptance-driven Iteration 8

Outcome: optional filters follow the report configuration. Previous choices from
another report or saved definition cannot silently restrict its output.

Current evidence on 2026-09-13:

- The builder shows configured filter controls only. Unsupported prior choices
  are omitted from saving and generation, with a notice before review. Review
  shows the effective filters; returning to the original report restores its
  supported prior choice. Empty optional-filter configuration retains mandatory
  dates and Sample & Testing's finalized/all-tests defaults.
- Real stored-configuration tests verify that generation and shared-definition
  requests reject unsupported lab-section, test and status values. These checks
  and the component regression failed before the implementation.
- All 54 focused backend tests, all nine component tests, Java 21 build/install
  and the production frontend build pass. All nine real-browser checks passed
  in 1.4 minutes against the updated isolated application.
- The new browser case selects a non-Viral-Load test, switches to the loaded
  Finalized sample summary, verifies optional controls are absent and the notice
  appears, and downloads both independent Viral Load readings of 450. Returning
  to Sample & Testing verifies that the previous test is still selected. CSV
  bytes and screenshot were inspected.
- The full browser run also rechecks both layouts, empty output, dates/navigation,
  shared CRUD and independent reuse by two ordinary users. No page exceptions
  were logged. Known local certificate/service-worker warnings and request
  cancellations remain; the three deletions associated with cancellation logs
  were independently confirmed inactive in the database.
- The normal formatter skips directories named `reports`, including this
  component. The two changed component files were explicitly formatted and
  checked with `--ignore-path /dev/null`; their nine tests and production build
  then passed again. The normal formatter, 44-file reporting Spotless check,
  browser lint, registration and edited local links pass. Reporting instruction
  coverage is 4,204/5,836 (72.0%), still below the feature goal.

Evidence: `/private/tmp/reporting-config-filters-component-red-2.log`,
`/private/tmp/reporting-config-filters-backend-red.log`,
`/private/tmp/reporting-config-filters-backend-green.log`,
`/private/tmp/reporting-config-filters-component-final.log`,
`/private/tmp/reporting-config-filters-build.log`,
`/private/tmp/reporting-config-filters-frontend-build-final.log` and
`/private/tmp/reporting-config-filters-browser.log`.

Together with Iteration 7 and the instance-field mapping evidence, this closes
T009. Turnaround, the remaining M1 qualification, M2, deployment and human UAT
remain open. The turnaround decision was resurfaced in the question tool and
answered after this checkpoint: show turnaround beside each test, preserving
repeat-specific durations and common specimen collection-to-receipt time.

## Iteration 9: Per-Test Turnaround and Correct Rerun Downloads

The user selected per-test spreadsheet durations, with each repeat retaining its
own times and collection-to-receipt remaining specimen-level. The source now
exposes optional test/component duration catalogs; generic result intervals
remain in the detailed list. Built-in source version 3 captures the changed
meaning. Existing stale-column handling rejects obsolete common spreadsheet
intervals on both submission and save.

The first five real-database cases failed before implementation, then passed:
two different tests, repeated analyses with different times and equal values,
duration-only selections with missing/negative intervals, renamed components,
and layout/default catalog separation. A sixth case verifies rejection of old
spreadsheet duration selections. All 59 existing/new reporting cases passed;
the final six-case turnaround run passed after adding that compatibility case
(60 distinct backend cases across the two runs).

The browser scenario selects and orders turnaround beside Viral Load, downloads
two equal values with 30/90-minute intervals, then switches to the detailed list
and compares the same intervals. Its first run exposed a real rerun defect: the
previous ready file remained clickable while the new submission was pending.
A component regression reproduced it, including failed submission and retry.
Starting another run now clears the current-file reference while preserving
inputs and retry identity; prior jobs remain in the queue. The ten component
checks and all ten browser checks now pass (browser: 1.6 minutes).

The new May 6 fixture is separate from the original May 5 records; the empty
period check now uses May 7. Loading the complete SQL fixture exposed and fixed
an earlier `report_definition.lastupdated` typo (`last_updated` is the actual
column). The full fixture now loads transactionally. The browser failure was
not bypassed with a wait or weaker CSV comparison.

Java 21 packaging, production frontend build, both formatters, 45-file reporting
Spotless validation, browser lint/project registration and local document links
pass. Reporting instruction coverage is 4,417/5,940 (74.4%); the feature coverage
goal remains open. Download bytes, successful screenshot and browser logs were
reviewed. Local service-worker certificate warnings and expected request
cancellations remain separate from test failures.

Local startup encountered a migration lock owned by the removed container.
Inspection proved the owner absent and no active transaction; releasing only
that exact abandoned lock let startup finish. The quickstart now requires
stopping a host-mounted-WAR runtime before replacing its WAR to avoid the
Tomcat/recreate race. This affected only the disposable local application.

Evidence: `/private/tmp/reporting-turnaround-red.log`,
`/private/tmp/reporting-turnaround-green.log`,
`/private/tmp/reporting-turnaround-boundary.log`,
`/private/tmp/reporting-rerun-component-red-2.log`,
`/private/tmp/reporting-rerun-component-green.log`,
`/private/tmp/reporting-turnaround-browser-final.log`,
`/private/tmp/reporting-turnaround-build.log` and
`/private/tmp/reporting-rerun-frontend-build.log`.

This resolves the known turnaround formatting defect and closes T011. Other M1
qualification, M2 and full MVP acceptance remain open.

## Delivery Correction: Continuous Public UAT

The user explicitly corrected the delivery sequence: UAT is a live reflection
of development stages and finds issues during implementation. Automated
end-to-end validation and human UAT use the same workflows, fixtures and
expected results. Waiting for the full MVP before publishing was a planning
error; the plan, tasks, quickstart and UAT contract now remove that dependency.

The next action is to publish this working Sample & Testing stage at the stable
Catalyst reporting hostname with its actual scope and known gaps, then update
that same target at subsequent checkpoints. Full MVP criteria remain intact.
Current server inspection confirms capacity and an unused isolated reporting
path; no reporting application has yet been deployed publicly at this point.

## M1 Acceptance Checkpoint

The implementation is reviewable as a foundation, but M1 is not complete. The
following ledger is the gate for continued work:

| Capability                                             | Current evidence                                                                                                                                                                               | State                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Native Reports entry                                   | Menu migration plus browser navigation                                                                                                                                                         | Proven locally                                                     |
| Instance-derived tests/components/questions            | Database checks add/rename a question and configure/export a second component arrangement without reporting-code changes                                                                       | Proven locally at source level; deployed configuration UAT remains |
| Additional report configuration                        | Initializer loads versioned definitions; browser verifies fields/defaults, filter subsets, repeat downloads and the same queue                                                                 | Proven locally; deployed configuration UAT remains open            |
| Spreadsheet download                                   | Browser compares downloaded bytes with two independent identical fixture readings                                                                                                              | Proven locally for current fixture                                 |
| Detailed-list download                                 | Browser compares two distinct result identities and values                                                                                                                                     | Proven locally for current fixture                                 |
| CSV contract and streaming                             | Nine focused writer checks include BOM, escaping, nulls, ordering, zero rows, repeats and 50,000 streamed records                                                                              | Proven at formatter level; database workload remains open          |
| Date validation and retained draft                     | Component and browser checks cover the inclusive limit, invalid ranges, queue visit and reload                                                                                                 | Proven locally                                                     |
| Immutable jobs and owner submission identity           | Persistence/service checks plus simultaneous database transactions cover idempotency, conflicts, configured limits, ownership and current scope; two ordinary users complete real browser jobs | Proven locally; deployed ordinary-user UAT remains                 |
| Shared saved reports                                   | Service, component and real-browser create/reopen/update/copy/delete checks; second report user reopens with fresh dates and downloads identical output                                        | Proven locally; second-user deployed UAT remains open              |
| Wider Sample & Testing fields and additional questions | Database checks cover linked common/patient fields, received time/count, five turnaround measures, corrected results and configured literal/dictionary/key/multiple answers                    | Proven at mapping level; browser comparison remains open           |
| Queue lifecycle and recovery                           | Submit, generate, poll and download work                                                                                                                                                       | Open; retry, cancel, recovery, expiry and audit remain M2          |
| Referral and Non-Conformance definitions               | Not implemented                                                                                                                                                                                | Open in M2                                                         |
| Catalyst deployment                                    | Server inspected only                                                                                                                                                                          | Open                                                               |

Do not expand to M2 or describe M1 as complete until the M1-open rows required
by T002, T004-T006 and T008-T017 have passed. A draft M1 PR is the
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
  saved-report editing is implemented. The existing configuration initializer
  now loads additional validated source definitions from deployment files.
- Existing `ReportDefinition` storage will hold source definitions and shared
  saved reports, using distinct CSV report types. Its current patient-report
  consumer selects `PATIENT` explicitly. Two initially drafted new definition
  entities were removed before any migration or commit.

## Validation Recorded So Far

| Check                         | Observed result                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specification checks          | Eight Markdown files, 36 local/source links, JSON example and requirement/task consistency passed                                                                                                                           |
| Baseline backend              | Java 21 build/install passed with both test-skip flags; first cache installation attempt needed normal filesystem permission                                                                                                |
| CSV writer and dates          | 12 focused JUnit tests passed; the repeat workload writes 50,000 rows incrementally                                                                                                                                         |
| ORM and lifecycle             | Three tests passed; factory startup is under five seconds and needs no database                                                                                                                                             |
| Source configuration          | Four tests passed, including an extra definition over the same supported source                                                                                                                                             |
| PostgreSQL job persistence    | Three tests passed against a disposable database using the repository test setup; migration `479-001-reporting-export-jobs` ran successfully                                                                                |
| Stored source relationships   | Two tests passed: configured component identity survives rename and repeated values; collection dates distinguish specimens under one accession                                                                             |
| Combined reporting validation | All 45 focused Java tests passed on 2026-09-13, including source, answer scope, access, concurrent admission, saved-definition and database checks                                                                          |
| Frontend component/build      | Eight focused component checks and the production frontend build passed on 2026-09-13                                                                                                                                       |
| Focused browser acceptance    | Seven Playwright checks passed in 44.5 seconds against the packaged app on 2026-09-13: sign-in, both layouts, repeats, zero rows, date/draft handling, shared operations and independent reuse by two ordinary report users |
| Formatting                    | Corrected absolute-path selector checks 42 reporting Java files; earlier relative-path invocations selected zero files and were not valid formatting evidence                                                               |

The numeric streaming test is a formatter test, not the complete source/database
workload qualification. Database checks prove immutable requests, per-owner
submission uniqueness, concurrent admission and lifecycle persistence. Worker
concurrency, migration rollback and production-volume qualification remain
pending. Shared-definition edits and browser flows have their separate evidence
above. Iteration 6 completes the ordinary-report-user application flow required
by T005; remaining access-negative browser cases are part of T016 qualification.

CI on `b31449b3f5` passed frontend static checks, its image build and the shared
E2E build, but backend CI stopped at six Java formatting violations. The local
formatter had accepted a relative-path filter that selected zero files. The
corrected filter reproduced all six failures, applied their formatting and
verified all 42 reporting Java files. Do not label this replacement checkpoint
CI-complete until its new backend run passes. At the `c0cbd56280` checkpoint,
frontend and downstream E2E CI subsequently passed; backend Build + Test was
still running when inspected during Iteration 5 on 2026-09-13. The Iteration 5 source
correction requires CI on its own pushed revision.

The replacement checkpoint's 43-case backend run and build/install pass. Test
output is retained at `/private/tmp/reporting-checkpoint-43-tests.log`; build
output is at `/private/tmp/reporting-checkpoint-build.log`. The concurrent test
now commits its cleanup separately and asserts that no active fixture job is
left behind. No browser rerun or deployment was performed for this test and
formatting checkpoint.

The regenerated focused JaCoCo report after Iteration 5 measures 3,540 of 5,417
instructions in the new reporting packages, or 65.3%. This is below the feature coverage goal.
Controller, worker and remaining source/recovery tests remain part of T004,
T005, T012 and M2; the draft checkpoint must not be presented as
coverage-complete.

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

- Complete M1: qualify the remaining result/component/value and
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
