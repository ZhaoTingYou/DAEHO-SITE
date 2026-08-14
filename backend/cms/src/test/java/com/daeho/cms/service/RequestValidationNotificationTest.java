package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationNotificationTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void kakaoTestRequiresTheTwoApprovedTemplateVariables() {
    var missingVariables = validation.notificationTest(Map.of(
        "channel", "kakao",
        "recipient", "01012345678",
        "templateKey", "customer_done_kakao_ko"
    ));
    var complete = validation.notificationTest(Map.of(
        "channel", "kakao",
        "recipient", "01012345678",
        "templateKey", "customer_done_kakao_ko",
        "customerName", "홍길동",
        "inquiryNumber", "INQ-001"
    ));

    assertFalse(missingVariables.success());
    assertTrue(missingVariables.issues().stream().anyMatch(issue -> "customerName".equals(issue.get("path"))));
    assertTrue(missingVariables.issues().stream().anyMatch(issue -> "inquiryNumber".equals(issue.get("path"))));
    assertTrue(complete.success());
  }
}
