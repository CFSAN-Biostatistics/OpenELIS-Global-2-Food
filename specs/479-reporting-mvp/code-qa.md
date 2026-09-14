# Reporting milestone code QA

This is the implementation agent's source review and validation record for the
ten-PR delivery stack. It is not independent reviewer approval, human UAT or a
claim that the final assembled deployment has passed. See the
[delivery evidence gates](review-stopping-point.md#required-delivery-evidence).

## Current checkpoint: 2026-09-14 navigation review repairs

The public `9baa356345489bf16d197c4ea6db48a615f894f9` deployment passed seven
checks including authentication. Six inspected local recordings for that revision
and the public results are linked from the
[review stopping point](review-stopping-point.md#review-ready-versus-merge-ready).
Earlier validation entries below remain evidence for their stated revisions.

The navigation PR's failed E2E run
[34898686396](https://github.com/DIGI-UW/OpenELIS-Global-2/actions/runs/34898686396)
was investigated through its logs, screenshots, traces and local reproduction:

- **Global menu editing:** the old Cypress test selected 197 controls using a
  global toggle selector, while the editor now has independent menu controls.
  `global-menu-config.spec.ts` replaces that obsolete spec with a real UI
  persistence workflow. It edits an instance-editable database child, saves,
  reloads, checks activation and icon persistence, and verifies the resulting
  navigation. A `finally` block restores and rechecks the original settings.
  Configuration-controlled entries remain protected. Existing shared Cypress
  helpers are retained for their remaining callers; no new Cypress test is added.
- **Final-report amendment:** the button locator also matched the Carbon
  tooltip named "No open amendment." The existing locator now requires the
  exact action name. Reason validation, original and amended report history,
  reidentification and relocking assertions remain intact.
- **Isolate details:** runtime measurement reproduced a zero-width details
  column beside a 400px action column. `MicrobiologyCaseView.css` now allows
  those columns to wrap according to available width. The workbench header also
  stacks below its existing breakpoint to prevent whole-page phone overflow.
  Existing flex-wrapping action styles are reused. The original visibility
  assertion remains, with added desktop/phone text, action and page-overflow
  checks. Both compiled screenshots were inspected at 1280px and 390px.

Validation for the follow-up source on the `9baa356345` baseline:

- Backend and frontend formatters and production builds passed; backend build
  used both test-skipping flags and is not counted as a backend test run. No
  backend production code changed in this repair.
- All three specifications are registered in `core-app`. The focused run on
  the compiled HTTPS preview passed four tests including authentication in
  22.9 seconds, with no skipped tests. The native local synthetic scenario
  service provisioned the microbiology cases; API responses were not mocked.
- Logs and screenshots are retained under
  `/private/tmp/reporting-ci-repair-final/` and
  `/private/tmp/reporting-ci-repair-final.log`. These local files do not replace
  shared evidence or CI for the eventual committed repair.

### Dashboard metrics failure: repaired and validated locally

The passing menu workflow also logged an aborted metrics request, followed by
`Cannot read properties of undefined (reading 'ordersInProgress')` during rapid
full-page navigation. `Utils.ts` calls the callback with `undefined` after a
failed request; `Dashboard.tsx` passes that value to `setCounts` while mounted,
then renders `counts.ordersInProgress`. The Dashboard fetch does not supply an
abort signal. This was reproduced by the new `Dashboard.test.jsx` before the
repair: failed-response cases crashed and the cancellation assertion failed.

The metrics request now owns an abort controller and ignores responses from an
aborted attempt. A failed load shows a Carbon error notification and Retry
instead of replacing counts with `undefined` or displaying zeros as real data.
Retry fetches again; leaving cancels the request. The obsolete shared mounted
flag was removed, including its unrelated tile-effect cleanup. Three component
tests pass for recovery, cancellation and a late response after retry.

The menu workflow now exercises the actual Admin and Back to main menu links,
retaining full reloads of the editor to verify persistence. It checks page errors
and console TypeErrors explicitly, and waits for the actual Carbon loading
overlay to disappear on return. This normal run passed two checks including
authentication in 9.7 seconds. The final compiled recording run passed all three
affected workflows plus authentication in 20.9 seconds. No runtime error was
observed in those workflows. Self-signed service-worker registration errors
remain confined to local authentication setup. Hard document-replacement
diagnostics can still log a cancelled fetch; they no longer produce the
undefined-counts crash.

Visual inspection of the failure state used one controlled metrics-only 503;
Retry then fetched real local backend counts. The final desktop and phone
screenshots show the notification and Retry with Carbon spacing, and successful
recovery. These screenshots were taken after the responsive shell settled.
Backend/frontend builds, both formatters, targeted test lint and the three
component tests passed. The backend build skipped tests; no backend code changed.
Logs are `/private/tmp/reporting-dashboard-{red,green,browser-routed,build}.log`
and `/private/tmp/reporting-navigation-final-recorded.log`; recordings are under
`/private/tmp/reporting-navigation-final-recorded/`. Publication and remote CI
for this follow-up remain required.

Updated recordings, shared publication and remote CI for the repaired commit
remain pending. No human acceptance or full-MVP completion is claimed.

## Finding: simultaneous shared-report edits returned a server error

`ReportingSavedConfigService.update` checked the supplied version before writing.
Two transactions could both accept the original version; the database correctly
rejected the losing write, but its `OptimisticLockException` bypassed the
reporting conflict handler. The user received a server error instead of the
existing `reporting.saved.changed` response.

`ReportingSavedConfigConcurrencyTest` reproduces this with two real PostgreSQL
transactions synchronized after their version checks. Only catalog/access
collaborators are stubbed; persistence, versioning and transaction completion are
real. Before the fix it observed one success and one server error. The service
now translates this specific persistence exception to the established 409
conflict, preserving the cause and leaving unrelated errors unchanged. Update
and soft deletion use the same write helper.

After the fix, the race test and five existing shared-definition service tests
pass. The race test also checks that the winning name and definition persist,
the version changes, and the loser receives the actionable conflict code.
Local logs: `/private/tmp/reporting-saved-concurrency-red.log` and
`/private/tmp/reporting-saved-concurrency-green.log`. This does not yet establish
the fixed response on a deployed build or simultaneous update-versus-delete
browser coverage.

## Source and assertion review

- `useReportingRoute.js` owns the view, step, source, layout, queue position and
  saved/job links in the URL. It preserves parameters owned by the review widget
  and derives state on browser history navigation. `CustomDataExport.jsx`
  retains input drafts in the browser session, clears them on logout/user change,
  clears dates when reusing a shared definition, and guards late mutation
  callbacks with a draft revision. Existing component tests cover those paths;
  31 reporting/route component tests pass in the assembled reporting slice.
- `ReportingCatalogService` reads configured sources and instance test catalogs;
  database source definitions override bundled defaults. Submission freezes
  ordered variable definitions and validates stale selections. Shared settings
  omit run dates. `ReportingJobService` serializes submission admission, keeps
  immutable request snapshots and checks lifecycle transitions for cancellation,
  retry and downloads. Their focused tests passed in the preceding stack slices;
  final assembled checks and exact-head CI remain required.
- `ReportingCsvWriter` streams ordered fields and preserves repeated result
  identities. The new recorded-workflow specification independently compares
  actual CSV headers and known synthetic rows, checks distinct detailed result
  identities, then verifies the queue returns identical stored bytes. It uses
  visible UI operations and deletes only the report it created.

The three new connected proof scenarios (plus authentication) passed their first
non-video run against public application `d48cd790c492`. They cover both Sample &
Testing layouts, per-test turnaround, shared reuse with fresh dates, Referrals
including pending work, and queue downloads. This is a baseline for recording;
no video, final-stack deployment or human acceptance is credited by that run.

## Remaining review and evidence

- Navigation source review: `MenuConfigurationLoader` copies configured entries
  without mutating persisted defaults; `MenuServiceImpl` excludes controlled
  fields from saves and rebuilds the effective cache after commit. The annotation
  mapping replaces the old XML registration. `ConfiguredSideNav` provides one
  Carbon renderer, and superseded navigation styles/renderers are removed.
  Upstream menu-domain filtering is preserved. The assembled stack passes both
  builds, 74 affected component tests and 18 mapping/configuration/rollback/race
  tests. A focused navigation walkthrough plus authentication passes against the
  existing public build. Final rendered comparisons at matching desktop and
  narrow widths remain required.
- Run the connected workflow specification on the final tested deployment,
  record it through `core-demo-video`, inspect screenshots and representative
  video frames, and publish playable artifacts with revision/checksum receipts.
  Add complementary queue-recovery and navigation evidence without duplicating
  the entire automated suite.
- Complete the wider-field and included-criterion audit; distinguish any
  remaining gaps from failing behavior. Non-Conformance's unresolved date
  semantics and disconnected source receive no acceptance credit.
- Refresh CI for the submitted commits and publish review links. This local
  record and prior green checks do not stand in for those gates.
