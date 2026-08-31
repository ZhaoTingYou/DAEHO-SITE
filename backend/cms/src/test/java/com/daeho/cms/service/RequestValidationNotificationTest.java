package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
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

  @Test
  void telegramTestUsesTheServerConfiguredGroupWithoutARecipientInput() {
    var result = validation.notificationTest(Map.of(
        "channel", "telegram",
        "recipient", "",
        "templateKey", "internal_new_telegram_ko",
        "customerName", "",
        "inquiryNumber", ""
    ));

    assertTrue(result.success());
  }

  @Test
  void telegramNotificationSettingDefaultsToDisabled() {
    var result = validation.notificationSettings(Map.of(
        "internalEmail", "",
        "internalEmailEnabled", false,
        "customerEmailEnabled", false,
        "kakaoEnabled", false
    ));

    assertTrue(result.success());
    assertTrue(Boolean.FALSE.equals(result.data().get("telegramEnabled")));
  }

  @Test
  void telegramCredentialsCanBeEnteredInCmsWithoutRequiringTheSavedTokenToBeReturned() {
    var result = validation.notificationSettings(Map.of(
        "internalEmail", "",
        "internalEmailEnabled", false,
        "customerEmailEnabled", false,
        "kakaoEnabled", false,
        "telegramEnabled", true,
        "telegramBotToken", "123456:abc_DEF-ghi",
        "telegramChatId", "-1001234567890",
        "telegramMessageThreadId", "402",
        "clearTelegramBotToken", false
    ));

    assertTrue(result.success());
    assertEquals("123456:abc_DEF-ghi", result.data().get("telegramBotToken"));
    assertEquals("-1001234567890", result.data().get("telegramChatId"));
    assertEquals("402", result.data().get("telegramMessageThreadId"));
    assertEquals(false, result.data().get("clearTelegramBotToken"));
  }

  @Test
  void telegramChatIdIsRequiredWhenTelegramNotificationsAreEnabled() {
    var result = validation.notificationSettings(Map.of(
        "internalEmail", "",
        "internalEmailEnabled", false,
        "customerEmailEnabled", false,
        "kakaoEnabled", false,
        "telegramEnabled", true,
        "telegramBotToken", "123456:abc_DEF-ghi",
        "telegramChatId", "",
        "clearTelegramBotToken", false
    ));

    assertFalse(result.success());
    assertTrue(result.issues().stream().anyMatch(issue -> "telegramChatId".equals(issue.get("path"))));
  }

  @Test
  void telegramTopicIdMustBeBlankOrAPositiveInteger() {
    var result = validation.notificationSettings(Map.of(
        "internalEmail", "",
        "internalEmailEnabled", false,
        "customerEmailEnabled", false,
        "kakaoEnabled", false,
        "telegramEnabled", false,
        "telegramBotToken", "",
        "telegramChatId", "-1001234567890",
        "telegramMessageThreadId", "문의",
        "clearTelegramBotToken", false
    ));

    assertFalse(result.success());
    assertTrue(result.issues().stream().anyMatch(
        issue -> "telegramMessageThreadId".equals(issue.get("path"))
    ));
  }
}
