# Reporting milestone code QA

This is the implementation agent's source review and validation record for the
ten-PR delivery stack. It is not independent reviewer approval, human UAT or a
claim that the final assembled deployment has passed. See the
[delivery evidence gates](review-stopping-point.md#required-delivery-evidence).

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

- Inspect the final navigation/configuration diff and rerun its focused tests
  after assembling that slice. Compare final rendered screens directly with the
  pinned mock at matching desktop and narrow widths.
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

## Shared-editor recovery correction — September 14, 2026

The public two-editor qualification on application `8005e4cc0b` verifies that
two tabs can open the same shared definition, the first update persists, and a
stale second update gets the intended conflict notification while preserving its
column order. Saving a separate copy succeeds. Reopening both definitions from
the library and downloading actual synthetic CSVs confirms the original has its
added Patient Name column while the copy retains its independent reordered
columns; both retain the two equal Viral Load readings. Cleanup removes only the
test's uniquely named definitions using their current versions. This tests stale
editor behavior; the synchronized database race remains a separate test.

The first public attempt exceeded the assertion window while the second tab's
catalog request was still pending. The trace showed no server failure. A focused
loading wait allowed the workflow to complete. Reopening from the library,
rather than reloading an active draft, is required to inspect the server's saved
definition: preserving a draft on reload is intentional.

The public workflow and its subsequent HD recording passed (each two checks
including authentication). However, direct frame inspection exposed a real UI
recovery issue: the old conflict warning remained beside the successful copy
notification. Those recordings are diagnostic evidence of the existing defect,
not proof that the correction is deployed.

`CustomDataExport.jsx` now resets the previous update mutation only in the
successful create/copy callback, after its draft-revision guard. The new component
regression first reproduced the lingering warning. It also simulates a failed
copy save, checks that its name and choices remain, then verifies the warning
clears after a successful retry without altering the original definition.
All 31 reporting component tests pass. The compiled local two-editor workflow
passes with actual CSV downloads and asserts the stale warning disappears after
success (two checks including authentication, 26.9 seconds). Both production
builds, both formatters and focused Playwright lint passed. Backend packaging
skipped tests; no backend source changed in this correction. The first formatter
process failed on dependency DNS/cache access; the authorized retry completed.

The browser regression now additionally switches the second editor to 390px for
recovery and records desktop/narrow states. Its first launch was rejected because automatic approval review reported an
exhausted usage allowance. After a fresh usage check and normal approval retry,
the expanded test passed (two checks including authentication, 25.5 seconds).
The inspected 390px capture shows the copy success notification without the old
warning, retains the ordered fields and fits the viewport. Desktop/narrow review
and save structure were compared with the pinned mock; no layout code changed.
The regression registers each created definition for cleanup before assertions
that could fail after a successful write.

Pending: assemble the existing navigation child without rewriting history, and publish
and re-record the corrected public workflow. Preserve the review-tooling release
`7e45214eaf0be66b899807c60e61840f3efe284e` and its Grist-owned presentation.
The application publication remains `8005e4cc0b` at this checkpoint. The latest
verified general evidence is [the public review gallery](https://reporting.catalyst.openelis-global.org/reporting-evidence/20260914-review-8005/).
Non-Conformance, remaining included acceptance checks and human acceptance remain
open. This correction still requires public deployment and current-commit CI.
