package org.openelisglobal.reports.dataexport;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.io.StringWriter;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.openelisglobal.BaseWebContextSensitiveTest;
import org.openelisglobal.analysis.service.AnalysisService;
import org.openelisglobal.analysis.valueholder.Analysis;
import org.openelisglobal.common.services.IStatusService;
import org.openelisglobal.common.services.StatusService.AnalysisStatus;
import org.openelisglobal.reports.dataexport.form.ExportFilter;
import org.openelisglobal.reports.dataexport.form.ExportSnapshot;
import org.openelisglobal.reports.dataexport.form.ReportSourceConfig;
import org.openelisglobal.reports.dataexport.service.ReportingSource;
import org.openelisglobal.result.service.ResultService;
import org.openelisglobal.result.valueholder.Result;
import org.openelisglobal.sampleitem.service.SampleItemService;
import org.openelisglobal.sampleitem.valueholder.SampleItem;
import org.openelisglobal.testresult.service.TestResultService;
import org.openelisglobal.testresult.valueholder.TestResult;
import org.openelisglobal.testresultcomponent.service.TestResultComponentService;
import org.openelisglobal.testresultcomponent.valueholder.TestResultComponent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

/**
 * Proves source relationships with actual configured records before export
 * query acceptance.
 */
@Transactional
public class SampleTestingMappingIntegrationTest extends BaseWebContextSensitiveTest {
    @Autowired
    private TestResultComponentService components;
    @Autowired
    private TestResultService options;
    @Autowired
    private ResultService results;
    @Autowired
    private AnalysisService analyses;
    @Autowired
    private SampleItemService specimens;
    @Autowired
    private IStatusService statuses;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("sampleTestingSource")
    private ReportingSource source;

    @Before
    public void fixture() throws Exception {
        executeDataSetWithStateManagement("testdata/reporting-sample-testing.xml");
    }

    private TestResultComponent component(String code, String label, int order) {
        TestResultComponent component = new TestResultComponent();
        component.setCode(code);
        component.setLabel(label);
        component.setDisplayOrder(order);
        component.setResultType("N");
        return component;
    }

    private Result reading(Analysis analysis, TestResult option, String value) {
        Result result = new Result();
        result.setAnalysis(analysis);
        result.setTestResult(option);
        result.setResultType("N");
        result.setValue(value);
        result.setIsReportable("Y");
        result.setSysUserId(TEST_SYS_USER_ID);
        results.insert(result);
        return result;
    }

    @Test
    public void componentIdentityAndUnspecifiedPrecisionSurviveStoredRepeatsAndRename() {
        List<TestResultComponent> configured = components.saveSampleResults("1",
                List.of(component("PRIMARY", "Systolic", 0), component("DIA", "Diastolic", 1)), null, null,
                TEST_SYS_USER_ID);
        TestResultComponent primary = configured.stream().filter(c -> "PRIMARY".equals(c.getCode())).findFirst()
                .orElseThrow();
        TestResult option = options.getAllMatching("componentId", primary.getId()).get(0);
        Analysis analysis = analyses.get("1");
        analysis.setStatusId(statuses.getStatusID(AnalysisStatus.Finalized));
        analyses.update(analysis);
        Result first = reading(analysis, option, "120.125");
        Result second = reading(analysis, option, "120.125");
        String firstId = first.getId();
        String secondId = second.getId();
        assertNotEquals(firstId, secondId);
        entityManager.flush();
        entityManager.clear();

        Result stored = results.get(firstId);
        assertEquals(primary.getId(), stored.getTestResult().getComponentId());
        assertEquals("120.125", stored.getValue());
        assertEquals(-1, stored.getSignificantDigits());
        assertEquals("120.125", results.get(secondId).getValue());

        List<TestResultComponent> renamed = components.getActiveComponentsByTestId("1");
        renamed.stream().filter(c -> c.getId().equals(primary.getId())).findFirst().orElseThrow()
                .setLabel("Systolic pressure");
        components.saveComponentsForTest("1", renamed, TEST_SYS_USER_ID);
        entityManager.flush();
        entityManager.clear();
        String linkedComponent = results.get(firstId).getTestResult().getComponentId();
        assertEquals(primary.getId(), linkedComponent);
        assertEquals("Systolic pressure", components.get(linkedComponent).getLabel());
    }

