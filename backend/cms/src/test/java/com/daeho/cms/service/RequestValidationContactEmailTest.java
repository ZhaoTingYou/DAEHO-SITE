package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestValidationContactEmailTest {
  private final RequestValidation validation = new RequestValidation();

  @Test
  void requiresElevenDomesticDigitsWhenAnInquiryPhoneIsProvided() {
    assertTrue(validation.contactInquiry(Map.of(
        "name", "Tester",
        "phone", "01012341234"
    )).success());

    for (var phone : new String[] {
        "010-1234-1234",
        "+821012341234",
        "01112341234",
        "0101234123",
        "010123412345"
    }) {
      var invalid = validation.contactInquiry(Map.of(
          "name", "Tester",
          "phone", phone
      ));
      assertFalse(invalid.success(), phone);
      assertTrue(invalid.issues().stream().anyMatch(issue -> "phone".equals(issue.get("path"))));
    }
  }

  @Test
  void acceptsEitherEmailOrPhoneAndValidatesProvidedEmail() {
    var phoneOnly = validation.contactInquiry(Map.of(
        "name", "Tester",
        "phone", "01012345678"
    ));
    assertTrue(phoneOnly.success());

    var invalid = validation.contactInquiry(Map.of(
        "name", "Tester",
        "email", "invalid"
    ));
    assertFalse(invalid.success());
    assertTrue(invalid.issues().stream().anyMatch(issue ->
        "email".equals(issue.get("path")) && issue.get("message").contains("valid email")
    ));

    var valid = validation.contactInquiry(Map.of(
        "name", "Tester",
        "email", "tester@example.com"
    ));
    assertTrue(valid.success());

    var missing = validation.contactInquiry(Map.of("name", "Tester"));
    assertFalse(missing.success());
    assertTrue(missing.issues().stream().anyMatch(issue -> "contact".equals(issue.get("path"))));
  }

  @Test
  void keepsLegacyContactAsTheCanonicalPhone() {
    var valid = validation.golfInquiry(Map.of(
        "name", "Tester",
        "contact", "01098765432"
    ));
    assertTrue(valid.success());
    assertTrue("01098765432".equals(valid.data().get("phone")));
  }
}
