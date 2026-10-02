# Phase 0: Clinical-to-Food-Safety Relabelling

> **Note:** This file should be updated after every completed phase step going forward. Each phase completion should add a summary section with date, files modified, and decisions made.

## Overview

This document identifies all UI-facing labels, menu items, and form fields that reference clinical concepts in OpenELIS Global 2. For a food safety laboratory operating under FDA regulatory requirements, these clinical references must be removed, relabeled, or hidden.

**Guiding Principle:** Minimize code changes. Clinical functionality stays in the codebase and must simply be invisible to food safety laboratory users through the UI and reports.

**Decision Hierarchy:**
1. **Configuration first** — Can it be hidden via role-based access control or menu configuration?
2. **i18n second** — Can it be relabeled via message property files alone?
3. **Minor code change last** — Only flag items for code changes if they cannot be addressed by configuration or i18n

---

## Answers to Key Questions

### 1. Secondary/Override Properties File for i18n

**Finding:** OpenELIS does NOT support a secondary or override properties file for i18n. The system uses a single `message_en.properties` file loaded from the classpath.

**Implications:**
- All relabeling must be done directly in `message_en.properties`
- This creates potential merge conflicts with upstream OpenELIS updates
- **Recommendation:** Document all changes for manual merge during upstream updates

### 2. Spring Security for Patient/Patient Merge Access Control

**Finding:** Spring Security provides role-based access control, but the current implementation requires code changes for fine-grained API endpoint protection.

**Current State:**
- `PatientMergeRestController` uses programmatic role check: `userRoleService.userInRole(loggedInUserId, Constants.ROLE_RECEPTION)`
- `PatientManagementController` has no explicit security annotations - relies on menu configuration

**Can it be done via configuration alone?**
- **Partially yes** for menu visibility (via `MenuStatementConfig`)
- **No** for API endpoint protection without code changes

**Smallest Code Change Required:**
Add `@PreAuthorize` annotations to controllers:
```java
@PreAuthorize("hasRole('FOOD_SAFETY_TECHNICIAN') or hasRole('ADMIN')")
```

---

## Food Safety User Role Definition

Create a **"Lab Analyst"** role that serves as the primary access control mechanism. This role should:

- Have access to sample accession, test ordering, result entry, and reporting
- NOT have access to patient management, billing, or clinical-specific features
- Be configured via `SystemUserSection` and `UserRole` entities
- Use domain filtering (`ENVIRONMENTAL`) to show only food safety tests

**Role Configuration:**
- Role name: `Lab Analyst`
- Associated sections: Sample Management, Test Management, Result Entry, Storage, Reports
- Excluded sections: Patient Management, Billing, Epidemiology, Clinical Administration

---

## 1. Configuration-Only Changes (Hide via Role-Based Access)

### Menu Items to Hide
| Menu Key | Current Label | Role Section | Action |
|----------|---------------|--------------|--------|
| `banner.menu.patient` | Patient | Patient Management | Hide for Food Safety role |
| `banner.menu.patientCreateDouble` | Double Entry | Patient Management | Hide |
| `banner.menu.patientCreateInitial` | Initial | Patient Management | Hide |
| `banner.menu.patientEdit` | Edit | Patient Management | Hide |
| `banner.menu.patientConsult` | View | Patient Management | Hide |
| `banner.menu.billing` | Billing | Billing | Hide |
| `banner.menu.report.epi.surveillance.export` | Epidemiological Report | Epidemiology | Hide |
| `banner.menu.report.aggregate.site.test.count` | Site Test Count | Epidemiology | Hide |
| `banner.menu.microbiology_tb` | Tuberculosis | Microbiology | Hide |
| `banner.menu.resultvalidation.parasitology` | Parasitology | Results | Hide |
| `banner.menu.resultvalidation.mycology` | Mycology | Results | Hide |
| `banner.menu.resultvalidation.virology` | Virology | Results | Hide |
| `banner.menu.resultvalidation.immunology` | Immunology | Results | Hide |
| `banner.menu.resultvalidation.hematology` | Hematology | Results | Hide |
| `banner.menu.workplan.Virology` | Virology | Workplan | Hide |
| `banner.menu.workplan.Immunology` | Immunology | Workplan | Hide |
| `banner.menu.workplan.Hematology` | Hematology | Workplan | Hide |
| `banner.menu.workplan.Serology` | Serology | Workplan | Hide |
| `banner.menu.workplan.Parasitology` | Parasitology | Workplan | Hide |
| `banner.menu.workplan.Mycology` | Mycology | Workplan | Hide |

