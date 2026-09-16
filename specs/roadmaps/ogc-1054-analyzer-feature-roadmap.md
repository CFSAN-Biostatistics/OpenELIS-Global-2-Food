# OGC-1054 Analyzer Feature Roadmap

**Updated:** 2026-09-16

**Product and ownership contract:** [feature specification](../OGC-1054-analyzer-qc-config/spec.md)

**Plain-language review:** [feature map](../OGC-1054-analyzer-qc-config/feature-map.md)

This is the only OGC-1054 delivery-state document. It is deliberately short
enough to review before each implementation slice.

## Sources And Boundaries

1. This roadmap and the linked repository specification govern scope,
   architecture, execution, and acceptance.
2. Current OpenELIS, Analyzer Bridge, analyzer-mock, review-tooling code,
   `AGENTS.md`, and accepted versioned contracts determine implementation.
3. [`openelis-work@main`](https://github.com/DIGI-UW/openelis-work/tree/main/designs/analyzer-integration)
   supplies functional and visual intent only. The
   [OGC-1057 QA report](https://github.com/DIGI-UW/openelis-work/blob/qa/ogc-1057-guided-setup-report/designs/analyzer-integration/ogc-1057-qa-report.md)
   supplies review findings only. Neither defines APIs, storage, ownership, or
   tests.
4. Jira is traceability only and cannot override these sources.
5. GitHub records review and merge state. The roadmap does not copy commit
   hashes or maintain a second evidence ledger.

## Fixed Decisions

- A profile has exactly two jobs: define runtime communication for one analyzer
  type and provide defaults for a new Bridge connection.
- Bridge owns immutable profile revisions, durable connection configuration,
  protocols, listeners, parsing, probes, control recognition, FILE runtime,
  and runtime restoration.
- OpenELIS owns the lab-facing UI, local analyzer identity/lab units, local
  catalog bindings, verification/audit, activation intent, held results,
  review, alerts, result release, and operational QC.
- OpenELIS stores a Bridge connection reference, not analyzer-facing values or
  a copied profile. Its backend may transiently mediate Bridge calls.
- Analyzer Type is a composed lab-facing view, not a local plugin/profile
  authority. There is one mapping editor and one pending-result workflow.
- Operational QC never gates analyzer activation or mapping verification.
  `AnalyzerQcRule` and `QcRun` are removed.
- No OE FILE poller, raw analyzer parser, complete desired-state writer, hidden
  classifier fallback, hard-coded profile/model/code behavior, dual writer, or
  compatibility runtime survives G0.
- Existing released OE connection data receives a one-time, quiesced,
  idempotent migration. The migration is not a permanent runtime path.
- MVP publishes only GeneXpert ASTM, FluoroCycler FILE, and QuantStudio FILE.
  Other profiles return one at a time after the same contract, mock, and
  assembled-flow proof.
- The existing `Analyser Import` role authorizes analyzer profile, setup,
  activation, analyzer-result, and linked operational-QC workflows. Global
  Administrators retain their platform override. Other authenticated users
  cannot view or invoke those workflows directly.
- Multi-component mapping and Results/Validation v4 are later milestones.

## CI Transition Decision

Keep the existing build-only workflow and downstream E2E executor, with the
downstream workflow as the only reporter of `03 Checkpoint - E2E`. Remove the
additional E2E execution and checkpoint introduced in the build workflow.

Retain the plugin build files and artifacts required by the active shared CI
contract during this transition. Retained plugins must be inactive in the new
analyzer runtime: they must not register analyzers or handle analyzer traffic.
Delete those files and their CI requirements together in a later cleanup PR.
Do not replace them with placeholder artifacts, skip analyzer stories, or post
manual checkpoint results. A passing rerun alone does not fix an intermittent
test failure.

This is a sequencing exception for inactive files, not permission to restore a
second analyzer workflow. Acceptance requires the normal pipeline to build the
PR's OpenELIS, Bridge, and mock revisions and pass all applicable suites, with
one E2E result for the current PR commit.

## Marker Rule

- `[✓]` merged: every PR required by the checkpoint is merged.
- `[x]` review-ready: implementation and automated checkpoint evidence are
  ready for review. It remains `[x]` through review corrections.
- `[*]` active: the one checkpoint currently being implemented.
- `[ ]` future: not started.

Markers change only when a checkpoint starts, becomes review-ready, or merges.
Exactly one checkpoint is `[*]` while implementation is in progress.
Review-ready work may be stacked while predecessors are reviewed, but merge
order is strict. Scope, architecture, contract, or acceptance changes require an
approved roadmap amendment before production code follows them.

Every review deployment comes from an open checkpoint PR whose applicable
automated gates are green. Branch-only builds are not review targets. Preview
feedback is fixed in the owning checkpoint PR; preview deployment does not
change a roadmap marker or constitute acceptance.

Open a companion repository PR only when a failing versioned contract proves
that repository owns a required change. Do not create empty companion PRs.

Checkpoint names and order package bounded work for review; they do not prove a
code-level dependency. Derive dependencies from current code, versioned
contracts, tests, and history. Do not remove a working behavior merely because
its target replacement is named in a later checkpoint: the assembled slice that
removes it must also contain and test the replacement.

## Current Train

- [✓] **R0 - Canonical roadmap and architecture.** OpenELIS
  [#4049](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4049).
- [✓] **F0 - Acceptance foundation.** OpenELIS
  [#4053](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4053).
- [✓] **E0 - Versioned contracts and migration boundary.** OpenELIS
  [#4055](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4055) and Bridge
  [#45](https://github.com/DIGI-UW/openelis-analyzer-bridge/pull/45).
- [✓] **M1 - Bridge profiles and Analyzer Types.** OpenELIS
  [#4056](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4056), Bridge
  [#46](https://github.com/DIGI-UW/openelis-analyzer-bridge/pull/46), and mock
  [#40](https://github.com/DIGI-UW/analyzer-mock-server/pull/40).
- [✓] **M2 - Local mapping and control-recognition verification.** OpenELIS
  [#4118](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4118) and Bridge
  [#47](https://github.com/DIGI-UW/openelis-analyzer-bridge/pull/47), and mock
  [#43](https://github.com/DIGI-UW/analyzer-mock-server/pull/43).
- [✓] **M3 - Guided setup, durable connection, activation, and QC link.**
  OpenELIS [#4125](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4125) and
  Bridge [#48](https://github.com/DIGI-UW/openelis-analyzer-bridge/pull/48).
- [✓] **M4 - Safe result traffic and integrated MVP.** OpenELIS
  [#4138](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4138), Bridge
  [#49](https://github.com/DIGI-UW/openelis-analyzer-bridge/pull/49), and mock
  [#42](https://github.com/DIGI-UW/analyzer-mock-server/pull/42).
- [*] **OGC-1220 - Recover held results after mapping adoption.** Implementation
  paused for the [test remediation plan](#analyzer-test-remediation-execution-plan). Continue in OpenELIS
  [#4256](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4256), retaining
  receipt protection from
  [#4241](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4241).
- [ ] **G0 - Exact deployment and named human acceptance.** Review tooling
      [#17](https://github.com/DIGI-UW/openelis-review-tooling/pull/17) is
      merged; its exact release must be deployed before the acceptance build is
      frozen.
- [ ] **R1 - Full feature operations.** Future.
- [ ] **R2 - Site rollout.** Future.

The original R0 through M4 pull requests are merged (verified 2026-09-16). Merge
does not establish deployment or human acceptance. Do not reopen their former
stack for new corrections. G0 remains pending acceptance evidence.

## OGC-1220 held-result remediation

**Agreed 2026-09-16; test remediation precedes further feature work.** After the lab
fixes a mapping and applies it to an analyzer, that analyzer's previously
blocked results become available for ordinary review.

This is the single remediation plan for
[OGC-1220](https://uwdigi.atlassian.net/browse/OGC-1220) and
[#4256](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/4256).
[Casey's September 15 decision](https://uwdigi.atlassian.net/browse/OGC-1220?focusedCommentId=37454)
calls for automatic reevaluation followed by ordinary result review. The
September 16 timing decision requires adoption by each analyzer. This
supersedes both the earlier next-message-only rule and the draft's required
manual reprocess action. The separate proposal is removed; Git retains its
history.

### Agreed behavior

- Bridge already sends normalized FHIR with raw test identity and source
  context, including unknown test codes. Bridge continues to own parsing and
  transport. OpenELIS owns local catalog mapping and held-result recovery; no
  Bridge change is currently indicated. Existing evidence:
  [`FhirBundleBuilderLoincTest`](../../tools/openelis-analyzer-bridge/src/test/java/org/itech/ahb/fhir/FhirBundleBuilderLoincTest.java),
  including `unknownCodeStillCarriesItsRawIdentityWithoutInventingLoinc`.
- The existing Analyzer Types mapping editor must include received unknown tests
  and values even when they are absent from the Bridge profile. These are local
  mapping decisions, not edits to or copies of the Bridge profile. Test targets
  must be active local catalog entries; value targets must be active Result
  Options of the selected Test.
- Incoming results and held-result reevaluation must use the exact local mapping
  revision that the analyzer has adopted and a human has confirmed. Saving or
  confirming a shared edit alone must not change an analyzer still using an
  older revision.
- Reevaluate eligible held rows automatically once both confirmation and
  adoption are satisfied, in either order. Cover rows already held when this fix
  is installed and safe repeated processing of the same revision. No analyzer
  resend or per-result reprocess button is required.
- Resolved patient rows enter ordinary Save / Retest / Ignore review; they are
  not automatically accepted. Still-unresolved rows remain held with accurate
  reasons and counts. Preserve source evidence and audit, including the actor
  and applied mapping revision. Unrelated holds and reviewed results are not
  candidates for this operation.
- Preserve unsaved worklist edits. Report control processing as successful only
  when its result was actually created. Apply existing exclusion and audit rules
  without adding a separate discard action; the draft's deletion of excluded
  rows is not an approved retention decision.

### Implementation order

Current progress: the roadmap is committed and both existing branches are
refreshed against `develop`. Received-code mapping, confirmation with unresolved
rows, and incoming use of the confirmed selected revision have uncommitted
implementation changes. Feature work is paused for the test-setup audit and
cleanup catalogued below. Automatic held-row recovery, worklist integration,
and assembled acceptance remain open.

Reuse #4256's stored Observation, ownership/profile checks, locking, and row
update logic. Replace its manual trigger and latest-saved-mapping lookup. Keep
#4241's duplicate-delivery receipt protection as a separate dependency:
transport retries still return the original acceptance summary and must not
become a second recovery path. Refresh the two branches against current
`develop` before production edits while preserving that dependency.

| Order | Bounded change                                                                                                                                     | Existing starting points                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Make incoming processing and held recovery use the analyzer's exact confirmed, adopted mapping revision.                                           | `AnalyzerInstanceLocalStateServiceImpl`, `AnalyzerSiteBindingConfirmationServiceImpl`, `AnalyzerNormalizedResultImportServiceImpl` |
| 2     | Compose the mapping editor from declared concepts plus observed unknown tests/values; enable the existing resolution link for both hold reasons.   | `AnalyzerTypeMappingServiceImpl`, held-result queries, `buildHeldResultResolutionUrl`                                              |
| 3     | Invoke the shared recovery operation when confirmation and adoption become eligible; cover either event order, existing backlog, and safe repeats. | `confirmMapping`, `selectSiteBindingRevision`, `reprocessHeldResult`                                                               |
| 4     | Refresh affected rows and counts without losing unsaved edits; remove the manual action and obsolete instructions.                                 | Analyzer results components, result state, `en.json`                                                                               |
| 5     | Replace next-message-only and manual-action tests, then prove the complete mapping-to-review flow.                                                 | Focused service/security/router tests; `ogc-1054-analyzer-mvp.spec.ts`; the acceptance checks below                                |

Start with failing tests for the exact revision rule and observed unknown test
mapping. Check how confirmation handles unresolved rows: adding observed rows
must not prevent unrelated mapped traffic or recovery of the resolved subset.
Use the existing services and held rows; add background processing only if a
measured workload or transaction constraint requires it.

### Analyzer test catalogue and cleanup audit — 2026-09-16

**Scope and status.** This is a source audit of the analyzer tests and the shared
setup they use, at checkout `762d40589b` plus the uncommitted remediation work.
It is not a claim that all these tests passed or that every mock is wrong.
Feature implementation is paused for this cleanup/catalogue. Keep findings and
cleanup progress here, alongside the acceptance checks, rather than starting a
second remediation plan.

The inventory covers the `analyzer`, `analyzerimport`, and `analyzerresults`
backend test directories; their ingress, result-controller, and test-catalog
neighbors; analyzer frontend tests; and the configured analyzer browser stories.
Bridge and instrument-simulator tests are identified as separate owners, but
have not received an exhaustive quality audit in this pass. General laboratory,
reporting, and microbiology tests are outside this audit except where they share
setup or connect to the analyzer workflow.

There are **59 `*Test.java` files in the three core backend directories**, one
of which is an abstract helper, and **322 annotated test methods**. These are
source-inventory counts, not executed-test or passing-test counts. There are
**17 frontend test files** in the two analyzer component directories and the
analyzer service client. The file inventory below makes those boundaries explicit.

#### Testing levels: what runs, and what a pass proves

| Level                                 | Existing analyzer coverage                                                                                                                                                                                                              | Real parts / substituted parts                                                                                                            | What a pass proves; what it does not                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolated backend logic                | Mapping, confirmation, adoption, activation, normalized import, quality-control routing, fingerprints, and result handling                                                                                                              | The class under test runs; its database/services are usually Mockito substitutes. Some parser/model tests need no substitutes.            | Branches, validation, selected arguments and transformations work for supplied inputs. Does not prove real service wiring, database queries, transaction boundaries, or durable history. Mocks are appropriate at this level.               |
| Request handling                      | `AnalyzerTypeRestControllerTest`, `AnalyzerInstanceRestControllerTest`, `AnalyzerActivationRestControllerTest`, `AnalyzerConnectionProbeRestControllerTest`, `AnalyzerHeldResultRestControllerTest`, `AnalyzerFhirImportControllerTest` | Real controller; direct method calls or a simulated HTTP request; domain service usually substituted.                                     | Request/response mapping, status handling, and delegation. Loading a database context does not turn a mocked import into an end-to-end import.                                                                                              |
| Permissions                           | `AnalyzerTypeRestControllerSecurityTest`, `AnalyzerWorkflowAuthorizationSecurityTest`, `ImportIssuesRestControllerSecurityTest`, neighboring `AnalyzerIngressSecurityTest` and `AnalyzerResultsControllerTest`                          | Real security filters/method authorization in a test configuration; domain services or ingress handler may be substituted.                | Anonymous/wrong-role rejection and permitted routes within that configuration. Does not prove the entire deployed security configuration or persistence. Keep this separate from ordinary controller tests.                                 |
| Database integration                  | `AnalyzerSiteBindingPersistenceIntegrationTest`, `AnalyzerNormalizedResultImportIntegrationTest`, event persistence, result acceptance, quality-control result and service tests                                                        | Real PostgreSQL, migrations and selected application services; inherited setup and some individual tests substitute internal services.    | Database constraints, stored outcomes, locking/rollback where explicitly exercised. Current mapping tests do not collectively prove the complete save → confirm → per-analyzer adoption → recovery sequence. This is the main cleanup area. |
| Schema and object mapping             | `AnalyzerSiteBindingOrmValidationTest`, `HibernateMappingValidationTest`, migration/rollback tests                                                                                                                                      | Some inspect Java mappings or migration XML only; others execute migrations/rollback against PostgreSQL.                                  | XML checks prove declarations exist; object-mapping checks prove Hibernate can build its model; database migration tests prove executed changes on their fixture. These are different strengths of evidence.                                |
| Bridge message contracts              | `AnalyzerBridgeContractConsumerTest`, `AnalyzerNormalizedResultContractTest`; Bridge parser/builder/contract suites                                                                                                                     | Real schema/parser code and pinned example messages; no live Bridge in the OE consumer tests.                                             | OE can interpret the agreed message shape; Bridge unit tests can prove its builder preserves unknown codes. Neither alone proves live transport reaches OE.                                                                                 |
| Frontend component and client tests   | Mapping editor, analyzer setup/list/types, result worklist/import issues, client request helpers                                                                                                                                        | React, Carbon and often a real in-memory router run; server calls are substituted.                                                        | User interactions, request payloads, validation, navigation, refresh behavior represented in that test. Does not prove server acceptance, persisted recovery, or actual browser layout.                                                     |
| Browser against the assembled harness | Four OGC-1054 stories plus analyzer list/navigation checks; real OE + Bridge + PostgreSQL, with a simulated instrument                                                                                                                  | Real browser/application/services. Harness setup creates prerequisites and sends instrument-like traffic through Bridge before the story. | The visible workflow on that running build. Existing stories cover catalog, mapping, setup and review, but have not yet been revised to prove automatic held-result recovery.                                                               |
| Real instrument and human acceptance  | Manual GeneXpert connection story; named product review of the exact build                                                                                                                                                              | Operator-managed hardware or human review.                                                                                                | Hardware connectivity or usability/functional acceptance actually observed. The hardware story deliberately skips ordinary CI; automated green results do not imply this acceptance.                                                        |

#### Confirmed issues and coverage limits

“Confirmed” below means the source demonstrates the behavior. It does not mean
we reproduced a production failure. “Coverage limit” means a useful test has
been given more evidentiary weight than it deserves, not that it must be deleted.

| Finding / priority                                                                                                       | Level and exact surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence and consequence                                                                                                                                                                                                                                                                                                                                                                       | Cleanup and proof required                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Internal behavior disabled in shared setup — fix first**                                                            | Database and HTTP tests inheriting [AppTestConfig](../../src/test/java/org/openelisglobal/AppTestConfig.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                | `auditTrailService()` returns a recorder that saves nothing; `fhirContext()` returns a parser factory with no real parsing behavior unless a test supplies it. The same setup substitutes other internal services. Confirmation/import needs actual history and parsing.                                                                                                                       | Make the internal behavior needed by integration tests real in one shared setup. Keep external calls controlled. Remove local workarounds and prove persisted history plus message parsing through injected services. Do not switch every shared mock blindly.                                                              |
| **2. Shared application objects modified by tests — fix first**                                                          | Shared history tests: [SystemAuditTrailIntegrationTest](../../src/test/java/org/openelisglobal/audittrail/SystemAuditTrailIntegrationTest.java), [PatientAuditTrailIntegrationTest](../../src/test/java/org/openelisglobal/audittrail/PatientAuditTrailIntegrationTest.java), [PatientMultiFieldAuditTrailIntegrationTest](../../src/test/java/org/openelisglobal/audittrail/PatientMultiFieldAuditTrailIntegrationTest.java), [P0AuditEmitSmokeTest](../../src/test/java/org/openelisglobal/audittrail/P0AuditEmitSmokeTest.java)                           | At HEAD, all four build a real recorder manually and use reflection to replace dependencies on shared application services, without restoring them. This creates an execution-order risk; an actual order-dependent failure has not been reproduced in this audit.                                                                                                                             | Use one correctly configured integration context. The uncommitted cleanup has removed these four overrides, but the shared setup is not yet fixed or validated. Run the affected groups together and in reversed order after consolidation.                                                                                 |
| **3. Mapping transitions bypass the application — fix first**                                                            | [AnalyzerNormalizedResultImportIntegrationTest](../../src/test/java/org/openelisglobal/analyzerimport/service/AnalyzerNormalizedResultImportIntegrationTest.java): `reprocessingPersistsTheNextUnresolvedMappingState`, `heldControlRecoversItsLotFromStoredEvidenceInALaterTransaction`, `retryCannotAdvanceAHeldResultButExplicitReprocessingCan`, `bindTest`, `confirmFixtureMapping`                                                                                                                                                                     | Mapping rows are inserted/deleted under the same saved revision. The new confirmation helper deletes the prior confirmation and reconfirms that altered revision. These tests exercise importer behavior with supplied state, but bypass immutable revisions and actual analyzer adoption. The confirmation workaround was added during this remediation and must not become the new standard. | Establish initial data once; perform the mapping change through real save, confirmation and adoption services. Verify old revision/history remains intact and only the adopting analyzer changes. Preserve independent duplicate-delivery assertions.                                                                       |
| **4. “Persistence integration” also constructs substitute domain services — consolidate**                                | [AnalyzerSiteBindingPersistenceIntegrationTest](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerSiteBindingPersistenceIntegrationTest.java), especially `savedCatalogBindingsAndConfirmationReloadFromPostgres`, `sharedMappingCanReturnToTheContentOfAnEarlierRevision`, `activationAndDeactivationPersistExactBridgeAcknowledgementsWithoutChangingTheLoadedVersion`                                                                                                                                                                       | Real database is combined with manually constructed services and substituted catalog, user, mapping or confirmation services; real audit recorder is assembled three times. Persistence checks remain useful, but cannot establish ordinary application wiring.                                                                                                                                | Inject actual local services. Supply real local catalog/user records. A substituted Bridge response remains appropriate for a focused OE persistence test; full transport belongs to the harness. Keep explicit transaction-close/reload checks.                                                                            |
| **5. Small tests carry an entire database context — consolidate**                                                        | [AnalyzerFhirImportControllerTest](../../src/test/java/org/openelisglobal/analyzerimport/action/AnalyzerFhirImportControllerTest.java), [AnalyzerResultsAcceptServiceResultMappingTest](../../src/test/java/org/openelisglobal/analyzerresults/service/AnalyzerResultsAcceptServiceResultMappingTest.java)                                                                                                                                                                                                                                                   | The first starts the broad database context, then replaces import and parser dependencies; the second substitutes the result catalog to test stable-ID selection. Both restore replacements, unlike finding 2. These are narrow controller/logic tests with unnecessarily broad setup.                                                                                                         | Move narrow tests into isolated setup with explicit dependencies. Retain separate real integration coverage. The controller's `any(Bundle.class)` verification also needs the parsed source identity checked, not merely “some Bundle was passed.”                                                                          |
| **6. Query tests do not execute their queries — coverage limit**                                                         | [AnalyzerProfileBindingDAOImplTest](../../src/test/java/org/openelisglobal/analyzer/dao/AnalyzerProfileBindingDAOImplTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                              | All three tests substitute Hibernate and its query results; they verify query text/parameters and return values. They cannot catch database query validity or incorrect filtering against real rows.                                                                                                                                                                                           | Keep useful argument/normalization checks; establish database cases with different profiles/revisions and analyzer references. Do not count the three mocked tests as database-query proof.                                                                                                                                 |
| **7. Shared database cleanup and cached state require repairs — isolation risk**                                         | [BaseTestConfig](../../src/test/java/org/openelisglobal/BaseTestConfig.java), [BaseWebContextSensitiveTest](../../src/test/java/org/openelisglobal/BaseWebContextSensitiveTest.java), [AnalyzerResultsAcceptHoldIntegrationTest](../../src/test/java/org/openelisglobal/analyzerresults/service/AnalyzerResultsAcceptHoldIntegrationTest.java)                                                                                                                                                                                                               | A static PostgreSQL container is shared; the base disables automatic per-test transactions and fixture cleanup uses `TRUNCATE ... CASCADE`. Protected seeds exist, while result-acceptance tests additionally restore statuses, sequences and singleton records damaged by other fixtures. These are concrete isolation workarounds, not proof every current order fails.                      | Consolidate fixture ownership/cleanup and cache refresh. Use rollback for tests that do not need committed multi-transaction behavior; use explicit owned-row cleanup for concurrency/commit tests. Verify order independence instead of adding further per-test database repairs.                                          |
| **8. Permissions and ordinary HTTP tests use different setups — coverage boundary**                                      | [BaseWebContextSensitiveTest](../../src/test/java/org/openelisglobal/BaseWebContextSensitiveTest.java), [SecuritySliceMockMvcTest](../../src/test/java/org/openelisglobal/security/SecuritySliceMockMvcTest.java), analyzer security classes                                                                                                                                                                                                                                                                                                                 | The broad base builds MockMvc without applying Spring Security filters. Security classes explicitly apply them, but use reduced test configurations; for example the type-security setup disables CSRF. Ordinary controller success does not prove permissions, and role tests alone do not prove deployed request security.                                                                   | Keep labels explicit. Cover mapping save/confirmation/adoption authorization and rejected-request non-mutation in the appropriate security/integration level. Validate real login/session/request protection through the deployed flow. No missing production protection is established by this observation alone.          |
| **9. Tests still enforce superseded behavior — replace with the behavior change**                                        | [AnalyserResults.test.jsx](../../frontend/src/components/analyserResults/AnalyserResults.test.jsx), [AnalyzerHeldResultRestControllerTest](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerHeldResultRestControllerTest.java), manual-reprocess case in [AnalyzerWorkflowAuthorizationSecurityTest](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerWorkflowAuthorizationSecurityTest.java), import tests above, [assembled browser story](../../frontend/playwright/tests/demo/harness/ogc-1054-analyzer-mvp.spec.ts) | Component/controller/security tests cover the manual reprocess action. The browser story explicitly expects zero mapping links for an unknown test and does not adopt the newly confirmed mapping and prove the original held row recovered. It was testing the earlier workflow.                                                                                                              | Remove obsolete manual-action cases when their replacement exists. Change the browser story to map an observed unknown code/value, confirm, adopt, and review the original recovered row without resend. Do not weaken assertions merely to keep the old story green.                                                       |
| **10. Harness confirmation preparation assumes every non-bound row is excluded — fix before partial-mapping acceptance** | [seed-mvp-traffic.sh](../../projects/analyzer-harness/seed-mvp-traffic.sh), `prepare_profile_mapping` confirmation payload                                                                                                                                                                                                                                                                                                                                                                                                                                   | The script puts all rows whose state is not `BOUND` into `excludedRows`, including `UNRESOLVED` if present. The new editor test explicitly distinguishes unresolved from excluded; the harness preparation still uses the old assumption.                                                                                                                                                      | Build confirmation payloads only from actual BOUND/EXCLUDED decisions; leave unresolved rows unresolved. Exercise preparation with an unresolved observed code so the assembled test does not hide this case. Runtime failure on that case has not yet been reproduced.                                                     |
| **11. Automatic recovery acceptance remains unproved — implementation/coverage gap**                                     | Adoption/import/confirmation unit tests, database tests, worklist refresh tests, and browser stories                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The two-analyzer selected-revision unit test supplies analyzer objects; it does not perform two real adoptions. Existing refresh tests cover accepting a result, not concurrent recovery preserving unsaved edits. No reviewed test in this scope demonstrates the complete new recovery workflow.                                                                                             | Use the acceptance checks below: two real analyzers, both event orders, partial recovery, backlog, repeated/concurrent processing, history, permissions, unchanged source evidence, truthful control outcome, and unsaved edits. Add coverage at its owning level rather than duplicating every combination in the browser. |

#### Shared substitutes: the complete configured surface

[AppTestConfig](../../src/test/java/org/openelisglobal/AppTestConfig.java)
contains **29 Mockito-created bean declarations**, grouped below. A declaration
is not a finding of bad testing: some correctly isolate external systems. The
two methods annotated `@Profile("Test")` use a different case from the active
`test` profile and are not normally active in this base context.

| Group                                    | Declared substitutes                                                                                                                                                                                                        | Audit disposition                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internal behavior directly relevant here | `AuditTrailService`, `FhirContext`, `FhirUtil`, `FhirConfig`, `AccessionNumberValidatorFactory`, `DisplayListService`, `SampleOrderService`, `RequesterService`                                                             | Audit recorder and parser are confirmed problems for the current integration path. Review the others only as analyzer acceptance traverses them; do not assume all are exercised or broken. |
| Other internal application behavior      | `WHONetReportService`, `TestNotificationConfigService`, `TestNotificationService`, `AnalysisNotificationConfigService`, `NotificationDAO`, `Versioning`, `TestProductMapping`, `DataExportTaskService`, `DataExportTaskDAO` | Shared exposure identified; full notification/report/export correctness is outside this analyzer audit. Record dependencies if the chosen real workflow reaches them.                       |
| External/infrastructure boundaries       | `CloseableHttpClient`, `JavaMailSender`, `OzekiMessageOutService`, `OdooClient`, `OdooConnection`, `DataExportService`, `TruststoreService`                                                                                 | Controlled substitutes can be appropriate. These tests cannot establish actual network delivery, certificates, mail or external systems.                                                    |
| Test conveniences                        | `TextEncryptor`, `UnsatisfiedDependencyException`                                                                                                                                                                           | Encryption is stubbed to return its input; this setup is not encryption evidence. The exception bean has no established analyzer need and is a cleanup candidate.                           |
| Differently cased profile                | `RequesterTypeService`, `OrganizationTypeService`                                                                                                                                                                           | Configuration inconsistency to consolidate deliberately, not two additional active analyzer mocks.                                                                                          |

The shared setup also supplies a fixed Bridge profile catalog via
[AnalyzerTestProfileCatalog](../../src/test/java/org/openelisglobal/analyzer/AnalyzerTestProfileCatalog.java).
That is a deliberate external fixture, not a live Bridge. Its nested test-config
exclusion plus several named exclusions also make the broad component scan
harder to reason about; no current configuration collision was reproduced here.

#### Backend file inventory

Paths below are relative to `src/test/java/org/openelisglobal/`. Classification
is by what the file executes, not whether its name contains “Integration”.
Method counts are omitted deliberately: a file's role is more informative than
its number of assertions or test methods.

| Level                                                        | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration declarations / standalone migration execution      | [analyzer/AnalyzerEventLiquibaseRollbackTest.java](../../src/test/java/org/openelisglobal/analyzer/AnalyzerEventLiquibaseRollbackTest.java)<br>[analyzer/migration/AnalyzerActivationRecordLiquibaseTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerActivationRecordLiquibaseTest.java)<br>[analyzer/migration/AnalyzerCutoverChecksumTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerCutoverChecksumTest.java)<br>[analyzer/migration/AnalyzerSiteBindingConfirmationLiquibaseTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerSiteBindingConfirmationLiquibaseTest.java)<br>[analyzer/migration/AnalyzerSiteBindingLiquibaseTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerSiteBindingLiquibaseTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Database integration (inherits shared setup)                 | [analyzer/AnalyzerServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/AnalyzerServiceTest.java)<br>[analyzer/integration/QCResultServiceIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/integration/QCResultServiceIntegrationTest.java)<br>[analyzer/migration/AnalyzerConnectionRuntimeRemovalLiquibaseIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerConnectionRuntimeRemovalLiquibaseIntegrationTest.java)<br>[analyzer/migration/AnalyzerQcRuleRemovalLiquibaseIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerQcRuleRemovalLiquibaseIntegrationTest.java)<br>[analyzer/migration/AnalyzerSupersededRuntimeRemovalLiquibaseIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerSupersededRuntimeRemovalLiquibaseIntegrationTest.java)<br>[analyzer/migration/AnalyzerSupersededSchemaRemovalLiquibaseIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/migration/AnalyzerSupersededSchemaRemovalLiquibaseIntegrationTest.java)<br>[analyzer/service/AnalyzerEventPersistenceServiceIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerEventPersistenceServiceIntegrationTest.java)<br>[analyzer/service/AnalyzerSiteBindingPersistenceIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerSiteBindingPersistenceIntegrationTest.java)<br>[analyzerimport/service/AnalyzerNormalizedResultImportIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzerimport/service/AnalyzerNormalizedResultImportIntegrationTest.java)<br>[analyzerresults/AnalyzerResultsServiceTest.java](../../src/test/java/org/openelisglobal/analyzerresults/AnalyzerResultsServiceTest.java)<br>[analyzerresults/service/AnalyzerResultsAcceptHoldIntegrationTest.java](../../src/test/java/org/openelisglobal/analyzerresults/service/AnalyzerResultsAcceptHoldIntegrationTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Hibernate object-mapping validation                          | [analyzer/AnalyzerSiteBindingOrmValidationTest.java](../../src/test/java/org/openelisglobal/analyzer/AnalyzerSiteBindingOrmValidationTest.java)<br>[analyzer/HibernateMappingValidationTest.java](../../src/test/java/org/openelisglobal/analyzer/HibernateMappingValidationTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Message contract / parser                                    | [analyzer/contract/AnalyzerBridgeContractConsumerTest.java](../../src/test/java/org/openelisglobal/analyzer/contract/AnalyzerBridgeContractConsumerTest.java)<br>[analyzerimport/service/AnalyzerNormalizedResultContractTest.java](../../src/test/java/org/openelisglobal/analyzerimport/service/AnalyzerNormalizedResultContractTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Isolated request/controller handling                         | [analyzer/controller/AnalyzerActivationRestControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerActivationRestControllerTest.java)<br>[analyzer/controller/AnalyzerConnectionProbeRestControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerConnectionProbeRestControllerTest.java)<br>[analyzer/controller/AnalyzerHeldResultRestControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerHeldResultRestControllerTest.java)<br>[analyzer/controller/AnalyzerInstanceRestControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerInstanceRestControllerTest.java)<br>[analyzer/controller/AnalyzerTypeRestControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerTypeRestControllerTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Permissions with substituted domain services                 | [analyzer/controller/AnalyzerTypeRestControllerSecurityTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerTypeRestControllerSecurityTest.java)<br>[analyzer/controller/AnalyzerWorkflowAuthorizationSecurityTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AnalyzerWorkflowAuthorizationSecurityTest.java)<br>[analyzer/controller/ImportIssuesRestControllerSecurityTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/ImportIssuesRestControllerSecurityTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Shared helper, not an executable test class                  | [analyzer/controller/AuthenticatedAnalyzerControllerTest.java](../../src/test/java/org/openelisglobal/analyzer/controller/AuthenticatedAnalyzerControllerTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Isolated backend logic / adapter                             | [analyzer/dao/AnalyzerProfileBindingDAOImplTest.java](../../src/test/java/org/openelisglobal/analyzer/dao/AnalyzerProfileBindingDAOImplTest.java)<br>[analyzer/form/AnalyzerInstanceRequestTest.java](../../src/test/java/org/openelisglobal/analyzer/form/AnalyzerInstanceRequestTest.java)<br>[analyzer/service/AnalyzerActivationRecordServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerActivationRecordServiceTest.java)<br>[analyzer/service/AnalyzerActivationServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerActivationServiceTest.java)<br>[analyzer/service/AnalyzerConnectionProbeServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerConnectionProbeServiceTest.java)<br>[analyzer/service/AnalyzerEventPersistenceServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerEventPersistenceServiceTest.java)<br>[analyzer/service/AnalyzerInstanceLocalStateServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerInstanceLocalStateServiceTest.java)<br>[analyzer/service/AnalyzerInstanceServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerInstanceServiceTest.java)<br>[analyzer/service/AnalyzerMappingCatalogServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerMappingCatalogServiceTest.java)<br>[analyzer/service/AnalyzerProfileBindingServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerProfileBindingServiceTest.java)<br>[analyzer/service/AnalyzerSiteBindingConfirmationServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerSiteBindingConfirmationServiceTest.java)<br>[analyzer/service/AnalyzerSiteBindingFingerprintTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerSiteBindingFingerprintTest.java)<br>[analyzer/service/AnalyzerSiteBindingServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerSiteBindingServiceTest.java)<br>[analyzer/service/AnalyzerTypeCatalogServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerTypeCatalogServiceTest.java)<br>[analyzer/service/AnalyzerTypeMappingServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/AnalyzerTypeMappingServiceTest.java)<br>[analyzer/service/BridgeAnalyzerConnectionClientTest.java](../../src/test/java/org/openelisglobal/analyzer/service/BridgeAnalyzerConnectionClientTest.java)<br>[analyzer/service/BridgeAnalyzerProfileTest.java](../../src/test/java/org/openelisglobal/analyzer/service/BridgeAnalyzerProfileTest.java)<br>[analyzer/service/BridgeHttpClientAuthenticationTest.java](../../src/test/java/org/openelisglobal/analyzer/service/BridgeHttpClientAuthenticationTest.java)<br>[analyzer/service/BridgeProfileCatalogServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/BridgeProfileCatalogServiceTest.java)<br>[analyzer/service/BridgeProfileManagementServiceTest.java](../../src/test/java/org/openelisglobal/analyzer/service/BridgeProfileManagementServiceTest.java)<br>[analyzer/service/QCResultProcessingServiceImplTest.java](../../src/test/java/org/openelisglobal/analyzer/service/QCResultProcessingServiceImplTest.java)<br>[analyzer/util/NetworkValidationUtilTest.java](../../src/test/java/org/openelisglobal/analyzer/util/NetworkValidationUtilTest.java)<br>[analyzer/valueholder/AnalyzerProfileBindingTest.java](../../src/test/java/org/openelisglobal/analyzer/valueholder/AnalyzerProfileBindingTest.java)<br>[analyzer/valueholder/AnalyzerSiteBindingModelTest.java](../../src/test/java/org/openelisglobal/analyzer/valueholder/AnalyzerSiteBindingModelTest.java)<br>[analyzerimport/service/AnalyzerNormalizedResultImportServiceTest.java](../../src/test/java/org/openelisglobal/analyzerimport/service/AnalyzerNormalizedResultImportServiceTest.java)<br>[analyzerresults/action/AnalyzerResultsPagingTest.java](../../src/test/java/org/openelisglobal/analyzerresults/action/AnalyzerResultsPagingTest.java)<br>[analyzerresults/action/beanitems/AnalyzerResultItemJsonContractTest.java](../../src/test/java/org/openelisglobal/analyzerresults/action/beanitems/AnalyzerResultItemJsonContractTest.java)<br>[analyzerresults/service/AnalyzerResultsServiceImplTest.java](../../src/test/java/org/openelisglobal/analyzerresults/service/AnalyzerResultsServiceImplTest.java) |
| Request handling in a database context; substituted importer | [analyzerimport/action/AnalyzerFhirImportControllerTest.java](../../src/test/java/org/openelisglobal/analyzerimport/action/AnalyzerFhirImportControllerTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Isolated result-selection logic in a database context        | [analyzerresults/service/AnalyzerResultsAcceptServiceResultMappingTest.java](../../src/test/java/org/openelisglobal/analyzerresults/service/AnalyzerResultsAcceptServiceResultMappingTest.java)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Neighboring tests to include in the focused regression set:

- [AnalyzerIngressSecurityTest](../../src/test/java/org/openelisglobal/security/AnalyzerIngressSecurityTest.java): ingress authentication policy with a test handler/configuration.
- [AnalyzerResultsControllerTest](../../src/test/java/org/openelisglobal/result/controller/AnalyzerResultsControllerTest.java): result-list response and role checks in a database-backed context.
- [TestCatalogEditorAnalyzersIntegrationTest](../../src/test/java/org/openelisglobal/testcatalog/controller/TestCatalogEditorAnalyzersIntegrationTest.java): catalog-to-analyzer references against database fixtures.
- [QCResultServiceTest](../../src/test/java/org/openelisglobal/qc/service/QCResultServiceTest.java) and [QCResultCreatedEventListenerTest](../../src/test/java/org/openelisglobal/qc/event/QCResultCreatedEventListenerTest.java): adjacent quality-control behavior; do not confuse this with proving an imported control actually persisted successfully.

#### Frontend and browser inventory

| Surface                             | Files / project                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Scope and limitation                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyzer components, 9 files        | `frontend/src/components/analyzers/`: `types.test.tsx`, `comboBoxSearch.test.js`, `AnalyzersList/AnalyzersList.test.jsx`, `AnalyzersList/AnalyzersList.profilePresentation.test.jsx`, `AnalyzerSetup/AnalyzerSetup.test.jsx`, `AnalyzerSetup/AnalyzerConnectionSetup.test.jsx`, `AnalyzerTypeMapping/AnalyzerTypeMappingEditor.test.jsx`, `AnalyzerTypeManagement/AnalyzerTypeManagement.test.jsx`, `AnalyzerTypeManagement/ControlRecognitionDraftEditor.test.jsx` | Component/helper behavior; server substitutes. Mapping editor uses real router and checks saved/confirmed payloads.                                                                                                                                     |
| Result components, 6 files          | `frontend/src/components/analyserResults/`: `AnalyserResults.test.jsx`, `AnalyserResults.test.js`, `Index.test.jsx`, `Index.test.js`, `ImportIssuesPanel.test.jsx`, `analyserResultsRefresh.test.jsx`                                                                                                                                                                                                                                                               | Mix of small helper tests, parent/child component tests and refresh behavior. The similarly named `.js`/`.jsx` files have different content; do not delete merely as apparent duplicates. Manual reprocessing cases are obsolete under the agreed plan. |
| Client request helpers, 2 files     | `frontend/src/services/analyzerService.activation.test.ts`, `analyzerService.siteBinding.test.ts`                                                                                                                                                                                                                                                                                                                                                                   | Request construction and client error handling, not backend execution.                                                                                                                                                                                  |
| Neighbor / harness guards           | `frontend/src/components/admin/testCatalog/sections/AnalyzersSection.test.jsx`; `frontend/scripts/analyzer-harness-fixture-policy.test.js`, `analyzer-harness-nginx.test.js`                                                                                                                                                                                                                                                                                        | Catalog UI and harness policy/configuration checks. These are additional to the 17 core frontend files.                                                                                                                                                 |
| Core browser smoke                  | [analyzer-list.spec.ts](../../frontend/playwright/tests/foundational/core/analyzer-list.spec.ts), [analyzer-navigation.spec.ts](../../frontend/playwright/tests/foundational/core/analyzer-navigation.spec.ts), `core-app` project                                                                                                                                                                                                                                  | Basic visible dashboard/navigation; not mapping recovery.                                                                                                                                                                                               |
| Catalog and mapping browser stories | [ogc-1054-m1-analyzer-types.spec.ts](../../frontend/playwright/tests/demo/harness/ogc-1054-m1-analyzer-types.spec.ts), [ogc-1054-m2-shared-mapping.spec.ts](../../frontend/playwright/tests/demo/harness/ogc-1054-m2-shared-mapping.spec.ts), `harness-foundational` project                                                                                                                                                                                        | Actual catalog and mapping UI, desktop/mobile, save/reload/confirmation. Directory name `demo` does not determine execution project.                                                                                                                    |
| Guided setup and assembled review   | [ogc-1054-m3-guided-setup.spec.ts](../../frontend/playwright/tests/demo/harness/ogc-1054-m3-guided-setup.spec.ts), [ogc-1054-analyzer-mvp.spec.ts](../../frontend/playwright/tests/demo/harness/ogc-1054-analyzer-mvp.spec.ts), `harness-demo` project                                                                                                                                                                                                              | Actual UI/service/database flow with simulated instrument traffic. Existing assembled story needs the replacement behavior in finding 9.                                                                                                                |
| Hardware-only browser story         | [analyzer-test-connection-manual-only.spec.ts](../../frontend/playwright/tests/manual-only/harness/analyzer-test-connection-manual-only.spec.ts), `harness-manual-only` project                                                                                                                                                                                                                                                                                     | Requires `GENEXPERT_HOST`, skips CI. Connection test, not complete clinical recovery acceptance.                                                                                                                                                        |

[playwright.config.ts](../../frontend/playwright.config.ts) defines these project
allowlists. [e2e-authoritative-reusable.yml](../../.github/workflows/e2e-authoritative-reusable.yml)
runs core and harness projects; [backend.yml](../../.github/workflows/backend.yml)
runs Maven tests. These are configured execution paths, not a claim about the
latest remote run. Frontend component tests run through Vitest; browser tests
are excluded from that runner. Maven's normal test task includes both isolated
and database test classes; the suffix alone is not a separate execution gate.

The harness uses [seed-analyzers.sh](../../projects/analyzer-harness/seed-analyzers.sh)
and [seed-mvp-traffic.sh](../../projects/analyzer-harness/seed-mvp-traffic.sh)
to create prerequisites through APIs and send native traffic through instrument
simulator → Bridge → OE. This is stronger than a substituted importer, but
setup actions are not proof the user performed those actions in the browser.

Separate component ownership:

- Bridge: `tools/openelis-analyzer-bridge/src/test/java/org/itech/ahb/`, including
  `fhir/FhirBundleBuilderLoincTest.java` (unknown raw-code preservation), protocol
  parsers, `normalizer/`, `contract/`, and control-recognition tests.
- Instrument simulator: `tools/analyzer-mock-server/test_*.py`, including
  `test_priority_profile_templates.py`, `test_bridge_profile_adapter.py`,
  `test_simulate_astm_qc_api.py`, `test_file_output_paths.py`, and transport tests.
  The simulator stands in for physical instruments; it is different from
  replacing an internal OE service with a no-op Mockito object.
- Exact deployed-build review and real hardware remain separate evidence;
  neither is inferred from these source files or earlier green test counts.

#### Evidence at the time of the audit

No new tests were run for this catalogue. Earlier local evidence was **11 import
database tests + 13 import unit tests**, and **14 frontend tests in two files**,
with the earlier per-class real-audit setup. Those results do not validate the
current unfinished setup cleanup or automatic recovery. The subsequent cleanup
attempt reported **17 setup errors because Testcontainers could not access
Docker**; it never reached the intended behavioral checks. Do not describe that
run as an established failing behavior test.

At catalogue time, four history-test overrides and the import suite's local
overrides have been removed in the working tree, while `AppTestConfig` still
supplies the original substitutes. That is an incomplete cleanup, not a fixed
shared setup. No cleanup commit, new full-suite pass, or current assembled
acceptance is claimed.

### Analyzer test remediation execution plan

**Stable goal target:** this heading in
`specs/roadmaps/ogc-1054-analyzer-feature-roadmap.md`, link
[#analyzer-test-remediation-execution-plan](#analyzer-test-remediation-execution-plan).
The catalogue above is the audit baseline; this section owns execution status.
The product [acceptance checks](#acceptance-checks) below remain authoritative.
Do not create another plan or copy those checks into a separate task file.

**Goal to use:**

> Implement the Analyzer test remediation execution plan in
> `specs/roadmaps/ogc-1054-analyzer-feature-roadmap.md`. Complete T1, T2 and T3 in
> order, consolidating the analyzer test setup and replacing shortcuts with
> tests through actual application services. Preserve separate duplicate-delivery
> protection and unrelated local work. Iterate on demonstrated failures and
> review findings until each milestone's validation gate and the existing
> held-result acceptance checks pass. Deliver reviewable commits and an
> assembled build identified by exact component revisions, with linked test
> evidence and this section updated. Keep named human acceptance separate.

The full goal includes the agreed recovery implementation in T3. A goal limited
to test foundations can explicitly target **T1 and T2 only**; it must leave T3
and the product acceptance checks open rather than claiming the workflow done.

#### Starting safely

- Recheck worktrees, branch, HEAD, staged/unstaged changes, submodule pins and
  current PR relationships before editing. The audit describes a dirty working
  tree at `762d40589b`, not a clean implementation checkpoint.
- Preserve and inspect the unfinished production/test changes already present.
  Four audit-test overrides and the import suite's local overrides were removed
  without completing the shared setup. Reconcile that partial work first;
  do not add another per-test workaround or discard it blindly.
- This documentation commit contains the catalogue and plan only. A fresh
  checkout of it will not contain the described uncommitted implementation.
  Establish the actual starting diff and record it in T1's evidence.
- Verify Docker access before database tests. A container startup failure is an
  environment failure, not a demonstrated failing business rule. Check Java 21
  and the existing local Testcontainers configuration.
- Run formatting only within the intended checkout. Nested reporting worktrees
  must not be traversed or changed by broad formatter patterns.

#### Ordered milestones and validation gates

| Milestone                                      | Scope and finding ownership                                                                                                                                                                                                                                                                                                                                                                             | Validation gate before completion                                                                                                                                                                                                                                                                                                                                                                                             | Initial status                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **T1 — Consolidate the test foundation**       | Findings **1, 2, 5, 7**. Provide real history recording and FHIR parsing for analyzer database integration; remove repeated dependency swaps; move isolated controller/selection tests out of the broad database context. Consolidate the fixture ownership and cache/cleanup behavior needed by this regression group. Audit other shared substitutes only when the actual analyzer path reaches them. | The real injected services parse messages and persist history without per-test repairs. Affected analyzer and audit suites pass together in normal and reversed class order. Test-owned state is cleaned up and required seed records survive. Run affected neighboring suites if a shared default changes. No new mock hides a discovered internal failure.                                                                  | **Started; unvalidated.** Partial local cleanup exists. |
| **T2 — Prove the real mapping lifecycle**      | Findings **3, 4, 6, 8**. Use injected local services and real catalog/user data for mapping revision creation, confirmation, independent adoption and import. Replace in-place changes to an existing mapping revision and add database query cases. Keep request/security tests explicitly scoped.                                                                                                     | Two analyzers genuinely adopt revisions independently; unconfirmed mappings remain ineligible; old revisions and confirmation history survive reload. Actual queries distinguish profiles/revisions. Save/confirm/adopt reject unauthorized requests without writes. Existing receipt replay, concurrency and rollback assertions still pass. Database tests run without fake internal mapping/confirmation/history services. | **Pending T1.**                                         |
| **T3 — Complete recovery and assembled proof** | Findings **9, 10, 11**. Implement the agreed automatic recovery, replace manual/obsolete expectations, preserve unsaved edits, report actual control outcomes and correct harness confirmation preparation. Use the existing implementation order above for production changes.                                                                                                                         | All existing held-result acceptance checks below pass, including either event order, partial recovery, existing backlog, repeats/concurrency, source history and unsaved edits. The real-browser story recovers the original held rows after adoption without resend or a reprocess button. Review stored outcomes, console/trace/screenshots and the exact build; fix actionable review findings and rerun affected checks.  | **Pending T2.**                                         |

Keep T1 independently reviewable from recovery production changes. Use one
bounded PR per milestone where required by the repository workflow, with small
coherent commits inside each. T2 may build on the existing receipt dependency;
T3 continues the recovery change. Refresh actual branch/PR relationships before
publishing. Preserve #4241's duplicate-delivery protection independently of
#4256's recovery behavior. No merge or deployment is implied by this plan.

T2 establishes real state transitions, eligibility and incoming import; it does
not need to implement automatic held-row recovery before T3. A passing T2 is a
trustworthy foundation, not completion of the product acceptance checks.

#### Findings register

Statuses are **Open**, **In progress — unvalidated**, or **Validated**. Mark a
finding validated only with a commit and relevant evidence. A coverage boundary
can be closed by explicit scoping plus the missing higher-level proof; it does
not require deleting useful narrow tests. Keep this table current after each
milestone rather than rewriting the historical audit as though it were current.

| Finding                                            | Owning change | Status                    | Evidence                                   | Remaining limitation                                                    |
| -------------------------------------------------- | ------------- | ------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| 1. Shared internal substitutes                     | T1            | Open                      | Catalogue source links                     | Shared setup still substitutes history and parsing.                     |
| 2. Shared-instance dependency swaps                | T1            | In progress — unvalidated | Local removals described in audit baseline | Shared setup incomplete; no successful post-cleanup run.                |
| 3. Mapping changes bypass lifecycle                | T2            | Open                      | Catalogue source links                     | Same-revision SQL changes and replacement confirmations remain.         |
| 4. Manually assembled persistence services         | T2            | Open                      | Catalogue source links                     | Does not yet prove ordinary injected service wiring.                    |
| 5. Isolated tests using broad database setup       | T1            | Open                      | Catalogue source links                     | Unnecessary context and dependency replacement remain.                  |
| 6. Queries tested with substituted results         | T2            | Open                      | Catalogue source links                     | Database discrimination cases not established.                          |
| 7. Shared fixture/cached-state isolation           | T1            | Open                      | Catalogue source links                     | Order independence after consolidation unproved.                        |
| 8. Request/permission test boundaries              | T2            | Open                      | Catalogue source links                     | Real mutation authorization and explicit scope still need verification. |
| 9. Superseded manual/browser expectations          | T3            | Open                      | Catalogue source links                     | Replacement workflow not yet implemented/proved.                        |
| 10. Unresolved rows treated as excluded by harness | T3            | Open                      | Catalogue source links                     | Partial-mapping harness case not exercised.                             |
| 11. Missing automatic-recovery acceptance          | T3            | Open                      | Acceptance checks below                    | All product acceptance checks remain open.                              |

#### Iteration and evidence rules

1. Select a finding and its owning milestone. State what behavior the check will
   prove and which dependencies must run for real.
2. Reproduce the relevant failure or establish the missing behavior with a
   failing test. Record the failure cause; compilation/container failures do not
   substitute for a behavioral failure.
3. Make the smallest complete correction and remove the superseded workaround
   or expectation. Fakes remain appropriate for isolated logic and external
   boundaries; avoid blanket replacement of all shared substitutes.
4. Run focused checks, inspect persisted results and history where relevant,
   then run the affected regression group. Broaden testing when shared setup or
   new failures justify it. Perform the milestone's specific validation gate.
5. Format within the checkout, complete the required build/checks, review the
   diff and commit only coherent completed work. If a shared setup repair
   exposes an unrelated failure, record the actual failure and scope before
   deciding where its fix belongs; never weaken its assertion to obtain green.
6. Update the findings register and milestone status with the implementation
   commit, exact commands/test selection, result, durable artifact link and
   remaining limitations. Reconcile review findings and rerun affected checks
   against the final revision before marking the milestone validated.

For executed evidence, use the existing CI test-report/artifact locations or an
explicit retained local artifact path. Temporary log names alone are not a
review handoff. Record tested HEAD **and any uncommitted diff**; tests against a
dirty tree cannot be attributed solely to its HEAD. Distinguish source audit,
unit tests, database tests, browser evidence, CI, and named human acceptance.

**Completion:** T1/T2/T3 gates and all held-result acceptance checks are
satisfied on the final reviewed revisions; every finding is validated with
linked proof or an explicitly reviewed scope decision; obsolete paths/tests are
removed; no required verification is left merely proposed. A test count or a
successful build alone does not complete the goal. G0 named human acceptance
remains a separate status.

### Acceptance checks

All checks below are pending. Existing tests for the draft manual action do not
prove this behavior.

- [ ] An unknown test absent from the profile and an unknown qualitative value
      both open the same editor, accept only valid local targets, and survive
      save, reopen, and confirmation.
- [ ] Two analyzers sharing a mapping adopt independently. An unconfirmed edit
      affects neither incoming nor held results. Both
      adoption-before-confirmation and confirmation-before-adoption use only
      each analyzer's eligible revision.
- [ ] Both mapping-related hold reasons recover automatically. In a mixed batch,
      resolved rows enter ordinary review, unresolved rows remain held, and
      attention/worklist counts match persisted state.
- [ ] Existing eligible backlog, repeated confirmation/adoption, concurrent
      processing, and duplicate transport delivery create no duplicate results
      and never overwrite already reviewed results or bypass delivery receipts.
- [ ] Source and mapping audit survive; analyzer/connection/profile ownership
      and permissions are enforced; unrelated hold reasons remain untouched;
      explicit exclusions follow the existing audit and retention contract.
- [ ] Worklist refresh preserves unsaved edits, and control outcomes reflect
      actual persisted processing rather than unconditional success.
- [ ] Focused JUnit 4, database, authorization, and real-router tests pass. The
      assembled visible flow recovers the original held result without resend or
      manual reprocessing. Inspect console, trace, and screenshots, then
      complete the applicable PR gates and named review on an identified build.

### Keeping one plan

The specification and feature map link here instead of copying the plan. When
publishing the amendment, update #4256's title/description and OGC-1220's
cross-link to point here and remove the obsolete manual-action/product-decision
wording. Those external descriptions have not yet been updated. Keep review
state in GitHub and reviewer answers in Grist; do not create a second task list,
proposal, or evidence ledger. Scope changes and implementation progress belong
in this section.

## Execution Loop

For every bounded behavior change:

1. Select one acceptance statement and name its owning repository.
2. Audit affected tests first: retain, rewrite, move, or delete. A test for the
   superseded architecture is not evidence.
3. Record the smallest failing test at the owning layer. Cross-repository
   behavior starts with producer and consumer contract failures.
4. Implement the smallest complete behavior and remove its replaced writer,
   reader, route, field, and test in the same slice.
5. Run owning tests, then the relevant integration and assembled tests.
6. Compare code and tests to this roadmap and run `digi-uw/code-qa` alignment,
   coverage, simplicity/legacy, companion, and evidence checks.
7. For visible behavior, inspect console output, trace, screenshots, runtime
   state, and desktop/mobile design comparison before recording video.

No later UI, screenshot, or video can waive a lower-layer failure.

Acceptance tests define the allowed system positively. Do not retain
source-file, class-name, or string blacklists for deleted implementations: the
possible wrong implementations are unbounded, and such checks are not
behavioral evidence. Delete superseded code, migrations, tests, and guidance;
use closed schemas, typed provider/consumer contracts, persistence and
migration integration, and assembled behavior to prove the resulting
architecture.

## Checkpoints

### R0 - Canonical Roadmap And Architecture

Deliver:

- one concise product specification, this roadmap, and one visual feature map;
- explicit Bridge/OE/mock/review ownership and profile semantics;
- a one-time released-data migration decision;
- historical 011/014 specifications reduced to provenance pointers; and
- deletion of duplicate plan/task/checklist/evidence documents.

Exit:

- the three canonical documents agree;
- only this file contains roadmap markers;
- old documents cannot be mistaken for implementation direction; and
- the user approves this architecture before lower-stack correction resumes.

### F0 - Acceptance Foundation

Deliver closed contract fixtures and executable owner tests proving:

- the OpenELIS analyzer contract contains only LIMS-owned state and a Bridge
  connection reference;
- the Bridge profile contract retains communication behavior and
  new-connection defaults through generic consumers;
- Bridge owns connection/runtime behavior and FILE transport;
- migration has one explicit outcome for each released analyzer; and
- Playwright user stories interact only through visible UI, enforced by the
  existing syntax-aware lint rule.

Priority profile fixtures prove the same profile data drives Bridge and mock
behavior. A synthetic valid profile proves OE renders the declared Bridge
contract without a fixed connection schema.

Exit: invalid contract fixtures are demonstrated red, accepted fixtures and
owning behavior are green, and no deleted implementation remains in the diff.

### E0 - Versioned Contracts And Migration Boundary

Deliver versioned producer/consumer schemas and fixtures for:

1. the single Bridge profile revision contract;
2. generic Bridge connection create/read/update/probe/activate/deactivate;
3. the reference-only OE analyzer contract;
4. exact activation command and acknowledgment;
5. normalized patient/control/unknown traffic with raw context; and
6. migration plan/apply/verify manifests and per-analyzer outcomes.

Connection create and commands are idempotent; updates use optimistic
concurrency; secrets are masked; probes are non-mutating; restart restores the
acknowledged active revision. The migration never infers a profile from a name,
plugin class, protocol, code, or LOINC.

Exit: both repositories consume the same closed fixtures, and provider/consumer
tests accept only the reference and command contracts declared here.

### M1 - Bridge Profiles And Analyzer Types

Deliver:

- the existing profile system evolved to the E0 contract, with one Bridge
  catalog and immutable Draft/Publish/Update/Duplicate/Deactivate lifecycle;
- only the three priority profiles published and tested end to end;
- no runtime profile files or profile-serving/application path in OE;
- a composed Carbon Analyzer Types list/detail/history/authoring workflow; and
- URL-backed search, filters, selected profile/revision/tab, breadcrumbs,
  reload, browser history, and matching `Analyser Import`/Global Administrator
  route and endpoint authorization.

Exit: each priority profile passes schema, semantic, runtime, mock transport,
and visible-flow proof through generic code; a new revision never repoints a
connection implicitly; unrelated authenticated roles cannot read or mutate
Analyzer Types.

### M2 - Local Mapping And Recognition Verification

Deliver:

- one profile-revision-scoped OE site binding;
- complete Test search and Result Option selection constrained to the mapped
  active Test;
- bound, excluded, and unresolved states with deterministic suggestions only;
- human-readable Bridge recognition summary and confirmation;
- durable revision/fingerprint/actor/time audit; and
- removal of per-analyzer mapping, `AnalyzerQcRule`, copied rule arrays, and
  hidden Bridge recognition fallbacks.

Exit: every distinct priority-profile concept is visible; shared LOINC never
collapses rows; stale verification is deterministic; operational QC changes do
not stale or gate mapping/activation.

### M3 - Guided Setup, Connection, Activation, And QC Link

Work these slices in order within the active paired PRs:

1. **Connection contract correction:** rewrite current full-state sync/probe
   tests to E0's durable Bridge connection contract.
2. **Bridge persistence:** create, update, probe, activate, deactivate, restart,
   optimistic-concurrency, idempotency, and secret-handling tests and code.
3. **Upgrade migration:** test plan/apply/verify against released OE fixtures;
   add the Bridge reference, migrate each retained analyzer without guessing,
   verify restart, then remove migration-only and old runtime schema/code for
   the final candidate.
4. **OE boundary:** retain only local fields and Bridge references; mediate the
   generic API; remove fixed connection fields, profile-default copying,
   protocol decisions, full-state registration, startup replay, and obsolete
   tests.
5. **Guided Carbon UI:** preserve the inline Instrument/Verify/Connect workflow,
   lab-unit selection, summaries, URL state, breadcrumbs, and return paths;
   replace the protocol-specific form with a reusable descriptor renderer.
6. **Lifecycle:** make one OpenELIS lifecycle service the only writer that can
   move an analyzer into `ACTIVE`; show every local and Bridge blocker;
   build and synchronize one immutable candidate; require its exact Bridge
   acknowledgment; activate/deactivate that exact revision; keep draft edits
   from mutating the last active candidate; and make probe evidence visible but
   non-gating.
7. **QC link:** open the existing analyzer-scoped OE QC workflow and prove QC
   changes never alter setup verification or activation; use the same analyzer
   permission at the visible route and REST boundary.
8. **Preview:** deploy the PR-backed OE/Bridge/mock stack, sync the applicable
   Grist steps, and inspect the complete M3 visible flow.

Exit:

- Bridge restart restores the active connection exactly;
- a synthetic profile field change requires no OE production/schema change;
- the released-data migration reports every source analyzer and leaves no old
  runtime path in the final candidate;
- no OE connection value, protocol/transport branch, full-state writer,
  `AnalyzerQcRule`, duplicate create/edit route, or duplicate connection modal
  remains;
- create/update payloads and mapping, connection, error, or offline events
  cannot activate an analyzer or bypass the lifecycle service, and no hard
  delete path remains;
- analyzer setup, probe, lifecycle, and linked QC reject unrelated
  authenticated roles at the endpoint and visible-route boundaries; and
- focused backend, RTL, contract, assembled, accessibility, and visual gates
  pass.

### M4 - Safe Result Traffic And Integrated MVP

Deliver:

- known patient and recognized-control traffic through real Bridge transports;
- durable hold and visible attention for unknown tests and values;
- local mapping resolution as amended by the
  [OGC-1220 remediation](#ogc-1220-held-result-remediation);
- analyzer result review and resolution use the same established analyzer
  permission at both page and endpoint boundaries;
- priority ASTM and FILE mock stories plus a generic HL7 contract fixture;
- outbound orders addressed only by Bridge connection ID plus clinical order;
  and
- removal of superseded OE plugin routing, raw import/parser paths, local
  `AnalyzerType` registry, and direct-to-OE mock acceptance modes after parity.

The following slices record the original M4 delivery scope. Its PRs are merged;
new held-result work follows the OGC-1220 section above, not the former stack.

1. **Profile lifecycle.** In M1 and M2, complete Create Profile through an
   editable, publishable Bridge draft; prove duplicate is single-submit,
   preserves Bridge lineage, leaves its source unchanged, and initializes a
   separate unconfirmed OE site binding from the source mapping decisions,
   including observed unresolved concepts. Prove Bridge lifecycle behavior in
   contract/persistence tests and OE behavior in service/integration tests plus
   real-router RTL.
2. **Mapping and attention.** In M2, make completeness and Needs Attention
   include both profile-declared concepts and observed unresolved tests/values,
   and recompute them after traffic or site-binding changes. Give unknown tests
   and unknown values one catalog-backed resolution workflow; allow only valid
   active local targets and audit the decision. Held-result recovery follows the
   [OGC-1220 remediation](#ogc-1220-held-result-remediation). Expose the
   site-binding mapping history in that workflow with its actor, time, profile
   revision, and mapping decisions; profile-publication history must not
   masquerade as local mapping history. Prove domain behavior in OE integration
   tests and visible behavior in real-router RTL before the assembled story.
3. **Connection and QC.** In M3, restore the Bridge-provided latest probe after
   reload. Starting Add Analyzer while another analyzer is open must clear the
   prior identity and create a new analyzer, while setup breadcrumbs and
   lifecycle confirmations must name the current analyzer and focused action.
   Make the canonical New Control Lot action submit successfully; restrict its
   Test choices to active tests mapped for the selected analyzer; surface
   required statistics and server validation beside their owning fields; and
   show profile display names rather than raw identifiers. Rerun activation
   against the current build and fix it in this candidate if the historical
   server failure remains; do not change activation from stale evidence alone.
   Prove probe persistence in Bridge/OE consumer tests and QC behavior in OE
   integration tests plus real-router RTL. Operational QC remains separate and
   never gates verification or activation.
4. **Result review.** In M4, show source analyzer identity and raw source
   context for normal, held, control, and FILE traffic, including the source
   unit when the analyzer supplied one. Use Bridge and analyzer-mock transport
   tests for transmission and an external demo-operator action for resend; do
   not add an OE mock control. Finish with the UI-only patient, control,
   unknown-test, unknown-value, and FILE Playwright stories.

Original exit: all four remediation slices are green in M4 and any required
companion PRs; patient/control/unknown behavior is proven in owning tests and
UI-only assembled Playwright stories; focused console, trace, runtime,
accessibility, and desktop/mobile screenshot review passes; and no old analyzer
runtime path survives. Current deployment and acceptance follow G0 after the
OGC-1220 correction; merging the original M4 PR does not close that gate.

### G0 - Exact Deployment And Human Acceptance

Deliver:

- exact OE, Bridge, mock, profile-catalog fingerprint, and review-tooling build
  metadata on `analyzers.openelis-global.org`;
- the 17 required Grist steps against that unchanged build;
- named human product-reviewer results; and
- inspected test reports, console, trace, desktop/mobile screenshots, visual
  comparison, MP4, build metadata, checklist revision, and exported report.

Exit: all 24 MVP criteria and all required UAT steps pass. Any failed required
step blocks acceptance and is triaged; issue filing remains an explicit human
action.

### R1 And R2 - Full Feature And Rollout

R1 adds broader profile curation/distribution, profile revision diff, bulk
adoption and rollback, mature alert triage/concurrency, maintenance/fleet
health, and full-feature UAT. R2 qualifies upgrades, migration, performance,
observability, backup/restore, operator guides, and representative site rollout.

## MVP Acceptance Criteria

| ID      | Observable acceptance                                                                                                                                                                                                                                                                                           | Required proof                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| MVP-001 | Authorized users see searchable/filterable shipped and site Analyzer Types, completeness, use, lifecycle, and attention state; completeness and attention include observed unresolved tests/values and refresh after traffic or site-binding changes; unrelated authenticated roles cannot read or mutate them. | OE security/integration + real-router RTL + UI E2E                     |
| MVP-002 | Create reaches an editable, publishable draft; duplicate preserves lineage and initializes a separate unconfirmed OE site binding from the source decisions without changing the source; create, duplicate, update, publish, deactivate, and reactivate are audited and single-submit; no delete exists.        | Bridge contract/integration + OE service/integration + real-router RTL |
| MVP-003 | Published revisions are immutable and retained; update/duplicate never repoints a connection.                                                                                                                                                                                                                   | Bridge persistence/restart tests                                       |
| MVP-004 | The three priority profiles retain both profile jobs, use generic runtime code, and contain no operational-QC or site-instance values.                                                                                                                                                                          | Schema/semantic tests + Bridge/mock transport                          |
| MVP-005 | Every emitted test concept is independently visible and maps by complete active-catalog search; suggestions are uniquely deterministic.                                                                                                                                                                         | OE service/integration + RTL                                           |
| MVP-006 | Qualitative mappings target only active Result Options of the mapped Test; invalid/inactive/cross-test choices fail.                                                                                                                                                                                            | OE service/integration + RTL                                           |
| MVP-007 | Recognition is explicit `RULES` or affirmed `NONE`, evaluated only by Bridge, and shown as a plain-language confirmation.                                                                                                                                                                                       | Bridge profile/runtime + OE consumer/RTL                               |
| MVP-008 | Verification records exact profile/binding/recognition fingerprints, row states, actor, and time; relevant changes stale it, QC changes do not.                                                                                                                                                                 | OE persistence/audit integration                                       |
| MVP-009 | Mapping has one Analyzer Types editor with URL-backed state and return paths; no per-analyzer editor or duplicate queue exists.                                                                                                                                                                                 | Routing integration + real-router RTL + UI E2E                         |
| MVP-010 | Authorized users see Add Analyzer inline on `/analyzers`; Instrument, Verify, and Connect reveal in order and retain list context; unrelated authenticated roles cannot open or invoke setup.                                                                                                                   | OE security/integration + RTL + UI E2E                                 |
| MVP-011 | Meaningful routes, query state, breadcrumbs, reload, back, forward, headings, lab-unit labels, and the latest structured connection-probe evidence are deterministic.                                                                                                                                           | Bridge/OE consumer + real-router RTL + accessibility/UI E2E            |
| MVP-012 | Released OE analyzer configurations migrate once to explicit Bridge profile pins/connections with complete outcomes; old schema/code/tool is absent from G0 runtime.                                                                                                                                            | Migration integration + final-schema integration                       |
| MVP-013 | Bridge durably creates and edits a profile-pinned connection; OE renders generic fields and stores no analyzer-facing value.                                                                                                                                                                                    | Cross-repo contract + persistence + RTL                                |
| MVP-014 | Probe is structured and non-mutating; synthetic profile fields and defaults change without OE production or schema changes.                                                                                                                                                                                     | Bridge tests + OE consumer contract/RTL                                |
| MVP-015 | Analyzer-scoped Quality Control opens the canonical OE workflow under the same analyzer permission; New Control Lot saves and offers only active Tests mapped for that analyzer; profile names are user-facing; QC changes never alter verification or activation.                                              | OE security + analyzer/QC integration + real-router RTL + UI E2E       |
| MVP-016 | Activation/deactivation uses the exact connection/profile/config/runtime acknowledgment, shows each blocker, preserves history, and never depends on QC or probe success.                                                                                                                                       | OE/Bridge contract + lifecycle integration + RTL                       |
| MVP-017 | Connection commands are concurrency-safe/idempotent and Bridge restart restores the exact active revision; OE performs no full-state replay.                                                                                                                                                                    | Bridge restart/contract + OE service integration                       |
| MVP-018 | Known patient and recognized-control traffic reaches the correct OE workflow; normal, held, control, and FILE review show source analyzer identity and raw source context.                                                                                                                                      | Bridge/mock transport + OE assembled integration + UI E2E              |
| MVP-019 | Unknown tests/values are durably held, visibly flagged, included in Analyzer Type completeness/attention, and never clinically posted or dropped.                                                                                                                                                               | OE persistence/integration + real-router RTL + UI E2E                  |
| MVP-020 | Unknown-test and unknown-value resolution satisfies the [OGC-1220 acceptance checks](#acceptance-checks).                                                                                                                                                                                                       | OE security/integration + real-router RTL + UI E2E                     |
| MVP-021 | ASTM, HL7, and FILE fixtures prove patient/control/nonmatch/unknown behavior; FILE watching exists only in Bridge.                                                                                                                                                                                              | Bridge/mock suites + assembled integration                             |
| MVP-022 | New UI uses reusable Carbon components, React Intl, one semantic heading, keyboard/focus behavior, and no overlapping text at desktop/mobile sizes.                                                                                                                                                             | RTL/a11y + inspected screenshots                                       |
| MVP-023 | Analyzer dashboard, Analyzer Types, setup, mapping, and QC links form one consistent visual workflow compared with `openelis-work@main`.                                                                                                                                                                        | Desktop/mobile visual review + named human UAT                         |
| MVP-024 | One unchanged deployment identifies exact component builds and checklist revision across tests, screenshots, trace, MP4, and report.                                                                                                                                                                            | Build manifest + review-tooling report                                 |

## Test Ownership

| Layer                   | Proves                                                                                                              | Must not substitute for           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| OE JUnit 4/integration  | Local domain, persistence, migration, audit, activation, QC independence, hold/resolution, Bridge consumer contract | Browser interaction               |
| Bridge repository tests | Profile/connection contracts, persistence, protocols, parsing, probes, commands, restart, FILE behavior             | OE clinical decisions             |
| Analyzer mock tests     | Deterministic real analyzer transport and failure cases using accepted profiles                                     | Product workflows                 |
| RTL with real router    | Carbon behavior, validation, URL state, bookmarks, history, reload, headings, breadcrumbs                           | Backend contracts                 |
| Assembled harness       | Real OE + Bridge + mock + database behavior and durable outcomes                                                    | Human usability                   |
| Playwright              | Visible user stories only                                                                                           | API assertions or backend polling |
| Grist UAT               | Named human functional and visual acceptance of an exact build                                                      | Automated regression coverage     |

Playwright user stories prohibit `page.request`, API assertions, backend
polling, forced controls, arbitrary waits, and fixture mutation during the
story. Seed/fixture loading is a precondition only. Run non-video first; inspect
console, trace, screenshots, and runtime state; record MP4 only afterward.

Every checkpoint runs focused tests first, then its affected package suites,
format/lint checks, assembled contracts where applicable, and `digi-uw/code-qa`.

## Required Grist UAT

1. `AN-MVP-001` Find and inspect a shipped Analyzer Type.
2. `AN-MVP-002` Create and publish a new Analyzer Type, then duplicate an
   existing type and inspect lineage, copied local mapping decisions,
   single-submit behavior, deactivation, reactivation, and revision history.
3. `AN-MVP-003` Review test mappings and resolve a catalog match.
4. `AN-MVP-004` Map a qualitative value using only that Test's Result Options.
5. `AN-MVP-005` Confirm the control-recognition summary.
6. `AN-MVP-006` Start Add Analyzer inline from the dashboard.
7. `AN-MVP-007` Select a type, name the analyzer, and assign lab units.
8. `AN-MVP-008` Save and reload the Bridge-owned connection through Connect.
9. `AN-MVP-009` Run a visible connection test, reload, and confirm its latest
   structured evidence remains visible.
10. `AN-MVP-010` Review blockers, activate, deactivate, and reopen the analyzer.
11. `AN-MVP-011` Send a known patient result through the mock and Bridge and
    confirm normal review shows its analyzer/source context.
12. `AN-MVP-012` Prove the unknown-test flow in the
    [OGC-1220 acceptance checks](#acceptance-checks).
13. `AN-MVP-013` Send a recognized control, open linked operational QC, and
    prove a control lot can be saved using only a mapped Test.
14. `AN-MVP-014` Send an unknown qualitative value and confirm it is held.
15. `AN-MVP-015` Prove the unknown-value recovery flow in the
    [OGC-1220 acceptance checks](#acceptance-checks).
16. `AN-MVP-016` Repeat the visible traffic story with a priority FILE type and
    confirm row-level analyzer/source context without an OE FILE configuration
    or import path.
17. `AN-MVP-017` Review desktop/mobile clarity, breadcrumbs, bookmark/reload,
    back/forward, focus, and overall consistency.

Grist is the checklist source. The overlay must refresh current steps, preserve
answers by stable step key, show errors, and export checklist revision, route,
actual URL, mark time, notes, reviewer, and exact build metadata. Review-tooling
changes require their own PR only when a failing harness contract proves a gap.

## Final Gate

G0 completes only when R0 through M4 and the OGC-1220 correction are merged,
`MVP-001` through `MVP-024` pass, the exact
OE/Bridge/mock/profile-catalog/review-tooling revisions are deployed, all 17
Grist steps pass under a named human product reviewer, and the inspected
evidence bundle describes one unchanged deployment.
