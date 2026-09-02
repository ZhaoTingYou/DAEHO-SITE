package com.daeho.cms.service;

import java.util.Locale;

public final class InquiryContactMatcher {
  private InquiryContactMatcher() {}

  public static boolean matches(String contact, String phone, String email, String supplied) {
    var value = clean(supplied);
    if (value.isBlank()) {
      return false;
    }
    if (value.contains("@")) {
      var normalizedEmail = value.toLowerCase(Locale.ROOT);
      return normalizedEmail.equals(clean(email).toLowerCase(Locale.ROOT));
    }
    var digits = normalizePhone(value);
    return !digits.isBlank() && (
        digits.equals(normalizePhone(contact))
            || digits.equals(normalizePhone(phone))
    );
  }

  private static String normalizePhone(String value) {
    var digits = clean(value).replaceAll("[^0-9]", "");
    if (digits.matches("010\\d{8}")) {
      return "82" + digits.substring(1);
    }
    return digits;
  }

  private static String clean(String value) {
    return value == null ? "" : value.trim();
  }
}
