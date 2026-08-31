package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NotificationPlannerTest {
  private NotificationRepository repository;
  private NotificationTestService notificationTest;
  private TelegramCredentialService telegramCredentials;
  private NotificationPlanner planner;
  private List<Map<String, Object>> createdJobs;

  @BeforeEach
  void setUp() {
    repository = mock(NotificationRepository.class);
    notificationTest = mock(NotificationTestService.class);
    telegramCredentials = mock(TelegramCredentialService.class);
    when(telegramCredentials.current()).thenReturn(
        new TelegramCredentialService.Credentials("test-token", "-1001234567890")
    );
    when(telegramCredentials.verified()).thenReturn(true);
    when(telegramCredentials.fingerprint(org.mockito.ArgumentMatchers.any()))
        .thenReturn("telegram-fingerprint");
    when(notificationTest.kakaoVerified()).thenReturn(true);
    when(notificationTest.verificationFingerprint(anyString(), anyMap())).thenReturn("verified-fingerprint");
    createdJobs = new ArrayList<>();
    when(repository.getSettings(anyString())).thenReturn(Map.of(
        "internalEmail", "internal@example.com",
        "internalEmailEnabled", true,
        "customerEmailEnabled", true,
        "kakaoEnabled", true,
        "telegramEnabled", true
    ));
    when(repository.getActiveTemplate(anyString())).thenAnswer(invocation ->
        template(invocation.getArgument(0), true)
    );
    when(repository.getLatestTemplate(anyString())).thenAnswer(invocation ->
        template(invocation.getArgument(0), true)
    );
    when(repository.createJob(anyMap())).thenAnswer(invocation -> {
      var job = new LinkedHashMap<String, Object>((Map<String, Object>) invocation.getArgument(0));
      job.put("id", "job-" + createdJobs.size());
      createdJobs.add(job);
      return job;
    });
    planner = new NotificationPlanner(
        cmsProperties(),
        telegramCredentials,
        repository,
        new NotificationTemplateRenderer(new NotificationProperties(
            true, 1000, "https://daeho.works/admin", "", "", "", "",
            "https://api.telegram.org", ""
        )),
        notificationTest
    );
  }

  @Test
  void queuesTelegramForNewInquiryAlongsideInternalEmail() {
    planner.queueNewInquiry(inquiry("customer@example.com", "010-1234-5678"));

    assertEquals(2, createdJobs.size());
    assertTrue(createdJobs.stream().anyMatch(job ->
        "internal".equals(job.get("audience"))
            && "telegram".equals(job.get("channel"))
            && "inquiry-1:new_inquiry:internal:telegram".equals(job.get("dedupeKey"))
            && "telegram-fingerprint".equals(job.get("verificationFingerprint"))
    ));
  }

  @Test
  void telegramMessageIsBoundedAndAlwaysKeepsTheCmsLink() {
    var telegramTemplate = Map.<String, Object>ofEntries(
        Map.entry("id", "template-internal-new-telegram-ko"),
        Map.entry("templateKey", "internal_new_telegram_ko"),
        Map.entry("channel", "telegram"),
        Map.entry("version", 1),
        Map.entry("subject", ""),
        Map.entry("body", "{{inquiry_id}} {{inquiry_type}} {{name}} {{organization}} {{team}} {{phone}} {{email}} {{quantity}} {{due_date}} {{use_case}} {{message}} {{admin_url}}"),
        Map.entry("providerTemplateCode", ""),
        Map.entry("approvalStatus", "approved"),
        Map.entry("isActive", true)
    );
    when(repository.getActiveTemplate("internal_new_telegram_ko")).thenReturn(telegramTemplate);
    when(repository.getLatestTemplate("internal_new_telegram_ko")).thenReturn(telegramTemplate);
    var longInquiry = new LinkedHashMap<String, Object>();
    longInquiry.put("id", "inquiry-1");
    longInquiry.put("status", "new");
    longInquiry.put("locale", "ko");
    longInquiry.put("name", "이".repeat(120));
    longInquiry.put("organization", "회".repeat(160));
    longInquiry.put("team", "팀".repeat(160));
    longInquiry.put("phone", "1".repeat(180));
    longInquiry.put("email", "a".repeat(242) + "@example.com");
    longInquiry.put("inquiryType", "유".repeat(160));
    longInquiry.put("quantity", 999999);
    longInquiry.put("dueDate", "일".repeat(160));
    longInquiry.put("useCase", "용".repeat(160));
    longInquiry.put("message", "문".repeat(3000));

    planner.queueNewInquiry(longInquiry);

    var body = createdJobs.stream()
        .filter(job -> "telegram".equals(job.get("channel")))
        .findFirst()
        .orElseThrow()
        .get("renderedBody")
        .toString();
    assertTrue(body.codePointCount(0, body.length()) <= 4096);
    assertTrue(body.endsWith("https://daeho.works/admin/inquiries/inquiry-1"));
  }

  @Test
  void missingTelegramCredentialsBecomeManualWorkWithoutBlockingTheInquiry() {
    var missingCredentials = mock(TelegramCredentialService.class);
    when(missingCredentials.current()).thenReturn(
        new TelegramCredentialService.Credentials("", "-1001234567890")
    );
    var plannerWithoutToken = new NotificationPlanner(
        cmsProperties(),
        missingCredentials,
        repository,
        new NotificationTemplateRenderer(new NotificationProperties(
            true, 1000, "https://daeho.works/admin", "", "", "", "",
            "https://api.telegram.org", ""
        )),
        notificationTest
    );

    plannerWithoutToken.queueNewInquiry(inquiry("customer@example.com", "010-1234-5678"));

    var telegram = createdJobs.stream()
        .filter(job -> "telegram".equals(job.get("channel")))
        .findFirst()
        .orElseThrow();
    assertEquals("needs_attention", telegram.get("status"));
    assertTrue(telegram.get("lastError").toString().contains("credentials"));
  }

  @Test
  void unverifiedTelegramCredentialsBecomeManualWorkWithoutSending() {
    when(telegramCredentials.verified()).thenReturn(false);

    planner.queueNewInquiry(inquiry("customer@example.com", "010-1234-5678"));

    var telegram = createdJobs.stream()
        .filter(job -> "telegram".equals(job.get("channel")))
        .findFirst()
        .orElseThrow();
    assertEquals("needs_attention", telegram.get("status"));
    assertTrue(telegram.get("lastError").toString().contains("test"));
  }

  @Test
  void routesEmailAndKakaoWhenBothCustomerContactsExist() {
    var event = Map.<String, Object>of(
        "id", "event-1",
        "previousStatus", "new",
        "nextStatus", "contacted"
    );

    planner.queueStatusChange(inquiry("customer@example.com", "010-1234-5678"), event);

    assertEquals(3, createdJobs.size());
    assertTrue(createdJobs.stream().anyMatch(job ->
        "internal".equals(job.get("audience")) && "email".equals(job.get("channel"))
    ));
    assertTrue(createdJobs.stream().anyMatch(job ->
        "customer".equals(job.get("audience")) && "email".equals(job.get("channel"))
    ));
    assertTrue(createdJobs.stream().anyMatch(job ->
        "customer".equals(job.get("audience"))
            && "kakao".equals(job.get("channel"))
            && "01012345678".equals(job.get("recipient"))
            && "verified-fingerprint".equals(job.get("verificationFingerprint"))
    ));
  }

  @Test
  void alwaysUsesTheApprovedKoreanKakaoTemplateForEnglishInquiries() {
    var englishInquiry = new LinkedHashMap<String, Object>(
        inquiry("customer@example.com", "010-1234-5678")
    );
    englishInquiry.put("locale", "en");

    planner.queueStatusChange(englishInquiry, Map.of(
        "id", "event-en",
        "previousStatus", "contacted",
        "nextStatus", "in_progress"
    ));

    var kakao = createdJobs.stream()
        .filter(job -> "kakao".equals(job.get("channel")))
        .findFirst()
        .orElseThrow();
    assertEquals("ko", kakao.get("locale"));
    assertEquals("customer_in_progress_kakao_ko", kakao.get("templateKey"));
  }

  @Test
  void capturesOnlyTheApprovedKakaoVariablesFromTheCurrentInquiry() {
    var template = Map.<String, Object>of(
        "id", "template-customer_done_kakao_ko",
        "templateKey", "customer_done_kakao_ko",
        "channel", "kakao",
        "version", 3,
        "subject", "{{name}}님의 문의 {{inquiry_id}}",
        "body", "{{phone}}|{{email}}|{{organization}}|{{inquiry_type}}|{{message}}|{{previous_status_label}}|{{status_label}}",
        "providerTemplateCode", "KA01TP-DONE",
        "kakaoTemplateType", "highlight",
        "approvalStatus", "approved",
        "isActive", true
    );
    when(repository.getActiveTemplate("customer_done_kakao_ko")).thenReturn(template);
    when(repository.getLatestTemplate("customer_done_kakao_ko")).thenReturn(template);
    var inquiry = new LinkedHashMap<String, Object>(inquiry("customer@example.com", "010-1234-5678"));
    inquiry.put("name", "홍길동");
    inquiry.put("organization", "대호 스포츠");
    inquiry.put("inquiryType", "trophy");
    inquiry.put("message", "시상식 트로피 상담");

    planner.queueStatusChange(inquiry, Map.of(
        "id", "event-done",
        "previousStatus", "in_progress",
        "nextStatus", "done"
    ));

    var kakao = createdJobs.stream()
        .filter(job -> "kakao".equals(job.get("channel")))
        .findFirst()
        .orElseThrow();
    assertEquals(Map.of(
        "#{고객명}", "홍길동",
        "#{문의번호}", "inquiry-1"
    ), kakao.get("providerVariables"));
  }

  @Test
  void healthOnlyRequiresTheThreeApprovedKoreanKakaoTemplates() {
    when(repository.getActiveTemplate("customer_contacted_kakao_en")).thenReturn(null);
    when(repository.getActiveTemplate("customer_in_progress_kakao_en")).thenReturn(null);
    when(repository.getActiveTemplate("customer_done_kakao_en")).thenReturn(null);

    assertEquals(true, planner.health().get("kakaoTemplatesReady"));
  }

  @Test
  void sendsNoCustomerMessageForNewOrSpamAndNoJobForDuplicateStatus() {
    planner.queueStatusChange(inquiry("customer@example.com", "010-1234-5678"), Map.of(
        "id", "event-1",
        "previousStatus", "contacted",
        "nextStatus", "spam"
    ));
    assertEquals(1, createdJobs.size());
    assertEquals("internal", createdJobs.get(0).get("audience"));

    createdJobs.clear();
    var jobs = planner.queueStatusChange(inquiry("customer@example.com", "010-1234-5678"), Map.of(
        "id", "event-2",
        "previousStatus", "done",
        "nextStatus", "done"
    ));
    assertTrue(jobs.isEmpty());
    verify(repository, never()).getActiveTemplate("customer_done_email_ko");
  }

  @Test
  void invalidKoreanMobileNumberIsVisibleForManualHandling() {
    planner.queueStatusChange(inquiry("", "+1 415 555 0100"), Map.of(
        "id", "event-1",
        "previousStatus", "new",
        "nextStatus", "in_progress"
    ));

    var kakao = createdJobs.stream()
        .filter(job -> "kakao".equals(job.get("channel")))
        .findFirst()
        .orElseThrow();
    assertEquals("needs_attention", kakao.get("status"));
    assertTrue(kakao.get("lastError").toString().contains("Korean mobile"));
  }

  @Test
  void doesNotQueueKakaoWhenTheCurrentProviderAndTemplatesAreUnverified() {
    when(notificationTest.kakaoVerified()).thenReturn(false);

    planner.queueStatusChange(inquiry("", "010-1234-5678"), Map.of(
        "id", "event-unverified",
        "previousStatus", "new",
        "nextStatus", "contacted"
    ));

    assertTrue(createdJobs.stream().noneMatch(job -> "kakao".equals(job.get("channel"))));
  }

  @Test
  void newInquiryOnlyQueuesInternalNotifications() {
    planner.queueNewInquiry(inquiry("customer@example.com", "010-1234-5678"));
    assertEquals(2, createdJobs.size());
    assertTrue(createdJobs.stream().allMatch(job -> "internal".equals(job.get("audience"))));
    assertTrue(createdJobs.stream().allMatch(job -> "new_inquiry".equals(job.get("eventType"))));
  }

  @Test
  void malformedActiveTemplateBecomesManualWorkInsteadOfBreakingTheStatusTransaction() {
    when(repository.getActiveTemplate("customer_done_email_ko")).thenReturn(Map.of(
        "id", "template-bad",
        "templateKey", "customer_done_email_ko",
        "channel", "email",
        "version", 2,
        "subject", "Done",
        "body", "Hello {{customer_password}}",
        "providerTemplateCode", "",
        "approvalStatus", "approved",
        "isActive", true
    ));

    planner.queueStatusChange(inquiry("customer@example.com", ""), Map.of(
        "id", "event-3",
        "previousStatus", "in_progress",
        "nextStatus", "done"
    ));

    var customerEmail = createdJobs.stream()
        .filter(job -> "customer".equals(job.get("audience")))
        .findFirst()
        .orElseThrow();
    assertEquals("needs_attention", customerEmail.get("status"));
    assertTrue(customerEmail.get("lastError").toString().contains("customer_password"));
  }

  private Map<String, Object> inquiry(String email, String phone) {
    return Map.of(
        "id", "inquiry-1",
        "status", "new",
        "locale", "ko",
        "name", "Tester",
        "email", email,
        "phone", phone,
        "contact", phone,
        "organization", "",
        "inquiryType", "other",
        "message", "Hello"
    );
  }

  private Map<String, Object> template(String key, boolean active) {
    var channel = key.contains("_kakao_") ? "kakao" : "email";
    return Map.of(
        "id", "template-" + key,
        "templateKey", key,
        "channel", channel,
        "version", 1,
        "subject", "Status {{status}}",
        "body", "Hello {{name}} {{status_label}}",
        "providerTemplateCode", "kakao".equals(channel) ? "APPROVED_CODE" : "",
        "approvalStatus", "approved",
        "isActive", active
    );
  }

  private CmsProperties cmsProperties() {
    return new CmsProperties(
        "", "fallback@example.com", "", false, Path.of("/tmp/uploads"), "/uploads",
        "", "", "local", "", "", "", "", "", ""
    );
  }
}
