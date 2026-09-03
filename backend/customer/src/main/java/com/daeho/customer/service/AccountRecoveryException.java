package com.daeho.customer.service;

public class AccountRecoveryException extends RuntimeException {
  private final String code;

  public AccountRecoveryException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String code() {
    return code;
  }
}
