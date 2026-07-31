package com.daeho.cms.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;

class NotificationWorkerTest {
  @Test
  void scheduledWorkerWaitsUntilNotificationSchemaExists() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(NaverSensKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao);
    when(repository.notificationSchemaReady()).thenReturn(false);

    worker.processReadyJobs();

    verify(repository, never()).claimNextReadyJob();
  }

  @Test
  void scheduledWorkerStartsPollingAfterNotificationSchemaAppears() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(NaverSensKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao);
    when(repository.notificationSchemaReady()).thenReturn(false, true);
    when(repository.claimNextReadyJob()).thenReturn(null);

    worker.processReadyJobs();
    worker.processReadyJobs();

    verify(repository).claimNextReadyJob();
  }

  @Test
  void successfulEmailIsRecordedAndMarkedSent() {
    var repository = mock(NotificationRepository.class);
    var email = mock(WorkspaceEmailSender.class);
    var kakao = mock(NaverSensKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao);
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
    var kakao = mock(NaverSensKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao);
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
    var kakao = mock(NaverSensKakaoClient.class);
    var worker = new NotificationWorker(properties(), repository, email, kakao);
    var sendJob = job("kakao", 0, "queued");
    when(kakao.send(sendJob)).thenReturn(NaverSensKakaoClient.SendResult.accepted("kakao-1"));
    worker.process(sendJob);
    verify(repository).markProviderPending("job-1", 1, "kakao-1");

    var pollJob = new java.util.LinkedHashMap<String, Object>(job("kakao", 1, "provider_pending"));
    pollJob.put("providerMessageId", "kakao-1");
    when(kakao.getDeliveryStatus("kakao-1")).thenReturn(NaverSensKakaoClient.DeliveryStatus.sent());
    worker.process(pollJob);
    verify(repository).markSent("job-1", 1, "kakao-1");
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
    return new NotificationProperties(true, 1000, "", "", "", "", "", "");
  }
}
