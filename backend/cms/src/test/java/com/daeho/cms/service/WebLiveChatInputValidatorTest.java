package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.daeho.cms.error.ValidationFailedException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class WebLiveChatInputValidatorTest {
  private final WebLiveChatInputValidator validator = new WebLiveChatInputValidator();

  @Test
  void rejectsBotsAndOverlongOrPrematureSubmissions() {
    var error = assertThrows(ValidationFailedException.class, () -> validator.validateStart(Map.of(
        "locale", "ko", "name", "홍길동", "contact", "01012345678",
        "content", "반지 제작 상담", "consent", true,
        "consentVersion", "2026-09-01", "clientMessageKey", "k".repeat(20),
        "companyWebsite", "spam.example"
    ), Duration.ofMillis(200)));

    assertEquals(List.of("companyWebsite", "formStartedAt"), issuePaths(error));
  }

  @Test
  void acceptsNormalizedStartAndMessageInputsAtTheirBoundaries() {
    var start = validator.validateStart(Map.of(
        "locale", " en ", "name", "n".repeat(80), "contact", "c".repeat(120),
        "content", "x".repeat(2000), "consent", true,
        "consentVersion", " 2026-09-01 ", "clientMessageKey", "k".repeat(100),
        "companyWebsite", ""
    ), Duration.ofMillis(1200));
    var message = validator.validateMessage(Map.of("body", " y ", "clientMessageKey", "m".repeat(20)));

    assertEquals("en", start.locale());
    assertEquals(80, start.name().length());
    assertEquals(120, start.contact().length());
    assertEquals(2000, start.content().length());
    assertEquals("2026-09-01", start.consentVersion());
    assertEquals("y", message.body());
  }

  @Test
  void reportsStablePathsForInvalidStartAndMessageFields() {
    var startError = assertThrows(ValidationFailedException.class, () -> validator.validateStart(Map.of(
        "locale", "ja", "name", "x", "contact", "x", "content", "x",
        "consent", false, "consentVersion", "", "clientMessageKey", "short",
        "companyWebsite", ""
    ), Duration.ofHours(25)));
    var messageError = assertThrows(ValidationFailedException.class,
        () -> validator.validateMessage(Map.of("body", "", "clientMessageKey", "short")));

    assertEquals(List.of("locale", "name", "contact", "content", "consent", "consentVersion",
        "clientMessageKey", "formStartedAt"), issuePaths(startError));
    assertEquals(List.of("body", "clientMessageKey"), issuePaths(messageError));
  }

  private static List<String> issuePaths(ValidationFailedException error) {
    return error.issues().stream().map(issue -> issue.get("path")).toList();
  }
}
