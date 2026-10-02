# FDA Food Safety Laboratory Implementation Plan for OpenELIS Global 2

## Overview

This phased implementation plan outlines the steps to adapt OpenELIS Global 2 for FDA-regulated food safety laboratories operating under FSMA, BAM methods, and 21 CFR Parts 110/117.

---

## Phase 1 – Foundation (Configuration Only)

**Objective:** Establish the core food safety configuration without code changes.

| Item | Files/Entities | Liquibase Migration | Dependencies |
|------|----------------|---------------------|--------------|
| **1.1 Domain Configuration** | - `Test.domain` field<br>- `TestSection.domain` field<br>- `TypeOfSample.domain` field<br>- `Panel.domain` field | No - existing columns | None |
| **1.2 Sample Types Setup** | - `TypeOfSample` entity<br>- Create entries: "Food Sample", "Water Sample", "Environmental Sample", "Surface Sample"<br>- `TypeOfSampleTest` linking table | No - existing tables | None |
| **1.3 Test Sections Configuration** | - `TestSection` entity<br>- Create sections: "Food Microbiology", "Food Chemistry", "Environmental Testing", "Water Quality"<br>- Link to Organization | No - existing tables | 1.1, 1.2 |
| **1.4 Units of Measure** | - `UnitOfMeasure` entity<br>- Add: CFU/g, CFU/mL, ppm, ppb, MPN, NPU<br>- Configure UCUM codes | No - existing tables | None |
| **1.5 Reference Ranges (Action Limits)** | - `ResultLimit` entity<br>- Configure FDA action limits for each test<br>- Set `lowValid`/`highValid` as regulatory thresholds<br>- Use `sampleTypeId` for matrix-specific limits | No - existing tables | 1.2, 1.4 |
| **1.6 Test Catalog Setup** | - `Test` entity<br>- Create tests with LOINC codes<br>- Link to `TestSection`, `Method`, `UnitOfMeasure`<br>- Set `domain = 'ENVIRONMENTAL'` | No - existing tables | 1.1, 1.3, 1.4, 1.5 |
| **1.7 Method Configuration** | - `Method` entity<br>- Add BAM method references<br>- Add AOAC method associations<br>- Set `isActive` flags | No - existing tables | 1.6 |

**Deliverables:**
- Fully configured food safety test catalog
- Sample type definitions for all matrices
- Regulatory action limits in place
- Units configured for food safety measurements

---

## Phase 2 – Core Compliance (Minor Development)

**Objective:** Implement 21 CFR Part 11 compliance and chain of custody tracking.

| Item | Files/Entities | Liquibase Migration | Dependencies |
|------|----------------|---------------------|--------------|
| **2.1 Chain of Custody Entity** | - **NEW:** `SampleCustodyLog` entity<br>- Fields: `sampleId`, `userId`, `action`, `timestamp`, `notes`<br>- **NEW:** `CustodyLogService`<br>- **NEW:** `CustodyLogDAO`<br>- **NEW:** `SampleCustodyLogController` | **Yes** - `001-custody-log-entity.xml` | Phase 1 |
| **2.2 Temperature Tracking** | - Add `temperature` field to `SampleItem`<br>- Add `temperatureUnit` field<br>- Add `temperatureHistory` JSON field<br>- Update `SampleItemService` | **Yes** - `002-sample-temperature-fields.xml` | Phase 1 |
| **2.3 Retention Period Tracking** | - Add `collectionDate` to `Sample`<br>- Add `retentionPeriodDays` to `TypeOfSample`<br>- Add `retentionExpiryDate` calculated field<br>- Add `isPastRetention` flag | **Yes** - `003-retention-tracking.xml` | Phase 1 |
| **2.4 Electronic Signature Entity** | - **NEW:** `ElectronicSignature` entity<br>- Fields: `userId`, `entityType`, `entityId`, `signature`, `timestamp`, `reason`<br>- **NEW:** `SignatureService`<br>- **NEW:** `SignatureDAO` | **Yes** - `004-electronic-signature.xml` | Phase 1 |
| **2.5 21 CFR Part 11 Signature Workflows** | - Modify `SampleService` to require signatures for status changes<br>- Modify `ResultService` for result release<br>- Add `requiresSignature` flag to `SystemConfiguration`<br>- Update controllers to capture signatures | **Yes** - `005-signature-workflows.xml` | 2.1, 2.4 |
| **2.6 Action Limit Exceedance Workflow** | - Add `actionLimitId` to `Result`<br>- Add `exceedanceStatus` enum (NONE, EXCEEDED, UNDER_INVESTIGATION)<br>- Add `exceedanceNotes` field<br>- Create `ExceedanceService`<br>- Add notification triggers | **Yes** - `006-action-limit-exceedance.xml` | 1.5 |
| **2.7 Quarantine Status** | - Add `quarantineStatus` to `Sample`<br>- Add `quarantineReason` field<br>- Add `quarantineExpiryDate`<br>- Update `SampleService` for quarantine workflows | **Yes** - `007-quarantine-status.xml` | Phase 1 |

