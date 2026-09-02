package com.daeho.customer.service;

import java.util.Locale;

public final class LoginNamePolicy {
  private LoginNamePolicy() {}

  public static String normalize(String value) {
    var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    if (!normalized.matches("^[a-z][a-z0-9._-]{3,23}$")) {
      throw new RegistrationGrantException("A valid login name is required");
    }
    return normalized;
  }
}