### How to Configure:
1. Navigate to **Admin → Menu Configuration**
2. Create menu entries for Food Safety role that exclude clinical sections
3. Use `MenuStatementConfig` table to control visibility by role
4. Set `sectionId` to exclude Patient Management, Billing, Epidemiology sections

---

## 2. i18n Relabelling (Message Properties Only)

### Patient-Related Fields
| Key | Current Value | New Value | File |
|-----|---------------|-----------|------|
| `patient.id` | Patient Number | Sample Holder ID | `message_en.properties` |
| `patient.name` | Patient Name | Sample Holder Name | `message_en.properties` |
| `patient.firstName` | First Name | Contact First Name | `message_en.properties` |
| `patient.middleName` | Middle Name | Contact Middle Name | `message_en.properties` |
| `patient.lastName` | Last Name | Contact Last Name | `message_en.properties` |
| `patient.chartNumber` | Chart Number | Reference ID | `message_en.properties` |
| `patient.dob` | Date of Birth | Collection Date | `message_en.properties` |
| `patient.sex` | Sex | Gender | `message_en.properties` |
| `patient.race` | Race | Race/Ethnicity | `message_en.properties` |
| `patient.ethnicity` | Ethnicity | Race/Ethnicity | `message_en.properties` |
| `patient.externalId` | External ID | External ID | (no change) |

### Barcode Label Fields
| Key | Current Value | New Value | File |
|-----|---------------|-----------|------|
| `barcode.label.info.patientName` | Patient Name | Sample Holder Name | `message_en.properties` |
| `barcode.label.info.patientId` | Patient ID | Sample ID | `message_en.properties` |
| `barcode.label.info.patientDobFull` | Patient Date of Birth | Collection Date | `message_en.properties` |
| `barcode.label.info.dob` | DOB | Collection Date | `message_en.properties` |
| `barcode.label.info.patientsex` | Sex | Gender | `message_en.properties` |
| `barcode.label.info.patientSexFull` | Patient Sex | Gender | `message_en.properties` |

### Test Management Fields
| Key | Current Value | New Value | File |
|-----|---------------|-----------|------|
| `configuration.test.add.guide.result.limits` | "normal or valid range for a healthy person" | "regulatory threshold" | `message_en.properties` |
| `configuration.test.catalog.guide` | "reference value for a healthy person" | "action limit for regulatory compliance" | `message_en.properties` |
| `configuration.test.modify.guide.result.limits` | "normal and valid result ranges" | "action limits and acceptable ranges" | `message_en.properties` |
| `configuration.test.catalog.normal.range` | Normal range | Action Limit | `message_en.properties` |
| `configuration.test.catalog.reference.value` | Reference value | Regulatory threshold | `message_en.properties` |
| `configuration.test.catalog.valid.range` | Valid range | Acceptable range | `message_en.properties` |

### Microbiology Menu Items
| Key | Current Value | New Value | File |
|-----|---------------|-----------|------|
| `banner.menu.microbiology` | Microbiology | Food Safety Testing | `message_en.properties` |
| `banner.menu.microbiology_classic` | Classic Bacteriology | Bacterial Testing | `message_en.properties` |
| `banner.menu.workplan.Biochemistry` | Biochemistry | Chemistry Testing | `message_en.properties` |
| `banner.menu.workplan.Molecular-Biology` | Molecular Biology | Molecular Testing | `message_en.properties` |

### Patient Form Titles
| Key | Current Value | New Value | File |
|-----|---------------|-----------|------|
| `patient.add.subtitle` | Add Patient | Add Sample Holder | `message_en.properties` |
| `patient.add.title` | Add Patient | Add Sample Holder | `message_en.properties` |
| `patient.browse.title` | Patient | Sample Holders | `message_en.properties` |
| `patient.edit.subtitle` | Edit Patient | Edit Sample Holder | `message_en.properties` |
| `patient.edit.title` | Edit Patient | Edit Sample Holder | `message_en.properties` |

---

## 3. Code Changes Required (Minimal)

### 3.1 Patient Management Controller - API Protection

**Issue:** Patient management endpoints are accessible via API without role-based protection.

**Smallest Change:** Add `@PreAuthorize` annotations to controller methods.

