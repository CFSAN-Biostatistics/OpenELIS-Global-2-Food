# Reporting MVP UAT Contract

This file defines the implementation-facing UAT contract. The central Grist
document in `DIGI-UW/openelis-review-tooling` is the live checklist source of
truth after deployment. Do not serve this Markdown as a second checklist.

## Target and Evidence

- UAT host: `reporting.catalyst.openelis-global.org`
- Checklist instance: `reporting`
- Application route: `/CustomDataExport`
- Deployment identity: `/__review/target.json`
- Public checklist: `https://grist.openelis-global.org/uat/reporting.json`
- Fixture period: 2026-05-05 through 2026-05-05
- Repeated-result accession: `REPORTING-MVP-REPEAT`
- Repeated configured test: `Viral Load`
- Independent repeated values: two results whose displayed value is `450`
- Referral fixture: `REPORTING-MVP-REFERRAL`
- Non-conformance fixture: `REPORTING-MVP-NCE`

Fixtures are public synthetic data. Seeding is idempotent for one deployment
and must refuse to overwrite a real record that reuses a stable identifier.
Each state-changing story has its own prepared data or reset boundary.

## RPT-S01 — Routine Sample and Testing Export

**User story**: As a report user, I can build and download a useful routine
Sample & Testing report in either layout without losing repeated results.

1. `RPT-001` required — Sign in as the assigned report user and navigate through
   Reports to Custom Data Export. Expect the Sample & Testing builder, date
   controls, filters, available fields, ordered selection and header preview to
   be usable without another permission/setup journey.
2. `RPT-002` required — Choose 2026-05-05 for both dates, keep Spreadsheet, and
   select Accession Number, Specimen ID and Viral Load in that order. Expect the
   review and header preview to show exactly that period and column order.
3. `RPT-003` required — Generate and download the spreadsheet. Inspect the CSV,
   not only the READY badge. Expect two data rows for
   `REPORTING-MVP-REPEAT`, with two independent Viral Load values of `450`; no
   result is collapsed or replaced by a latest-only value.
4. `RPT-004` required — Switch to Detailed result list for the same period and
   download it with Result ID, Accession Number, Test Name and Result Value.
   Expect the same two results once each, with distinct Result IDs and the value
   `450` for both.

## RPT-S02 — Reuse a Shared Report

**User story**: As a second report user, I can reuse an instance-shared report
definition with fresh dates and my own access.

1. `RPT-101` required — As report user A, configure the RPT-S01 spreadsheet and
   save it as `Routine Viral Load UAT`. Expect it in the shared report list with
   the selected layout, ordered columns and non-date filters.
2. `RPT-102` required — Sign out and sign in as report user B. Open
   `Routine Viral Load UAT`. Expect the definition to open without an invitation
   and require a fresh reporting period before generation.
3. `RPT-103` required — Enter 2026-05-05 for both dates, generate and download.
   Expect the same configured header and the results permitted to user B;
   report user A's generated job/file does not appear in user B's queue.
4. `RPT-104` required — Save a copy, then update it after confirmation. Expect
   the original and copy to remain distinct and a stale concurrent update to be
   refused rather than silently replacing another user's changes.

## RPT-S03 — Configured Referral and Non-Conformance Reports

**User story**: As a report user, I can run the other mock-derived report types
through the same reporting experience.

1. `RPT-201` required — Select Referrals, use the fixture period and generate a
   report including the referral identity, accession, destination, event date
   and status. Expect exactly one `REPORTING-MVP-REFERRAL` occurrence with the
   configured date meaning and no duplicated rows.
2. `RPT-202` required — Select Non-Conformance, use the fixture period and
   generate a report including the event identity, accession, reason, event
   date and status. Expect exactly one `REPORTING-MVP-NCE` occurrence linked to
   its sample and no duplicated rows.
3. `RPT-203` required — Return to Sample & Testing and inspect the builder and
   queue. Expect the same page, selection/review behavior and delivery controls;
   the report types do not open separate report-specific applications.

## RPT-S04 — Queue and Recovery

**User story**: As a report user, I can return to completed work and recover
from ordinary queued or failed jobs without reconstructing the report.

1. `RPT-301` required — Leave the builder after submitting a report, return to
   My Report Queue and open the completed job. Expect the period, row count and
   READY state, and expect re-download to return the same stored bytes.
2. `RPT-302` required — Open the prepared failed job and choose Retry. Expect a
   new linked job with the same frozen definition, columns and scope while the
   original remains FAILED.
3. `RPT-303` required — Cancel the prepared queued job after confirmation.
   Expect CANCELLED and no generated download. If it has already begun, expect a
   clear refusal rather than a false cancellation.
4. `RPT-304` required — Open the prepared expired job and restore its choices.
   Expect download to remain unavailable and generation to require a fresh date
   range.

## Preflight and Human Acceptance

Before handoff, automated browser preflight repeats the critical actions against
the deployed host and compares downloaded CSV rows, values, identities and
headers with the fixture oracle. It also verifies checklist JSON, overlay load,
target identity, route capture and one authenticated review submission.

Preflight success means the target is ready for UAT. Human acceptance remains
pending until a reviewer submits or downloads a report bound to the deployed
application SHA, review-tooling SHA and checklist revision.
