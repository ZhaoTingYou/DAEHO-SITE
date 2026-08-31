package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class NotificationWorker {
  private static final Logger log = LoggerFactory.getLogger(NotificationWorker.class);
  private static final int[] RETRY_DELAYS_MINUTES = {1, 5, 30};

  private final NotificationProperties properties;
  private final NotificationRepository repository;
  private final WorkspaceEmailSender email;
  private final SolapiKakaoClient kakao;
  private final TelegramBotClient telegram;
  private final NotificationTestService notificationTest;
  private final DataSource dataSource;
  private volatile boolean schemaReady;

  @Autowired
  public NotificationWorker(
      NotificationProperties properties,
      NotificationRepository repository,
      WorkspaceEmailSender email,
      SolapiKakaoClient kakao,
      TelegramBotClient telegram,
      NotificationTestService notificationTest,
      DataSource dataSource
  ) {
    this.properties = properties;
    this.repository = repository;
    this.email = email;
    this.kakao = kakao;
    this.telegram = telegram;
    this.notificationTest = notificationTest;
    this.dataSource = dataSource;
  }

  NotificationWorker(
      NotificationProperties properties,
      NotificationRepository repository,
      WorkspaceEmailSender email,
      SolapiKakaoClient kakao,
      TelegramBotClient telegram,
      NotificationTestService notificationTest
  ) {
    this.properties = properties;
    this.repository = repository;
    this.email = email;
    this.kakao = kakao;
    this.telegram = telegram;
    this.notificationTest = notificationTest;
    this.dataSource = null;
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
      var processed = processNextReadyJobWithLock(index == 0);
      if (!processed) {
        return;
      }
    }
  }

  private boolean processNextReadyJobWithLock(boolean quarantineStale) {
    if (dataSource == null) {
      return processNextReadyJob(quarantineStale);
    }
    try (var connection = dataSource.getConnection()) {
      advisoryLock(connection, true);
      try {
        return processNextReadyJob(quarantineStale);
      } finally {
        advisoryLock(connection, false);
      }
    } catch (SQLException error) {
      log.error("Unable to acquire the notification dispatch lock.", error);
      return false;
    }
  }

  private boolean processNextReadyJob(boolean quarantineStale) {
    if (quarantineStale) {
      repository.quarantineStaleProcessingJobs();
    }
    var job = repository.claimNextReadyJob();
    if (job == null) {
      return false;
    }
    try {
      process(job);
    } catch (Exception error) {
      log.error("Unexpected notification worker failure for job {}", job.get("id"), error);
      repository.quarantineJob(
          text(job.get("id")),
          "Dispatch result is uncertain after an unexpected worker failure; manual review is required."
      );
    }
    return true;
  }

  private void advisoryLock(Connection connection, boolean acquire) throws SQLException {
    var function = acquire ? "pg_advisory_lock" : "pg_advisory_unlock";
    try (var statement = connection.prepareStatement("SELECT " + function + "(?)")) {
      statement.setLong(1, NotificationRepository.DISPATCH_LOCK_ID);
      statement.execute();
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
    if ("telegram".equals(text(job.get("channel")))) {
      sendTelegram(job);
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
    if (!notificationTest.kakaoJobVerified(job)) {
      repository.quarantineJob(
          text(job.get("id")),
          "The queued Kakao template or SOLAPI configuration is no longer verified; this job cannot be retried."
      );
      return;
    }
    var result = kakao.send(job);
    var attemptNumber = intValue(job.get("attemptCount")) + 1;
    if (result.accepted()) {
      repository.recordAttempt(text(job.get("id")), attemptNumber, "accepted", result.messageId(), "");
      repository.markProviderPending(text(job.get("id")), attemptNumber, result.messageId());
    } else {
      repository.recordAttempt(text(job.get("id")), attemptNumber, "failed", "", result.errorMessage());
      if (result.uncertain()) {
        repository.quarantineJob(
            text(job.get("id")),
            "SOLAPI request acceptance is uncertain; manual review is required before any resend. "
                + result.errorMessage()
        );
        return;
      }
      fail(job, result.errorMessage());
    }
  }

  private void sendTelegram(Map<String, Object> job) {
    if (!notificationTest.telegramJobVerified(job)) {
      repository.quarantineJob(
          text(job.get("id")),
          "The queued Telegram credentials or group are no longer verified; this job cannot be retried."
      );
      return;
    }
    var result = telegram.send(job);
    var attemptNumber = intValue(job.get("attemptCount")) + 1;
    if (result.success()) {
      repository.recordAttempt(
          text(job.get("id")),
          attemptNumber,
          "sent",
          result.messageId(),
          ""
      );
      repository.markSent(text(job.get("id")), attemptNumber, result.messageId());
      return;
    }
    repository.recordAttempt(text(job.get("id")), attemptNumber, "failed", "", result.errorMessage());
    if (result.uncertain()) {
      repository.quarantineJob(
          text(job.get("id")),
          "Telegram send result is uncertain; manual review is required before any resend. "
              + result.errorMessage()
      );
      return;
    }
    fail(job, result.errorMessage());
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
    if ("replacement".equals(status.status())) {
      repository.quarantineJob(
          text(job.get("id")),
          "SOLAPI unexpectedly replaced this Kakao message; manual review is required and it cannot be resent. "
              + status.errorMessage()
      );
      return;
    }
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