**Files to Modify:**
- `src/main/java/org/openelisglobal/patient/controller/PatientManagementController.java`

**Change Description:**
Add role-based access control to all endpoints:
```java
@PreAuthorize("hasRole('FOOD_SAFETY_TECHNICIAN') or hasRole('ADMIN') or hasRole('CLINICAL')")
@RequestMapping(value = "/PatientManagement", method = RequestMethod.GET)
public ModelAndView showPatientManagement(HttpServletRequest request) { ... }
```

**Liquibase Migration:** Not required (no schema changes)

**Merge Conflict Risk:** Low - adding annotations is additive

### 3.2 Patient Merge REST Controller - Role Check

**Issue:** Patient merge functionality is clinical-specific and should be hidden from food safety users.

**Smallest Change:** Modify the role check to exclude Food Safety Technician role.

**Files to Modify:**
- `src/main/java/org/openelisglobal/patient/merge/controller/rest/PatientMergeRestController.java`

**Change Description:**
Update the `hasMergePermission` method:
```java
private boolean hasMergePermission(HttpServletRequest request) {
    String loggedInUserId = getSysUserId(request);
    if (loggedInUserId == null) {
        return false;
    }
    // Exclude Food Safety Technician role
    if (userRoleService.userInRole(loggedInUserId, "FOOD_SAFETY_TECHNICIAN")) {
        return false;
    }
    return userRoleService.userInRole(loggedInUserId, Constants.ROLE_RECEPTION);
}
```

**Liquibase Migration:** Not required (no schema changes)

**Merge Conflict Risk:** Low - modifying existing method is non-breaking

---

## Summary by Action Type

### Configuration (No Code Changes)
- Hide all patient-related menu items via role-based access
- Hide billing, epidemiology, and clinical-specific menus
- Hide clinical test sections (parasitology, mycology, virology, immunology, hematology)
- Hide TB testing menu

### i18n Relabelling (Message Properties Only)
- Relabel patient fields to sample holder terminology
- Relabel result range fields to regulatory terminology
- Relabel microbiology menus to food safety terminology
- Update test management guides

### Code Changes (Minimal)
| Item | File | Change Type | Liquibase | Merge Risk |
|------|------|-------------|-----------|------------|
| Patient API protection | PatientManagementController.java | Add @PreAuthorize | No | Low |
| Patient merge access | PatientMergeRestController.java | Modify role check | No | Low |

---

## Implementation Checklist

### Phase 0A: Role Configuration
- [x] Create "Lab Analyst" role in system
- [x] Configure role sections (exclude Patient, Billing, Epidemiology)
- [x] Assign role to test users

### Phase 0B: Menu Configuration
- [x] Hide patient management menus for Food Safety role
- [x] Hide billing menus
- [x] Hide epidemiology reports
- [x] Hide clinical microbiology sections

### Phase 0C: i18n Updates
- [ ] Update `message_en.properties` with new labels
- [ ] Update `message_fr.properties` with new labels
- [ ] Test all UI elements display correctly

### Phase 0D: Code Changes (if needed)
- [ ] Add @PreAuthorize to PatientManagementController
- [ ] Update role check in PatientMergeRestController
- [ ] Test API access control

---

## Testing Recommendations

1. **Role Testing:** Verify Food Safety Technician role cannot access patient, billing, or epidemiology features
2. **UI Testing:** Verify all relabeled fields display correctly
3. **API Testing:** Verify REST endpoints are properly protected
4. **Report Testing:** Verify reports use new terminology

---

## Future Considerations

1. Consider creating a separate `message_food_safety.properties` overlay file with code changes to load it
2. Plan for translation updates in non-English locales
3. Document the role-based access control strategy for future maintainers
4. Consider creating a "Food Safety Administrator" role with additional configuration access

---

## Phase 0A: Completed

**Date completed:** 2026-10-02

**Files created:**
- `volume/configuration/backend/roles/food-safety-lab-roles.csv`

**Summary of changes:**
Created CSV-based role configuration for food safety laboratory with a hierarchical role structure. The configuration includes 12 roles organized into two grouping roles (Lab Staff and Lab Supervisors) with appropriate access levels for sample management, test management, result entry, and reporting.

