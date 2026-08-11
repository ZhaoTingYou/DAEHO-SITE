package com.daeho.cms.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class NotificationWorkerTest {
  @Test
  void scheduledWorkerWaitsUntilNotificationSchemaExists() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = verifiedKakao();
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    when(repository.notificationSchemaReady()).thenReturn(false);

    worker.processReadyJobs();

    verify(repository, never()).claimNextReadyJob();
  }

  @Test
  void scheduledWorkerStartsPollingAfterNotificationSchemaAppears() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = verifiedKakao();
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    when(repository.notificationSchemaReady()).thenReturn(false, true);
    when(repository.claimNextReadyJob()).thenReturn(null);

    worker.processReadyJobs();
    worker.processReadyJobs();

    verify(repository).claimNextReadyJob();
  }

  @Test
  void staleDispatchesAreQuarantinedInsideTheDispatchLockBeforeClaimingWork() throws Exception {
    var repository = mock(NotificationRepository.class);
    var dataSource = mock(DataSource.class);
    var connection = mock(Connection.class);
    var lock = mock(PreparedStatement.class);
    var unlock = mock(PreparedStatement.class);
    when(dataSource.getConnection()).thenReturn(connection);
    when(connection.prepareStatement("SELECT pg_advisory_lock(?)")).thenReturn(lock);
    when(connection.prepareStatement("SELECT pg_advisory_unlock(?)")).thenReturn(unlock);
    var worker = new NotificationWorker(
        properties(),
        repository,
        mock(WorkspaceEmailSender.class),
        mock(SolapiKakaoClient.class),
        verifiedKakao(),
        dataSource
    );
    when(repository.notificationSchemaReady()).thenReturn(true);
    when(repository.claimNextReadyJob()).thenReturn(null);

    worker.processReadyJobs();

    var ordered = inOrder(connection, repository);
    ordered.verify(connection).prepareStatement("SELECT pg_advisory_lock(?)");
    ordered.verify(repository).quarantineStaleProcessingJobs();
    ordered.verify(repository).claimNextReadyJob();
    ordered.verify(connection).prepareStatement("SELECT pg_advisory_unlock(?)");
  }

  @Test
  void successfulEmailIsRecordedAndMarkedSent() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = verifiedKakao();
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    var job = job("email", 0, "queued");
    when(email.send(job)).thenReturn(WorkspaceEmailSender.DeliveryResult.sent("smtp-1"));

    worker.process(job);

    verify(repository).recordAttempt("job-1", 1, "sent", "smtp-1", "");
    verify(repository).markSent("job-1", 1, "smtp-1");
  }

  @Test
  void fourthFailureMovesThroughTheFinalThirtyMinuteRetryBoundary() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = verifiedKakao();
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    var job = job("email", 3, "failed");
    when(email.send(job)).thenReturn(WorkspaceEmailSender.DeliveryResult.failed("relay unavailable"));

    worker.process(job);

    verify(repository).recordAttempt("job-1", 4, "failed", "", "relay unavailable");
    verify(repository).scheduleRetry("job-1", 4, "relay unavailable", 30);
  }

  @Test
  void acceptedKakaoMessageIsPolledBeforeBeingMarkedSent() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = verifiedKakao();
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    var sendJob = job("kakao", 0, "queued");
    when(kakao.send(sendJob)).thenReturn(SolapiKakaoClient.SendResult.accepted("kakao-1"));
    worker.process(sendJob);
    verify(repository).markProviderPending("job-1", 1, "kakao-1");

    var pollJob = new java.util.LinkedHashMap<String, Object>(job("kakao", 1, "provider_pending"));
    pollJob.put("providerMessageId", "kakao-1");
    when(kakao.getDeliveryStatus("kakao-1")).thenReturn(SolapiKakaoClient.DeliveryStatus.sent());
    worker.process(pollJob);
    verify(repository).markSent("job-1", 1, "kakao-1");
  }

  @Test
  void uncertainSolapiAcceptanceIsQuarantinedInsteadOfAutomaticallyRetried() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao, verifiedKakao());
    var job = job("kakao", 0, "queued");
    when(kakao.send(job)).thenReturn(SolapiKakaoClient.SendResult.uncertain("response lost"));

    worker.process(job);

    verify(repository).recordAttempt("job-1", 1, "failed", "", "response lost");
    verify(repository).quarantineJob(
        "job-1",
        "SOLAPI request acceptance is uncertain; manual review is required before any resend. response lost"
    );
    verify(repository, never()).scheduleRetry(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt()
    );
  }

  @Test
  void unexpectedSmsReplacementIsQuarantinedAndNeverRetried() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    var worker = new NotificationWorker(
        properties(), repository, mock(WorkspaceEmailSender.class), kakao, verifiedKakao()
    );
    var job = new java.util.LinkedHashMap<String, Object>(job("kakao", 1, "provider_pending"));
    job.put("providerMessageId", "kakao-1");
    when(kakao.getDeliveryStatus("kakao-1"))
        .thenReturn(SolapiKakaoClient.DeliveryStatus.replacement("SMS replacement"));

    worker.process(job);

    verify(repository).recordAttempt("job-1", 1, "failed", "kakao-1", "SMS replacement");
    verify(repository).quarantineJob(
        "job-1",
        "SOLAPI unexpectedly replaced this Kakao message; manual review is required and it cannot be resent. "
            + "SMS replacement"
    );
    verify(repository, never()).scheduleRetry(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt()
    );
  }

  @Test
  void refusesToSendQueuedKakaoWhenVerificationIsNoLongerCurrent() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var verification = mock(NotificationTestService.class);
    when(verification.kakaoJobVerified(job("kakao", 0, "queued"))).thenReturn(false);
    var worker = new NotificationWorker(properties(), repository, email, kakao, verification);
    var job = job("kakao", 0, "queued");

    worker.process(job);

    verify(kakao, never()).send(job);
    verify(repository).quarantineJob(
        "job-1",
        "The queued Kakao template or SOLAPI configuration is no longer verified; this job cannot be retried."
    );
  }

  @Test
  void quarantinesAnUncertainDispatchInsteadOfAutomaticallyResendingIt() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(SolapiKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao, verifiedKakao());
    var job = job("email", 0, "queued");
    when(repository.notificationSchemaReady()).thenReturn(true);
    when(repository.claimNextReadyJob()).thenReturn(job, null);
    when(email.send(job)).thenThrow(new IllegalStateException("database connection failed after SMTP"));

    worker.processReadyJobs();

    verify(repository).quarantineJob(
        "job-1",
        "Dispatch result is uncertain after an unexpected worker failure; manual review is required."
    );
    verify(repository, never()).scheduleRetry(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyInt()
    );
  }

  private NotificationTestService verifiedKakao() {
    var verification = mock(NotificationTestService.class);
    when(verification.kakaoVerified()).thenReturn(true);
    when(verification.kakaoJobVerified(org.mockito.ArgumentMatchers.anyMap())).thenReturn(true);
    return verification;
  }

  private Map<String, Object> job(String channel, int attemptCount, String claimedFromStatus) {
    var job = new java.util.LinkedHashMap<String, Object>();
    job.put("id", "job-1");
    job.put("channel", channel);
    job.put("attemptCount", attemptCount);
    job.put("deliveryCheckCount", 0);
    job.put("claimedFromStatus", claimedFromStatus);
    job.put("providerMessageId", "");
    return job;
  }

  private NotificationProperties properties() {
    return new NotificationProperties(true, 1000, "", "", "", "", "");
  }
}
