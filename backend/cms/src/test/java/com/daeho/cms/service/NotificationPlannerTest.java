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
  private NotificationPlanner planner;
  private List<Map<String, Object>> createdJobs;

  @BeforeEach
  void setUp() {
    repository = mock(NotificationRepository.class);
    createdJobs = new ArrayList<>();
    when(repository.getSettings(anyString())).thenReturn(Map.of(
        "internalEmail", "internal@example.com",
        "internalEmailEnabled", true,
        "customerEmailEnabled", true,
        "kakaoEnabled", true
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
        repository,
        new NotificationTemplateRenderer(new NotificationProperties(
            true, 1000, "https://daeho.works/admin", "", "", "", ""
        ))
    );
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
  void newInquiryOnlyQueuesTheInternalEmail() {
    planner.queueNewInquiry(inquiry("customer@example.com", "010-1234-5678"));
    assertEquals(1, createdJobs.size());
    assertEquals("internal", createdJobs.get(0).get("audience"));
    assertEquals("new_inquiry", createdJobs.get(0).get("eventType"));
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
