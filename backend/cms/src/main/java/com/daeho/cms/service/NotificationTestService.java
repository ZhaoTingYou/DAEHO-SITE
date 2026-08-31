package com.daeho.cms.service;

import com.daeho.cms.repository.NotificationRepository;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationTestService {
  private static final Logger log = LoggerFactory.getLogger(NotificationTestService.class);
  private static final int TEST_DELIVERY_CHECKS = 10;
  private static final java.util.List<String> KAKAO_TEMPLATE_KEYS = java.util.List.of(
      "customer_contacted_kakao_ko",
      "customer_in_progress_kakao_ko",
      "customer_done_kakao_ko"
  );
  private final NotificationRepository repository;
  private final WorkspaceEmailSender email;
  private final SolapiKakaoClient kakao;
  private final TelegramBotClient telegram;
  private final NotificationTemplateRenderer renderer;
  private final DataSource dataSource;

  public NotificationTestService(
      NotificationRepository repository,
      WorkspaceEmailSender email,
      SolapiKakaoClient kakao,
      TelegramBotClient telegram,
      NotificationTemplateRenderer renderer,
      DataSource dataSource
  ) {
    this.repository = repository;
    this.email = email;
    this.kakao = kakao;
    this.telegram = telegram;
    this.renderer = renderer;
    this.dataSource = dataSource;
  }

  public Map<String, Object> send(
      String channel,
      String recipient,
      String templateKey,
      String customerName,
      String inquiryNumber
  ) {
    var template = repository.getActiveTemplate(templateKey);
    if (template == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected template is not active.");
    }
    if (!channel.equals(text(template.get("channel")))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The template channel does not match the test channel.");
    }
    var sampleInquiry = Map.<String, Object>ofEntries(
        Map.entry("id", firstNonBlank(inquiryNumber, "TEST-INQUIRY")),
        Map.entry("source", "test"),
        Map.entry("status", "new"),
        Map.entry("locale", text(template.get("locale"))),
        Map.entry("name", firstNonBlank(customerName, "DAEHO TEST")),
        Map.entry("phone", "01000000000"),
        Map.entry("email", "test@example.com"),
        Map.entry("organization", "DAEHO"),
        Map.entry("inquiryType", "test"),
        Map.entry("team", "DAEHO TEST TEAM"),
        Map.entry("quantity", 1),
        Map.entry("dueDate", "2099-12-31"),
        Map.entry("useCase", "Notification test"),
        Map.entry("message", "Notification connection test"),
        Map.entry("configuration", Map.of(
            "selectedHead", "TEST HEAD",
            "selectedShaft", "TEST SHAFT",
            "selectedStyle", "TEST STYLE",
            "engravingSample", "DAEHO TEST"
        )),
        Map.entry("pagePath", "/admin/notifications/test"),
        Map.entry("createdAt", "2099-01-01T00:00:00Z")
    );
    var variables = renderer.variables(
        sampleInquiry,
        "new",
        firstNonBlank(template.get("inquiryStatus"), "contacted")
    );
    var job = new LinkedHashMap<String, Object>();
    job.put(
        "recipient",
        "telegram".equals(channel) ? firstNonBlank(recipient, telegram.configuredChatId()) : recipient
    );
    job.put("subject", renderer.render(text(template.get("subject")), variables));
    job.put("renderedBody", renderer.render(text(template.get("body")), variables));
    job.put("providerTemplateCode", text(template.get("providerTemplateCode")));
    job.put("kakaoTemplateType", text(template.get("kakaoTemplateType")));
    job.put("providerVariables", Map.of(
        "#{고객명}", variables.getOrDefault("name", ""),
        "#{문의번호}", variables.getOrDefault("inquiry_id", "")
    ));

    if ("email".equals(channel)) {
      var result = email.send(job);
      return Map.of(
          "success", result.success(),
          "providerMessageId", result.providerMessageId(),
          "errorMessage", result.errorMessage()
      );
    }

    if ("telegram".equals(channel)) {
      var result = telegram.send(job);
      return Map.of(
          "success", result.success(),
          "providerMessageId", result.messageId(),
          "errorMessage", result.errorMessage()
      );
    }

    if (!"approved".equals(text(template.get("approvalStatus")))
        || text(template.get("providerTemplateCode")).isBlank()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The Kakao template is not externally approved.");
    }
    var testedFingerprint = verificationFingerprint(templateKey, template);
    return sendKakaoTestWithLock(templateKey, testedFingerprint, job);
  }

  private Map<String, Object> sendKakaoTestWithLock(
      String templateKey,
      String testedFingerprint,
      Map<String, Object> job
  ) {
    if (dataSource == null) {
      return sendKakaoTest(templateKey, testedFingerprint, job);
    }
    try (var connection = dataSource.getConnection()) {
      advisoryLock(connection, true);
      try {
        return sendKakaoTest(templateKey, testedFingerprint, job);
      } finally {
        try {
          advisoryLock(connection, false);
        } catch (SQLException error) {
          log.error("Unable to explicitly release the notification test lock; closing the connection will release it.", error);
        }
      }
    } catch (SQLException error) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "Unable to serialize the Kakao connection test with notification configuration changes."
      );
    }
  }

  private Map<String, Object> sendKakaoTest(
      String templateKey,
      String testedFingerprint,
      Map<String, Object> job
  ) {
    var result = kakao.send(job);
    if (!result.accepted()) {
      return Map.of(
          "success", false,
          "providerMessageId", result.messageId(),
          "errorMessage", result.errorMessage()
      );
    }
    for (var check = 0; check < TEST_DELIVERY_CHECKS; check += 1) {
      var delivery = kakao.getDeliveryStatus(result.messageId());
      if ("sent".equals(delivery.status())) {
        repository.markKakaoTemplateVerified(templateKey, testedFingerprint);
        return Map.of(
            "success", true,
            "providerMessageId", result.messageId(),
            "errorMessage", ""
        );
      }
      if ("failed".equals(delivery.status())) {
        return Map.of(
            "success", false,
            "providerMessageId", result.messageId(),
            "errorMessage", delivery.errorMessage()
        );
      }
      if (check + 1 < TEST_DELIVERY_CHECKS && !waitForNextDeliveryCheck()) {
        return Map.of(
            "success", false,
            "providerMessageId", result.messageId(),
            "errorMessage", "Kakao test delivery verification was interrupted."
        );
      }
    }
    return Map.of(
        "success", false,
        "providerMessageId", result.messageId(),
        "errorMessage", "SOLAPI accepted the test, but final Kakao delivery was not confirmed."
    );
  }

  private void advisoryLock(Connection connection, boolean acquire) throws SQLException {
    var function = acquire ? "pg_advisory_lock" : "pg_advisory_unlock";
    try (var statement = connection.prepareStatement("SELECT " + function + "(?)")) {
      statement.setLong(1, NotificationRepository.DISPATCH_LOCK_ID);
      statement.execute();
    }
  }

  public boolean kakaoVerified() {
    if (!kakao.configured()) {
      return false;
    }
    for (var templateKey : KAKAO_TEMPLATE_KEYS) {
      var template = repository.getActiveTemplate(templateKey);
      if (template == null
          || !"approved".equals(text(template.get("approvalStatus")))
          || text(template.get("providerTemplateCode")).isBlank()
          || !repository.kakaoTemplateVerified(templateKey, verificationFingerprint(templateKey, template))) {
        return false;
      }
    }
    return true;
  }

  public String verificationFingerprint(String templateKey, Map<String, Object> template) {
    return kakao.verificationFingerprint(
        templateKey,
        text(template.get("version")),
        text(template.get("providerTemplateCode")),
        text(template.get("kakaoTemplateType")),
        text(template.get("subject")),
        text(template.get("body"))
    );
  }

  public boolean kakaoJobVerified(Map<String, Object> job) {
    return kakaoVerified() && repository.kakaoJobTemplateVerified(text(job.get("id")));
  }

  private boolean waitForNextDeliveryCheck() {
    try {
      Thread.sleep(1000);
      return true;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  private String firstNonBlank(Object value, String fallback) {
    var text = text(value);
    return text.isBlank() ? fallback : text;
  }
}
