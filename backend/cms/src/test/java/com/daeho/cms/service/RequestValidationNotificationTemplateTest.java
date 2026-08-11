package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationNotificationTemplateTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void highlightedKakaoTemplatesRequireTypeTitleBodyAndProviderId() {
    var missing = validation.notificationTemplate(Map.of(
        "subject", "",
        "body", "",
        "providerTemplateCode", "",
        "kakaoTemplateType", "highlight",
        "approvalStatus", "approved",
        "isActive", true
    ), "kakao");
    var complete = validation.notificationTemplate(Map.of(
        "subject", "{{name}}님의 문의 안내",
        "body", "문의 번호 {{inquiry_id}}의 상태는 {{status_label}}입니다.",
        "providerTemplateCode", "KA01TP000001",
        "kakaoTemplateType", "highlight",
        "approvalStatus", "approved",
        "isActive", true
    ), "kakao");

    assertFalse(missing.success());
    assertTrue(complete.success());
  }

  @Test
  void basicKakaoTemplatesRequireBodyAndProviderIdButRejectAHighlightTitle() {
    var titledBasic = validation.notificationTemplate(Map.of(
        "subject", "강조 제목",
        "body", "문의 {{inquiry_id}} 안내",
        "providerTemplateCode", "KA01TP000001",
        "kakaoTemplateType", "basic",
        "approvalStatus", "approved"
    ), "kakao");
    var completeBasic = validation.notificationTemplate(Map.of(
        "subject", "",
        "body", "문의 {{inquiry_id}} 안내",
        "providerTemplateCode", "KA01TP000001",
        "kakaoTemplateType", "basic",
        "approvalStatus", "approved"
    ), "kakao");

    assertFalse(titledBasic.success());
    assertTrue(completeBasic.success());
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
}
