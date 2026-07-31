package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class NotificationWorker {
  private static final Logger log = LoggerFactory.getLogger(NotificationWorker.class);
  private static final int[] RETRY_DELAYS_MINUTES = {1, 5, 30};

  private final NotificationProperties properties;
  private final NotificationRepository repository;
  private final WorkspaceEmailSender email;
  private final NaverSensKakaoClient kakao;
  private volatile boolean schemaReady;

  public NotificationWorker(
      NotificationProperties properties,
      NotificationRepository repository,
      WorkspaceEmailSender email,
      NaverSensKakaoClient kakao
  ) {
    this.properties = properties;
    this.repository = repository;
    this.email = email;
    this.kakao = kakao;
  }

  @Scheduled(fixedDelayString = "${cms.notifications.worker-delay-ms:1000}")
  public void processReadyJobs() {
    if (!properties.workerEnabled()) {
      return;
    }
    if (!schemaReady) {
      schemaReady = repository.notificationSchemaReady();
      if (!schemaReady) {
        return;
      }
    }
    for (var index = 0; index < 10; index += 1) {
      var job = repository.claimNextReadyJob();
      if (job == null) {
        return;
      }
      try {
        process(job);
      } catch (Exception error) {
        log.error("Unexpected notification worker failure for job {}", job.get("id"), error);
        fail(job, error.getMessage() == null ? "Unexpected notification worker error." : error.getMessage());
      }
    }
  }

  void process(Map<String, Object> job) {
    if ("provider_pending".equals(text(job.get("claimedFromStatus")))) {
      pollKakao(job);
      return;
    }
    if ("email".equals(text(job.get("channel")))) {
      sendEmail(job);
      return;
    }
    if ("kakao".equals(text(job.get("channel")))) {
      sendKakao(job);
      return;
    }
    fail(job, "Unsupported notification channel.");
  }

  private void sendEmail(Map<String, Object> job) {
    var result = email.send(job);
    var attemptNumber = intValue(job.get("attemptCount")) + 1;
    if (result.success()) {
      repository.recordAttempt(
          text(job.get("id")),
          attemptNumber,
          "sent",
          result.providerMessageId(),
          ""
      );
      repository.markSent(text(job.get("id")), attemptNumber, result.providerMessageId());
    } else {
      repository.recordAttempt(text(job.get("id")), attemptNumber, "failed", "", result.errorMessage());
      fail(job, result.errorMessage());
    }
  }

  private void sendKakao(Map<String, Object> job) {
    var result = kakao.send(job);
    var attemptNumber = intValue(job.get("attemptCount")) + 1;
    if (result.accepted()) {
      repository.recordAttempt(text(job.get("id")), attemptNumber, "accepted", result.messageId(), "");
      repository.markProviderPending(text(job.get("id")), attemptNumber, result.messageId());
    } else {
      repository.recordAttempt(text(job.get("id")), attemptNumber, "failed", "", result.errorMessage());
      fail(job, result.errorMessage());
    }
  }

  private void pollKakao(Map<String, Object> job) {
    var status = kakao.getDeliveryStatus(text(job.get("providerMessageId")));
    if ("sent".equals(status.status())) {
      repository.recordAttempt(
          text(job.get("id")),
          intValue(job.get("attemptCount")),
          "sent",
          text(job.get("providerMessageId")),
          ""
      );
      repository.markSent(
          text(job.get("id")),
          intValue(job.get("attemptCount")),
          text(job.get("providerMessageId"))
      );
      return;
    }
    if ("processing".equals(status.status()) || "unknown".equals(status.status())) {
      repository.scheduleDeliveryCheck(
          text(job.get("id")),
          intValue(job.get("deliveryCheckCount")) + 1
      );
      return;
    }
    repository.recordAttempt(
        text(job.get("id")),
        intValue(job.get("attemptCount")),
        "failed",
        text(job.get("providerMessageId")),
        status.errorMessage()
    );
    fail(job, status.errorMessage());
  }

  private void fail(Map<String, Object> job, String errorMessage) {
    var failedAttemptCount = "provider_pending".equals(text(job.get("claimedFromStatus")))
        ? intValue(job.get("attemptCount"))
        : intValue(job.get("attemptCount")) + 1;
    var delayIndex = Math.max(0, Math.min(failedAttemptCount - 1, RETRY_DELAYS_MINUTES.length - 1));
    repository.scheduleRetry(
        text(job.get("id")),
        failedAttemptCount,
        errorMessage,
        RETRY_DELAYS_MINUTES[delayIndex]
    );
  }

  private int intValue(Object value) {
    return value instanceof Number number ? number.intValue() : 0;
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
