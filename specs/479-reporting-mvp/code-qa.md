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
