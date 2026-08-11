package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationInquiryStatusTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void acceptsCmsManagedStatusCodes() {
    var result = validation.inquiryStatus(Map.of(
        "status", "waiting_for_customer",
        "expectedStatus", "new"
    ));

    assertTrue(result.success());
  }

  @Test
  void rejectsUnsafeStatusCodes() {
    var result = validation.inquiryStatus(Map.of("status", "Waiting / Customer"));

    assertFalse(result.success());
  }

  @Test
  void acceptsACompleteStatusDefinition() {
    var result = validation.inquiryStatusDefinition(Map.of(
        "code", "waiting_for_customer",
        "labelKo", "고객 회신 대기",
        "labelEn", "Waiting for customer",
        "labelZh", "等待客户回复",
        "color", "purple",
        "sortOrder", 25,
        "isActive", true
    ), true);

    assertTrue(result.success());
  }

  @Test
  void requiresAKoreanLabelAndKnownColor() {
    var result = validation.inquiryStatusDefinition(Map.of(
        "code", "waiting_for_customer",
        "labelKo", "",
        "color", "neon"
    ), true);

    assertFalse(result.success());
  }

  @Test
  void requiresAValidConflictTokenWhenUpdatingAStatusDefinition() {
    var missingToken = validation.inquiryStatusDefinition(Map.of(
        "labelKo", "고객 회신 대기",
        "color", "purple"
    ), false);
    var invalidToken = validation.inquiryStatusDefinition(Map.of(
        "labelKo", "고객 회신 대기",
        "color", "purple",
        "expectedUpdatedAt", "yesterday"
    ), false);
    var validToken = validation.inquiryStatusDefinition(Map.of(
        "labelKo", "고객 회신 대기",
        "color", "purple",
        "expectedUpdatedAt", "2026-08-11T12:34:56.123456+09:00"
    ), false);

    assertFalse(missingToken.success());
    assertFalse(invalidToken.success());
    assertTrue(validToken.success());
  }
}