**Deliverables:**
- Complete chain of custody logging
- 21 CFR Part 11 compliant electronic signatures
- Temperature monitoring for samples
- Retention period tracking
- Action limit exceedance workflows
- Quarantine functionality

---

## Phase 3 – Regulatory Reporting

**Objective:** Implement FDA-specific reporting and audit trail capabilities.

| Item | Files/Entities | Liquibase Migration | Dependencies |
|------|----------------|---------------------|--------------|
| **3.1 FDA Report Templates** | - **NEW:** `FdaReportDefinition` entity<br>- Fields: `reportName`, `format`, `templatePath`, `lastUpdated`<br>- **NEW:** `FdaReportService`<br>- **NEW:** `FdaReportController`<br>- Templates: FDA Form 483, Recall Report, Inspection Summary | **Yes** - `008-fda-report-templates.xml` | Phase 2 |
| **3.2 Audit Trail Export** | - Enhance `AuditTrail` entity<br>- Add `exportFormat` field (CSV, PDF, XML)<br>- Add `exportTimestamp`<br>- Create `AuditTrailExportService`<br>- Add export endpoints to `AuditTrailController` | **Yes** - `009-audit-trail-export.xml` | Phase 2 |
| **3.3 21 CFR Part 11 Compliant Reports** | - Add `electronicSignatureId` to `ReportDefinition`<br>- Add `signedBy` and `signedAt` fields<br>- Create `Part11ReportService`<br>- Add digital signature to report generation | **Yes** - `010-part11-reports.xml` | 2.4 |
| **3.4 State Agency Reporting** | - **NEW:** `StateReportConfig` entity<br>- Fields: `stateName`, `reportFormat`, `frequency`, `lastSubmitted`<br>- **NEW:** `StateReportService`<br>- **NEW:** `StateReportController`<br>- Templates: State-specific formats | **Yes** - `011-state-reporting.xml` | 3.1 |
| **3.5 Inspection Readiness Dashboard** | - **NEW:** `InspectionReadinessService`<br>- **NEW:** `InspectionReadinessController`<br>- Dashboard views: Compliance Status, Open CAPAs, QC Summary<br>- Export to PDF for inspectors | **Yes** - `012-inspection-readiness.xml` | 3.1, 3.3 |
| **3.6 Recall Notification System** | - Add `recallStatus` to `Sample`<br>- Add `recallReason` field<br>- Add `recallNotificationSent` flag<br>- Create `RecallService`<br>- Add notification templates | **Yes** - `013-recall-notification.xml` | Phase 1 |

**Deliverables:**
- FDA Form 483 and other regulatory report templates
- 21 CFR Part 11 compliant report generation
- Audit trail export capabilities
- State agency reporting integration
- Inspection readiness dashboard
- Recall notification system

---

## Phase 4 – Advanced QA/QC

**Objective:** Implement BAM-specific quality control and proficiency testing.

