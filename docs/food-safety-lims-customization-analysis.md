# OpenELIS Global 2 - Food Safety Laboratory Customization Analysis

## Executive Summary

This document provides a comprehensive analysis of the OpenELIS Global 2 codebase for food safety laboratory customization. The system already includes native support for the `ENVIRONMENTAL` domain, making it well-suited for food safety applications with minimal architectural changes required.

---

## 1. Top-Level Directory Structure

| Directory | Description |
|-----------|-------------|
| `src/main/java/org/openelisglobal/` | Core Java backend source code (Spring MVC architecture) |
| `src/main/resources/` | Configuration files, properties, messages, Liquibase migrations |
| `frontend/` | React 17 frontend with Carbon Design System |
| `db/` | Database initialization scripts |
| `docs/` | Documentation including implementation guides |
| `specs/` | Feature specifications and planning documents |
| `pom.xml` | Maven build configuration |
| `docker-compose.yml` | Docker orchestration for development |
| `fhir/` | FHIR R4 integration resources |
| `plugins/` | Analyzer plugin extensions |
| `tools/` | Migration and utility tools |

---

## 2. Tech Stack & Architecture

### Backend
- **Java 21 LTS** + **Spring Framework 6.2.2** (Traditional Spring MVC, NOT Spring Boot)
- **Hibernate 6.x** (JPA/Jakarta EE 9) + **PostgreSQL 14+**
- **Liquibase 4.8.0** for schema migrations
- **HAPI FHIR R4** (v6.6.2) for interoperability
- **JUnit 4** + **Mockito 2.21.0** for testing

### Frontend
- **React 17** + **Carbon Design System v1.15**
- **React Intl 5.20.12** for internationalization
- **Formik 2.2.9** + **Yup 0.29.2** for forms
- **Playwright 1.57.0** for E2E testing

### Architecture Pattern
Strict 5-layer pattern:
```
Valueholder (JPA Entities) → DAO → Service → Controller → Form/DTO
```

---

## 3. Core Modules

### 3.1 Sample Accession (`sample/`)
- **Sample** - Primary entity with:
  - `accessionNumber`, `barCode`, `domain`, `status`
  - GPS coordinates (`gpsLatitude`, `gpsLongitude`, `gpsAccuracyMeters`)
  - `receivedTimestamp`, `requiredBy`, `collectionDate`
  - Support for aliquoting via `SampleItem`

- **SampleItem** - Individual aliquots with:
  - `quantity`, `remainingQuantity`
  - `parentSampleItem` (aliquoting hierarchy)
  - `typeOfSampleId`, `sourceOfSampleId`
  - `collectionConditions`, `collectionMethod`

### 3.2 Test Ordering (`test/`, `testcatalog/`)
- **Test** - Test definition with:
  - `loinc`, `localCode`, `description`
  - `testSectionId`, `methodId`, `unitOfMeasureId`
  - `domain` (CLINICAL/ENVIRONMENTAL/VECTOR)
  - `orderable`, `isReportable`, `antimicrobialResistance`

- **TestSection** - Lab unit grouping with:
  - `testSectionName`, `organizationId`
  - `domain`, `isActive`
  - Hierarchical structure via `parentTestSectionId`

- **Method** - Testing methodology
- **Panel** - Test panels with `domain` field
- **TypeOfSampleTest** - Many-to-many linking sample types to tests

### 3.3 Result Entry (`result/`, `analysis/`)
- **Analysis** - Test execution record with:
  - `sampleItemId`, `testId`, `testSectionId`
  - `status`, `startedDate`, `completedDate`, `releasedDate`
  - `isReportable`, `printedDate`

- **Result** - Individual result values with:
  - `analysisId`, `testResultId`, `value`
  - `resultType`, `significantDigits`
  - `minNormal`, `maxNormal`
  - `parentResult` (for hierarchical results)

### 3.4 Reporting (`report/`)
- **ReportDefinition** - Report templates
- **ReportColumn** - Column definitions
- **ReportingData** - Data aggregation for reports

---

## 4. Data Model Structure

### Key Entity Relationships

```
Sample (1) → (N) SampleItem
SampleItem (1) → (1) TypeOfSample
SampleItem (N) → (N) Analysis (via sampleItem)
Analysis (1) → (1) Test
Analysis (1) → (N) Result
Result (1) → (1) TestResult
Result (1) → (1) Analyte
```

### Core Tables (Valueholders)

| Entity | Key Fields |
|--------|------------|
| `SAMPLE` | `id`, `accessionNumber`, `barCode`, `domain`, `status`, `receivedTimestamp`, `requiredBy`, `gpsLatitude`, `gpsLongitude` |
| `SAMPLE_ITEM` | `id`, `sampleId`, `typeOfSampleId`, `quantity`, `remainingQuantity`, `parentSampleItemId`, `sourceOfSampleId` |
| `TEST` | `id`, `localCode`, `loinc`, `description`, `testSectionId`, `methodId`, `domain`, `orderable`, `unitOfMeasureId` |
| `TEST_SECTION` | `id`, `testSectionName`, `organizationId`, `domain`, `isActive` |
| `ANALYSIS` | `id`, `sampleItemId`, `testId`, `status`, `startedDate`, `completedDate`, `releasedDate` |
| `RESULT` | `id`, `analysisId`, `testResultId`, `value`, `resultType`, `significantDigits`, `minNormal`, `maxNormal` |
| `RESULT_LIMIT` | `id`, `testId`, `lowNormal`, `highNormal`, `lowValid`, `highValid`, `lowReportingRange`, `highReportingRange` |
| `UNIT_OF_MEASURE` | `id`, `unitOfMeasureName`, `code`, `ucumCode` |
| `TYPE_OF_SAMPLE` | `id`, `description`, `domain`, `whonecode`, `disposalInstructions` |
| `ORGANIZATION` | `id`, `organizationName`, `cliaNum`, `city`, `state`, `zipCode`, `fhirUuid` |
| `SOURCE_OF_SAMPLE` | `id`, `description`, `domain` |

