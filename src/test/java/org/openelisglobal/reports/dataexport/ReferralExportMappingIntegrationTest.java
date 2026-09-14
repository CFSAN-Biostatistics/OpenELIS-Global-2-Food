package org.openelisglobal.reports.dataexport;

import static org.junit.Assert.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.openelisglobal.BaseWebContextSensitiveTest;
import org.openelisglobal.analysis.valueholder.Analysis;
import org.openelisglobal.organization.valueholder.Organization;
import org.openelisglobal.referral.valueholder.Referral;
import org.openelisglobal.referral.valueholder.ReferralResult;
import org.openelisglobal.referral.valueholder.ReferralStatus;
import org.openelisglobal.referral.valueholder.ReferralType;
import org.openelisglobal.reports.dataexport.dao.ReferralExportDAO;
import org.openelisglobal.reports.dataexport.form.ExportFilter;
import org.openelisglobal.reports.dataexport.form.ExportSnapshot;
import org.openelisglobal.reports.dataexport.form.ReportSourceConfig;
import org.openelisglobal.result.valueholder.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
public class ReferralExportMappingIntegrationTest extends BaseWebContextSensitiveTest {
    @Autowired
    private ReferralExportDAO referrals;
    @PersistenceContext
    private EntityManager entityManager;
    private String referralTypeId;

    @Before
    public void fixture() throws Exception {
        executeDataSetWithStateManagement("testdata/reporting-sample-testing.xml");
        var type = new ReferralType();
        type.setName("Reporting mapping fixture");
        entityManager.persist(type);
        referralTypeId = type.getId();
    }

    private Referral referral(String analysis, String requested, String sent) {
        var referral = new Referral();
        referral.setAnalysis(entityManager.find(Analysis.class, analysis));
        referral.setReferralTypeId(referralTypeId);
        referral.setOrganization(entityManager.find(Organization.class, "3"));
        referral.setRequestDate(stamp(requested));
        referral.setSentDate(stamp(sent));
        referral.setStatus(sent == null ? ReferralStatus.DRAFT : ReferralStatus.REQUESTED);
        entityManager.persist(referral);
        return referral;
    }

    private ReferralResult returned(Referral referral, String value, String date) {
        var result = new Result();
        result.setAnalysis(referral.getAnalysis());
        result.setResultType("N");
        result.setValue(value);
        result.setIsReportable("Y");
        entityManager.persist(result);
        var link = new ReferralResult();
        link.setReferralId(referral.getId());
        link.setTestId(referral.getAnalysis().getTest().getId());
        link.setResult(result);
        link.setReferralReportDate(stamp(date));
        entityManager.persist(link);
        return link;
    }

    private static Timestamp stamp(String value) {
        return value == null ? null : Timestamp.from(Instant.parse(value));
    }

    private ExportSnapshot request(String anchor, String from, String to, String zone, List<String> sections,
            List<String> tests) {
        var definition = new ReportSourceConfig("REFERRALS", 1, "Referrals", "REFERRALS", anchor, List.of("TABLE"),
                List.of("referralId"), List.of(), List.of("labSectionIds", "testIds"),
                Map.of("TABLE", List.of("referralId")));
        return new ExportSnapshot(definition, "TABLE", List.of(),
                new ExportFilter(from, to, sections, tests, List.of()), zone, List.of());
    }

    private List<ReferralExportDAO.Row> read(ExportSnapshot request) {
        entityManager.flush();
        entityManager.clear();
        try (var rows = referrals.stream(request)) {
            return rows.toList();
        }
    }

    @Test
    public void requestAndSentDatesAreIndependentAnchorsWithoutNullFallback() {
        var sent = referral("1", "2026-05-05T10:00:00Z", "2026-05-07T11:00:00Z");
        var draft = referral("1", "2026-05-05T12:00:00Z", null);
        assertEquals(List.of(sent.getId(), draft.getId()),
                read(request("requestDate", "2026-05-05", "2026-05-05", "UTC", List.of("1"), List.of())).stream()
                        .map(row -> row.referral().getId()).toList());
        assertTrue(read(request("sentDate", "2026-05-05", "2026-05-05", "UTC", List.of("1"), List.of())).isEmpty());
        assertEquals(List.of(sent.getId()),
                read(request("sentDate", "2026-05-07", "2026-05-07", "UTC", List.of("1"), List.of())).stream()
                        .map(row -> row.referral().getId()).toList());
    }

    @Test
    public void datesIncludeBothLocalBoundariesAcrossDaylightSaving() {
        var first = referral("1", null, "2026-03-08T08:00:00Z");
        var last = referral("1", null, "2026-03-09T06:59:59Z");
        referral("1", null, "2026-03-08T07:59:59Z");
        referral("1", null, "2026-03-09T07:00:00Z");
        assertEquals(List.of(first.getId(), last.getId()),
                read(request("sentDate", "2026-03-08", "2026-03-08", "America/Los_Angeles", List.of("1"), List.of()))
                        .stream().map(row -> row.referral().getId()).toList());
    }

    @Test
    public void linkedResultsRemainDistinctAndUnreturnedReferralsRemainAvailable() {
        var first = referral("1", null, "2026-05-07T11:00:00Z");
        var one = returned(first, "450", "2026-05-08T12:00:00Z");
        var two = returned(first, "450", "2026-05-09T12:00:00Z");
        var pending = referral("1", null, "2026-05-07T12:00:00Z");
        var outside = referral("1", null, "2026-05-06T12:00:00Z");
        returned(outside, "999", "2026-05-07T12:00:00Z");
        var rows = read(request("sentDate", "2026-05-07", "2026-05-07", "UTC", List.of("1"), List.of()));
        assertEquals(3, rows.size());
        assertEquals(List.of(one.getId(), two.getId()),
                rows.subList(0, 2).stream().map(row -> row.returnedResult().getId()).toList());
        assertNotEquals(rows.get(0).returnedResult().getResult().getId(),
                rows.get(1).returnedResult().getResult().getId());
        assertEquals("450", rows.get(0).returnedResult().getResult().getValue());
        assertEquals("450", rows.get(1).returnedResult().getResult().getValue());
        assertEquals(pending.getId(), rows.get(2).referral().getId());
        assertNull(rows.get(2).returnedResult());
        entityManager.clear();
        assertEquals("12345", rows.get(0).referral().getAnalysis().getSampleItem().getSample().getAccessionNumber());
        assertEquals("Global Health Org", rows.get(0).referral().getOrganization().getOrganizationName());
        assertEquals("1", rows.get(0).returnedTest().getId());
    }

    @Test
    public void testAndLabSectionFiltersUseTheReferredAnalysis() {
        var selected = referral("1", null, "2026-05-07T11:00:00Z");
        referral("2", null, "2026-05-07T11:00:00Z");
        assertEquals(List.of(selected.getId()),
                read(request("sentDate", "2026-05-07", "2026-05-07", "UTC", List.of("1", "2"), List.of("1"))).stream()
                        .map(row -> row.referral().getId()).toList());
        assertTrue(read(request("sentDate", "2026-05-07", "2026-05-07", "UTC", List.of("2"), List.of("1"))).isEmpty());
    }

    @Test
    public void unsupportedDateAnchorsAreRejectedBeforeQueryExecution() {
        assertThrows(IllegalArgumentException.class,
                () -> read(request("resultDate", "2026-05-07", "2026-05-07", "UTC", List.of("1"), List.of())));
    }
}