| Item | Files/Entities | Liquibase Migration | Dependencies |
|------|----------------|---------------------|--------------|
| **4.1 BAM Method Controls** | - **NEW:** `BamQcType` enum (BLANK, SPIKE, CONTROL, MDC)<br>- **NEW:** `BamQcControl` entity<br>- Fields: `testId`, `qcType`, `expectedValue`, `actualValue`, `passFail`, `notes`<br>- **NEW:** `BamQcService`<br>- **NEW:** `BamQcController` | **Yes** - `014-bam-qc-controls.xml` | Phase 1 |
| **4.2 Detection Capability Tracking** | - Add `methodDetectionCapability` to `Method`<br>- Add `mdcValue` to `BamQcControl`<br>- Add `mdcCalculation` method<br>- Create `MdcService` | **Yes** - `015-mdc-tracking.xml` | 4.1 |
| **4.3 Recovery Verification** | - **NEW:** `RecoveryVerification` entity<br>- Fields: `testId`, `spikedAmount`, `recoveredAmount`, `recoveryPercent`, `withinAcceptance`<br>- **NEW:** `RecoveryService`<br>- **NEW:** `RecoveryController` | **Yes** - `016-recovery-verification.xml` | 4.1 |
| **4.4 Proficiency Testing Integration** | - **NEW:** `ProficiencyTest` entity<br>- Fields: `testId`, `expectedResult`, `receivedResult`, `score`, `passed`, `receivedDate`<br>- **NEW:** `ProficiencyTestService`<br>- **NEW:** `ProficiencyTestController`<br>- Link to external PT providers | **Yes** - `017-proficiency-testing.xml` | Phase 1 |
| **4.5 Method Validation Documentation** | - **NEW:** `MethodValidation` entity<br>- Fields: `methodId`, `validationDate`, `validationType`, `result`, `passed`, `validatedBy`<br>- **NEW:** `MethodValidationService`<br>- **NEW:** `MethodValidationController` | **Yes** - `018-method-validation.xml` | 1.6 |
| **4.6 QC Trend Analysis** | - **NEW:** `QcTrendAnalysis` service<br>- **NEW:** `QcTrendController`<br>- Westgard rule extensions for BAM QC<br>- Trend visualization charts<br>- Out-of-control detection | **Yes** - `019-qc-trend-analysis.xml` | 4.1, 4.2 |
| **4.7 Precision Studies** | - **NEW:** `PrecisionStudy` entity<br>- Fields: `methodId`, `studyType` (repeatability, reproducibility), `results`, `cvPercent`, `passed`<br>- **NEW:** `PrecisionStudyService`<br>- **NEW:** `PrecisionStudyController` | **Yes** - `020-precision-studies.xml` | 4.5 |

**Deliverables:**
- BAM-specific QC control types and tracking
- Method detection capability calculations
- Recovery verification workflows
- Proficiency testing integration
- Method validation documentation
- QC trend analysis and visualization
- Precision study tracking

---

## Phase Dependencies Diagram

```
Phase 1 (Foundation)
    ↓
Phase 2 (Core Compliance)
    ↓
Phase 3 (Regulatory Reporting)
    ↓
Phase 4 (Advanced QA/QC)
```

**Note:** Phase 4 items 1-3 can begin in parallel with Phase 2 once the core entities are established.

---

## Implementation Timeline Estimate

| Phase | Duration | Key Milestones |
|-------|----------|----------------|
| Phase 1 | 2-4 weeks | Food safety test catalog live |
| Phase 2 | 4-6 weeks | 21 CFR Part 11 compliance achieved |
| Phase 3 | 3-4 weeks | FDA reporting capabilities ready |
| Phase 4 | 4-6 weeks | Full BAM QC implementation |

**Total Estimated Duration:** 13-20 weeks

---

## Risk Mitigation

1. **Data Migration:** Plan for data migration from existing clinical configurations
2. **User Training:** Develop training materials for food safety workflows
3. **Validation:** Plan for IQ/OQ documentation for FDA validation
4. **Integration:** Consider integration with external PT providers and FDA databases

---

## Next Steps

1. Review and approve this implementation plan
2. Create detailed task breakdown for Phase 1
3. Begin configuration work in development environment
4. Set up version control for Liquibase migrations
5. Establish testing protocols for each phase