---

## 5. Domain-Specific Configuration Locations

### 5.1 Test Types & Units
- **UnitOfMeasure** - Standard units with UCUM codes
- **TestResultType** - Result types (N=numeric, Q=qualitative, etc.)
- **TestResult** - Select list options for qualitative results

### 5.2 Reference Ranges & Validation
- **ResultLimit** entity with:
  - `lowNormal`/`highNormal` - Normal range
  - `lowValid`/`highValid` - Valid range
  - `lowReportingRange`/`highReportingRange` - Reporting range
  - `lowCritical`/`highCritical` - Critical values
  - `gender`, `minAge`, `maxAge` - Demographic scoping
  - `componentId` - Links to result components (OGC-949 M7)
  - `sampleTypeId` - Sample-type scoped ranges (OGC-1145)

### 5.3 Workflows
- **Domain field** - Controls workflow behavior:
  - `CLINICAL` - Standard clinical lab
  - `ENVIRONMENTAL` - Food safety, water testing
  - `VECTOR` - Vector-borne disease surveillance
- **cultureWorkflowType** - For microbiology workflows
- **inLabOnly** - Tests only available in-lab
- **notifyResults** - Patient notification flag

### 5.4 Configuration Files
- `src/main/resources/SystemConfiguration.properties` - System-wide settings
- `src/main/resources/Reports.properties` - Report configurations
- `src/main/resources/persistence/` - Database connection configs
- `src/main/resources/liquibase/` - Schema migration scripts

---

## 6. Food Safety Customization Points

### 6.1 Domain Configuration
The system natively supports three domains:
- `CLINICAL` - Standard clinical laboratory
- `ENVIRONMENTAL` - **Food safety, water testing, environmental monitoring**
- `VECTOR` - Vector-borne disease surveillance

**Action:** Set `domain = 'ENVIRONMENTAL'` for food safety tests.

### 6.2 Sample Types
Configure `TypeOfSample` entries for food safety:
- "Food Sample"
- "Environmental Sample" 
- "Water Sample"
- "Surface Sample"

Each can have its own `disposalInstructions` and `whonecode`.

### 6.3 Test Sections
Create lab units for food safety testing areas:
- Food Microbiology
- Food Chemistry
- Environmental Sampling
- Water Quality

### 6.4 Reference Ranges
Configure `ResultLimit` for food safety thresholds:
- Microbiological counts (CFU/g)
- Chemical contaminants (ppm, ppb)
- Physical parameters (pH, temperature)

Use demographic scoping (`sampleTypeId`) for sample-type specific limits.

### 6.5 Units
Use appropriate UCUM codes for food safety measurements:
- `CFU/mL` - Colony forming units
- `ppm` - Parts per million
- `pb` - Parts per billion
- `°C` - Celsius temperature

### 6.6 Workflows
Leverage existing workflow flags:
- `inLabOnly` - Tests requiring in-lab processing
- `notifyResults` - Notification settings for public health
- `isReportable` - Results requiring official reporting

---

## 7. Key Files for Food Safety Customization

| File | Purpose |
|------|---------|
| `src/main/java/org/openelisglobal/sample/valueholder/Sample.java` | Sample entity with domain support |
| `src/main/java/org/openelisglobal/sample/valueholder/SampleItem.java` | Aliquoting and sample type support |
| `src/main/java/org/openelisglobal/test/valueholder/Test.java` | Test definition with domain field |
| `src/main/java/org/openelisglobal/test/valueholder/TestSection.java` | Lab unit organization |
| `src/main/java/org/openelisglobal/resultlimits/valueholder/ResultLimit.java` | Reference ranges |
| `src/main/java/org/openelisglobal/unitofmeasure/valueholder/UnitOfMeasure.java` | Measurement units |
| `src/main/java/org/openelisglobal/typeofsample/valueholder/TypeOfSample.java` | Sample type definitions |
| `src/main/java/org/openelisglobal/typeofsample/valueholder/TypeOfSampleTest.java` | Test-sample type mapping |

---

## 8. Recommendations

1. **Leverage Existing ENVIRONMENTAL Domain** - No code changes needed for basic food safety support
2. **Configure Sample Types** - Create food-specific sample types in the admin UI
3. **Set Up Test Sections** - Organize tests by food safety discipline
4. **Configure Reference Ranges** - Use ResultLimit entity for food safety thresholds
5. **Customize Units** - Ensure UCUM codes are properly configured for food safety measurements
6. **Review Workflow Flags** - Adjust `inLabOnly` and `notifyResults` for food safety requirements