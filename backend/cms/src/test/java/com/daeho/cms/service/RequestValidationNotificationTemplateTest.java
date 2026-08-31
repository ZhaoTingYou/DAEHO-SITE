package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationNotificationTemplateTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void kakaoTemplatesOnlyKeepTheApprovedProviderId() {
    var missing = validation.notificationTemplate(Map.of(
        "providerTemplateCode", "",
        "approvalStatus", "approved",
        "isActive", true
    ), "kakao");
    var complete = validation.notificationTemplate(Map.of(
        "subject", "SOLAPI에서 관리하는 제목",
        "body", "SOLAPI에서 관리하는 본문",
        "providerTemplateCode", "KA01TP000001",
        "kakaoTemplateType", "highlight",
        "approvalStatus", "approved",
        "isActive", true
    ), "kakao");

    assertFalse(missing.success());
    assertTrue(complete.success());
    assertTrue(validation.stringValue(complete.data().get("subject")).isBlank());
    assertTrue(validation.stringValue(complete.data().get("body")).isBlank());
    assertTrue("basic".equals(complete.data().get("kakaoTemplateType")));
  }

  @Test
  void emailTemplatesRequireBothSubjectAndBody() {
    var missingSubject = validation.notificationTemplate(Map.of(
        "subject", "",
        "body", "문의 {{inquiry_id}} 안내",
        "approvalStatus", "approved"
    ), "email");

    assertFalse(missingSubject.success());
  }

  @Test
  void telegramTemplatesRequireABodyButNoSubjectOrProviderCode() {
    var missingBody = validation.notificationTemplate(Map.of(
        "body", "",
        "approvalStatus", "approved",
        "isActive", true
    ), "telegram");
    var complete = validation.notificationTemplate(Map.of(
        "body", "새 문의: {{name}} / {{admin_url}}",
        "approvalStatus", "approved",
        "isActive", true
    ), "telegram");

    assertFalse(missingBody.success());
    assertTrue(complete.success());
  }
}