    @Test
    public void collectionDateBelongsToEachSpecimenEvenUnderTheSameAccession() {
        SampleItem first = specimens.get("1");
        SampleItem second = specimens.get("2");
        second.setSample(first.getSample());
        first.setCollectionDate(Timestamp.valueOf("2026-08-01 00:00:00"));
        second.setCollectionDate(Timestamp.valueOf("2026-09-01 00:00:00"));
        specimens.update(first);
        specimens.update(second);
        entityManager.flush();
        entityManager.clear();

        List<String> eligible = entityManager
                .createQuery("select a.id from Analysis a join a.sampleItem si "
                        + "where si.sample.id = :sample and si.collectionDate >= :from and si.collectionDate < :to "
                        + "order by a.id", String.class)
                .setParameter("sample", first.getSample().getId())
                .setParameter("from", Timestamp.valueOf("2026-08-01 00:00:00"))
                .setParameter("to", Timestamp.valueOf("2026-09-01 00:00:00")).getResultList();
        assertEquals(List.of("1"), eligible);
        assertEquals(first.getSample().getId(), specimens.get("2").getSample().getId());
    }

    @Test
    public void actualSourceExportsBothStoredRepeatsInBothLayoutsAndResolvesConfiguredColumns() throws Exception {
        List<TestResultComponent> configured = components.saveSampleResults("1",
                List.of(component("PRIMARY", "Systolic", 0)), null, null, TEST_SYS_USER_ID);
        String componentId = configured.get(0).getId();
        TestResult option = options.getAllMatching("componentId", componentId).get(0);
        Analysis analysis = analyses.get("1");
        String status = statuses.getStatusID(AnalysisStatus.Finalized);
        analysis.setStatusId(status);
        analyses.update(analysis);
        SampleItem specimen = analysis.getSampleItem();
        specimen.setCollectionDate(Timestamp.valueOf("2026-08-20 10:00:00"));
        specimen.setReceivedDate(Timestamp.valueOf("2026-08-20 11:30:00"));
        specimens.update(specimen);
        reading(analysis, option, "120.125");
        reading(analysis, option, "120.125");
        entityManager.flush();
        String sectionId = analysis.getTestSection().getId();
        String accession = specimen.getSample().getAccessionNumber();
        ReportSourceConfig definition = new ReportSourceConfig("SAMPLE_TESTING", 1, "Sample & Testing",
                "SAMPLE_TESTING", "collectionDate", List.of("SPREADSHEET", "RESULT_LIST"),
                List.of("accessionNumber", "resultValue"), List.of("tests"), List.of("testIds"),
                Map.of("SPREADSHEET", List.of("accessionNumber"), "RESULT_LIST", List.of("resultValue")));
        ExportFilter filter = new ExportFilter("2026-08-01", "2026-08-31", List.of(sectionId), List.of("1"),
                List.of("FINALIZED"));
        var catalog = source.catalog();
        var pivot = catalog.stream().filter(v -> v.id().equals("component:" + componentId)).findFirst().orElseThrow();
        assertEquals("Blood Test — Systolic", pivot.label());
        for (String layout : definition.layouts()) {
            var fields = catalog.stream().filter(v -> v.id().equals("accessionNumber") || v.id().equals("receivedDate")
                    || v.id().equals(layout.equals("SPREADSHEET") ? pivot.id() : "resultValue")).toList();
            StringWriter csv = new StringWriter();
            long rows = source.write(csv, new ExportSnapshot(definition, layout, fields, filter,
                    java.time.ZoneId.systemDefault().getId(), List.of(status)));
            assertEquals(2, rows);
            String[] lines = csv.toString().split("\r\n");
            assertEquals(3, lines.length);
            assertEquals(accession + ",2026-08-20,120.125", lines[1]);
            assertEquals(lines[1], lines[2]);
        }
    }
}
