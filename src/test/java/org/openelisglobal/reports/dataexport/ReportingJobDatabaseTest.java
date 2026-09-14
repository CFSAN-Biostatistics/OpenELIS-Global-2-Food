package org.openelisglobal.reports.dataexport;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThrows;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import org.junit.Test;
import org.openelisglobal.BaseWebContextSensitiveTest;
import org.openelisglobal.reports.dataexport.valueholder.ExportJob;
import org.openelisglobal.reports.dataexport.valueholder.ExportJobState;
import org.springframework.transaction.annotation.Transactional;

@Transactional
public class ReportingJobDatabaseTest extends BaseWebContextSensitiveTest {
    @PersistenceContext
    private EntityManager entityManager;

    private ExportJob job(String owner, String requestId, String json) {
        return new ExportJob(owner, requestId, "SAMPLE_TESTING", "SPREADSHEET", json, "digest",
                Instant.parse("2026-09-13T12:00:00Z"), null);
    }

    @Test
    public void immutableRequestSurvivesMergeWhileLifecycleChangesPersist() {
        ExportJob original = job("42", "immutable-1", "original-request");
        entityManager.persist(original);
        entityManager.flush();
        assertNotNull(original.getId());
        String id = original.getId();
        ExportJob changed = job("99", "changed-submission", "changed-request");
        changed.setId(id);
        changed.setLastupdated(original.getLastupdated());
        changed.transitionTo(ExportJobState.GENERATING);
        entityManager.clear();
        entityManager.merge(changed);
        entityManager.flush();
        entityManager.clear();
        ExportJob stored = entityManager.find(ExportJob.class, id);
        assertEquals("42", stored.getOwnerId());
        assertEquals("immutable-1", stored.getClientRequestId());
        assertEquals("original-request", stored.getRequestJson());
        assertEquals(ExportJobState.GENERATING, stored.getState());
    }

    @Test
    public void submissionIdentityIsUniqueWithinAnOwner() {
        entityManager.persist(job("42", "duplicate-1", "original"));
        entityManager.flush();
        entityManager.persist(job("42", "duplicate-1", "second"));
        assertThrows(PersistenceException.class, entityManager::flush);
    }

    @Test
    public void differentOwnersCanUseTheSameClientRequestIdentifier() {
        ExportJob first = job("42", "shared-client-id", "first");
        ExportJob second = job("43", "shared-client-id", "second");
        entityManager.persist(first);
        entityManager.persist(second);
        entityManager.flush();
        entityManager.clear();
        assertEquals("42", entityManager.find(ExportJob.class, first.getId()).getOwnerId());
        assertEquals("43", entityManager.find(ExportJob.class, second.getId()).getOwnerId());
    }
}
