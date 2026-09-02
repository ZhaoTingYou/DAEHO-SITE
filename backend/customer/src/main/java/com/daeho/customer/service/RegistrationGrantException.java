package com.daeho.customer.service;

public class RegistrationGrantException extends RuntimeException {
  private final String code;

  public RegistrationGrantException(String message) {
    this("invalid_registration_grant", message);
  }

  public RegistrationGrantException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String code() {
    return code;
  }
}
