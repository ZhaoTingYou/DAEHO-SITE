package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationContactEmailTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void requiresAValidEmailForContactInquiries() {
    var missing = validation.contactInquiry(Map.of(
        "name", "Tester",
        "contact", "010-1234-5678"
    ));
    assertFalse(missing.success());
    assertTrue(missing.issues().stream().anyMatch(issue -> "email".equals(issue.get("path"))));

    var invalid = validation.contactInquiry(Map.of(
        "name", "Tester",
        "contact", "010-1234-5678",
        "email", "invalid"
    ));
    assertFalse(invalid.success());
    assertTrue(invalid.issues().stream().anyMatch(issue ->
        "email".equals(issue.get("path")) && issue.get("message").contains("valid email")
    ));

    var valid = validation.contactInquiry(Map.of(
        "name", "Tester",
        "contact", "010-1234-5678",
        "email", "tester@example.com"
    ));
    assertTrue(valid.success());
  }
}
