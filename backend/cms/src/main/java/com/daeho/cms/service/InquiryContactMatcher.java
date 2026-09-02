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
    var digits = value.replaceAll("[^0-9]", "");
    return !digits.isBlank() && (
        digits.equals(clean(contact).replaceAll("[^0-9]", ""))
            || digits.equals(clean(phone).replaceAll("[^0-9]", ""))
    );
  }

  private static String clean(String value) {
    return value == null ? "" : value.trim();
  }
}