**Decisions made:**
- **Role name changed from "Food Safety Technician" to "Lab Analyst"** - The role name was changed to better reflect the actual job function in a food safety laboratory context.
- **Supervisory hierarchy added** - Added Lab Supervisors grouping role with four supervisory roles (Bench Supervisor, Section Supervisor, Quality Manager, Lab Director) to support proper organizational structure.
- **CSV-based configuration used instead of Liquibase** - Following Constitution Principle I (Configuration-Driven Variation), roles are defined in CSV files that can be customized per deployment without code changes or database migrations.
- **Nested grouping roles confirmed as supported** - The RolesConfigurationHandler supports parent-child role relationships through the `groupingParent` column.
- **Permissions must be assigned separately via UI or database migrations (Phase 0B)** - Role creation via CSV does not automatically assign permissions; this will be handled in Phase 0B.

**Outstanding items:**
- i18n display keys listed in the CSV comment block need entries added in Phase 0C:
  - `role.lab.staff`
  - `role.lab.analyst`
  - `role.sample.manager`
  - `role.test.manager`
  - `role.results.entry`
  - `role.reporting`
  - `role.qc`
  - `role.lab.admin`
  - `role.lab.supervisors`
  - `role.bench.supervisor`
  - `role.section.supervisor`
  - `role.quality.manager`
  - `role.lab.director`
- Role permissions not yet assigned — to be addressed in Phase 0B

## Phase 0B: Completed

**Date completed:** 2026-10-02

**Files created:**
- `src/main/resources/liquibase/food-safety/phase-0b-role-permissions.xml`

**Files modified:**
- `src/main/resources/liquibase/base-changelog.xml` (added `<includeAll path="liquibase/food-safety/" />` directive)

**Summary of changes:**
Created Liquibase changeset to grant role-based module permissions for food safety laboratory. The changeset defines permissions for 11 roles with a refined permission structure:

**Base modules (granted to all food safety roles):**
- GenericSampleView, ResultsValidationGeneral, RangeResults, TATReport, Report:RoutineExport, BarcodeConfig

**Supervisory-only modules (granted to supervisory roles + Lab Administrator):**
- ReportConfig, ValidationConfig, BatchTestReassignment, CalendarManagement, ExternalConnection, ListPlugins, SampleShipmentManagement, EQAView

**Excluded modules (NOT granted to any food safety role):**
- Cytology, MicrobiologyTBView, Pathology, ReportCovid, VectorManualEntryFieldMap, VectorManualEntryHelper, VectorSurveillanceDashboard

**Role-specific permissions:**
- **Lab Analyst**: Base modules only
- **Sample Manager**: Base modules + SampleShipmentManagement
- **Test Manager**: Base modules + ValidationConfig
- **Results Entry**: GenericSampleView, ResultsValidationGeneral, RangeResults, BarcodeConfig
- **Reporting**: GenericSampleView, TATReport, Report:RoutineExport, ReportConfig
- **Quality Control**: Base modules + EQAView, ValidationConfig
- **Lab Administrator**: All modules + StudyElectronicOrderView
- **Lab Director**: All modules + StudyElectronicOrderView
- **Bench Supervisor, Section Supervisor, Quality Manager**: Base modules + all supervisory modules

**Grouping roles with no direct permissions:**
- Lab Staff, Lab Supervisors (these are grouping roles only)

**Decisions made:**
- **StudyElectronicOrderView restricted to Lab Administrator and Lab Director only** - This module is granted only to the two highest authority roles
- **Grouping roles stripped of direct permissions** - Lab Staff and Lab Supervisors are pure grouping roles with no direct module access
- **Removed SamplePatientEntry and TestAdd** - Replaced with GenericSampleView for sample viewing functionality
- **Removed duplicate RangeResults from Test Manager** - Already included in base modules

**Outstanding items:**
- i18n display keys listed in the CSV comment block need entries added in Phase 0C:
  - `role.lab.staff`
  - `role.lab.analyst`
  - `role.sample.manager`
  - `role.test.manager`
  - `role.results.entry`
  - `role.reporting`
  - `role.qc`
  - `role.lab.admin`
  - `role.lab.supervisors`
  - `role.bench.supervisor`
  - `role.section.supervisor`
  - `role.quality.manager`
  - `role.lab.director`
- Liquibase changeset is in place at `src/main/resources/liquibase/food-safety/phase-0b-role-permissions.xml` and included via `<includeAll>` in `base-changelog.xml`
- Role permissions need to be applied to the database by restarting the application to trigger Liquibase migration
- Phase 0C: i18n updates pending
- Phase 0D: Code changes for API protection pending