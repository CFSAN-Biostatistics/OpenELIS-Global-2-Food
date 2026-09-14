package org.openelisglobal.reports.dataexport;

import static org.junit.Assert.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openelisglobal.BaseWebContextSensitiveTest;
import org.openelisglobal.reports.dataexport.form.ExportFilter;
import org.openelisglobal.reports.dataexport.form.ExportJobView;
import org.openelisglobal.reports.dataexport.form.ExportSubmission;
import org.openelisglobal.reports.dataexport.service.ReportingException;
import org.openelisglobal.reports.dataexport.service.ReportingFiles;
import org.openelisglobal.reports.dataexport.service.ReportingJobService;
import org.openelisglobal.reports.dataexport.service.ReportingSettings;
import org.openelisglobal.reports.dataexport.valueholder.ExportJob;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

@Transactional
public class ReportingRecoveryIntegrationTest extends BaseWebContextSensitiveTest {
    private static final String OWNER = "1";
    private static final Instant START = Instant.parse("2026-09-14T12:00:00Z");
    @Autowired
    private ReportingJobService jobs;
    @Autowired
    private ReportingSettings settings;
    @Autowired
    private ReportingFiles files;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private org.springframework.transaction.PlatformTransactionManager transactions;
    private Object originalDirectory;
    private Object originalClock;
    private Path directory;
    private org.springframework.web.context.request.RequestAttributes originalRequest;

    @Before
    public void fixture() throws Exception {
        executeDataSetWithStateManagement("testdata/reporting-sample-testing.xml");
        originalRequest = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        var security = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        security.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                org.springframework.security.core.userdetails.User.withUsername("admin").password("unused")
                        .roles("ADMIN").build(),
                "unused"));
        request.getSession().setAttribute(
                org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                security);
        request.getSession().setAttribute("userSessionData",
                new org.openelisglobal.login.valueholder.UserSessionData());
        org.springframework.web.context.request.RequestContextHolder
                .setRequestAttributes(new org.springframework.web.context.request.ServletRequestAttributes(request));
        directory = Files.createTempDirectory("reporting-recovery-");
        originalDirectory = ReflectionTestUtils.getField(settings, "directory");
        originalClock = ReflectionTestUtils.getField(jobs, "clock");
        ReflectionTestUtils.setField(settings, "directory", directory.toString());
        at(START);
    }

    @After
    public void restore() throws Exception {
        org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(originalRequest);
        if (directory == null)
            return;
        ReflectionTestUtils.setField(settings, "directory", originalDirectory);
        ReflectionTestUtils.setField(jobs, "clock", originalClock);
        try (var paths = Files.walk(directory)) {
            for (var path : paths.sorted(java.util.Comparator.reverseOrder()).toList())
                Files.deleteIfExists(path);
        }
    }

    private void at(Instant instant) {
        ReflectionTestUtils.setField(jobs, "clock", Clock.fixed(instant, ZoneOffset.UTC));
    }

    private ExportJobView submit() {
        return jobs.submit(OWNER,
                new ExportSubmission(1, "SAMPLE_TESTING", "SPREADSHEET", UUID.randomUUID().toString(),
                        List.of("accessionNumber", "test:1"),
                        new ExportFilter("2023-11-15", "2023-11-15", List.of(), List.of(), List.of("FINALIZED"))));
    }

    @Test
    public void failedRetryCopiesFrozenRequestAndIsIdempotentWithoutChangingParent() {
        var parent = submit();
        String worker = UUID.randomUUID().toString();
        assertEquals(parent.id(), jobs.claim(worker).id());
        jobs.failed(OWNER, parent.id(), worker, "reporting.job.generationFailed");
        var child = jobs.retry(OWNER, parent.id(), "retry-once");
        assertNotEquals(parent.id(), child.id());
        assertEquals(parent.id(), child.parentId());
        assertEquals(parent.request(), child.request());
        assertEquals("QUEUED", child.state());
        assertEquals(child.id(), jobs.retry(OWNER, parent.id(), "retry-once").id());
        assertEquals("FAILED", jobs.detail(OWNER, parent.id()).state());
        assertEquals(409,
                assertThrows(ReportingException.class, () -> jobs.retry(OWNER, child.id(), "retry-once")).status());
    }

    @Test
    public void cancellationIsIdempotentButCannotCancelClaimedWork() {
        var cancelled = submit();
        assertEquals("CANCELLED", jobs.cancel(OWNER, cancelled.id()).state());
        assertEquals("CANCELLED", jobs.cancel(OWNER, cancelled.id()).state());
        var running = submit();
        assertEquals(running.id(), jobs.claim(UUID.randomUUID().toString()).id());
        assertEquals(409, assertThrows(ReportingException.class, () -> jobs.cancel(OWNER, running.id())).status());
        assertEquals("GENERATING", jobs.detail(OWNER, running.id()).state());
        assertEquals(404, assertThrows(ReportingException.class, () -> jobs.cancel("99999", running.id())).status());
    }

    @Test
    public void recoveryFailsOnlyAbandonedWorkersAndKeepsQueuedRequests() {
        var abandoned = submit();
        String lostWorker = UUID.randomUUID().toString();
        assertEquals(abandoned.id(), jobs.claim(lostWorker).id());
        var active = submit();
        String liveWorker = UUID.randomUUID().toString();
        assertEquals(active.id(), jobs.claim(liveWorker).id());
        var queued = submit();
        at(START.plusSeconds(240));
        assertTrue(jobs.renewLease(active.id(), liveWorker));
        at(START.plusSeconds(301));
        jobs.recover();
        assertEquals("FAILED", jobs.detail(OWNER, abandoned.id()).state());
        assertEquals("reporting.job.interrupted", jobs.detail(OWNER, abandoned.id()).failureCode());
        assertEquals("GENERATING", jobs.detail(OWNER, active.id()).state());
        assertEquals("QUEUED", jobs.detail(OWNER, queued.id()).state());
        assertFalse(jobs.renewLease(abandoned.id(), lostWorker));
        assertFalse(jobs.renewLease(active.id(), lostWorker));
    }

    @Test
    public void lostWorkerCannotPublishAndCleanupPreservesLivePartialOutput() throws Exception {
        var abandoned = submit();
        String lostWorker = UUID.randomUUID().toString();
        jobs.claim(lostWorker);
        Path stale = files.stage(abandoned.id(), lostWorker);
        Files.writeString(stale, "incomplete");
        at(START.plusSeconds(301));
        jobs.recover();
        var active = submit();
        String liveWorker = UUID.randomUUID().toString();
        jobs.claim(liveWorker);
        Path live = files.stage(active.id(), liveWorker);
        Files.writeString(live, "still writing");
        assertEquals(409,
                assertThrows(ReportingException.class, () -> jobs.publish(OWNER, abandoned.id(), lostWorker, 1))
                        .status());
        jobs.cleanupOutput();
        assertFalse(Files.exists(stale));
        assertFalse(Files.exists(files.path(abandoned.id())));
        assertEquals("still writing", Files.readString(live));
        assertEquals("GENERATING", jobs.detail(OWNER, active.id()).state());
    }

    @Test
    public void expiryDeniesNewDownloadsWhileAnOpenedDownloadRemainsComplete() throws Exception {
        var job = submit();
        String worker = UUID.randomUUID().toString();
        jobs.claim(worker);
        String csv = "\uFEFFAccession Number,Blood Test\r\n12345,120\r\n";
        Files.writeString(files.stage(job.id(), worker), csv);
        jobs.publish(OWNER, job.id(), worker, 1);
        var ready = jobs.detail(OWNER, job.id());
        assertEquals("READY", ready.state());
        assertEquals(Long.valueOf(1), ready.rowCount());
        try (var download = jobs.download(OWNER, job.id()).input()) {
            at(Instant.parse(ready.expiresAt()));
            jobs.recover();
            jobs.cleanupOutput();
            assertEquals("EXPIRED", jobs.detail(OWNER, job.id()).state());
            assertEquals(410, assertThrows(ReportingException.class, () -> jobs.download(OWNER, job.id())).status());
            assertFalse(Files.exists(files.path(job.id())));
            assertEquals(csv, new String(download.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            assertEquals(job.request(), jobs.detail(OWNER, job.id()).request());
        }
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public void twoApplicationWorkersCannotClaimTheSameJob() throws Exception {
        var submitted = submit();
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var barrier = new java.util.concurrent.CyclicBarrier(2);
        try {
            var attempts = new java.util.ArrayList<java.util.concurrent.Future<ExportJobView>>();
            for (int i = 0; i < 2; i++)
                attempts.add(executor.submit(() -> {
                    barrier.await(5, java.util.concurrent.TimeUnit.SECONDS);
                    return jobs.claim(UUID.randomUUID().toString());
                }));
            var claimed = new java.util.ArrayList<String>();
            for (var attempt : attempts) {
                var value = attempt.get(10, java.util.concurrent.TimeUnit.SECONDS);
                if (value != null)
                    claimed.add(value.id());
            }
            assertEquals(List.of(submitted.id()), claimed);
            assertEquals("GENERATING", jobs.detail(OWNER, submitted.id()).state());
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS));
            removeCommittedJob(submitted.id());
        }
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public void cancellationRacingAClaimNeverReportsFalseSuccess() throws Exception {
        var submitted = submit();
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var barrier = new java.util.concurrent.CyclicBarrier(2);
        try {
            var claim = executor.submit(() -> {
                barrier.await(5, java.util.concurrent.TimeUnit.SECONDS);
                return jobs.claim(UUID.randomUUID().toString());
            });
            var cancel = executor.submit(() -> {
                barrier.await(5, java.util.concurrent.TimeUnit.SECONDS);
                try {
                    return jobs.cancel(OWNER, submitted.id()).state();
                } catch (ReportingException error) {
                    assertEquals(409, error.status());
                    return "CLAIMED";
                }
            });
            var claimed = claim.get(10, java.util.concurrent.TimeUnit.SECONDS);
            var cancelled = cancel.get(10, java.util.concurrent.TimeUnit.SECONDS);
            if ("CANCELLED".equals(cancelled)) {
                assertEquals(null, claimed);
                assertEquals("CANCELLED", jobs.detail(OWNER, submitted.id()).state());
            } else {
                assertEquals(submitted.id(), claimed.id());
                assertEquals("GENERATING", jobs.detail(OWNER, submitted.id()).state());
            }
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS));
            removeCommittedJob(submitted.id());
        }
    }

    private void removeCommittedJob(String id) {
        new org.springframework.transaction.support.TransactionTemplate(transactions)
                .executeWithoutResult(status -> entityManager.remove(entityManager.find(ExportJob.class, id)));
    }
}
