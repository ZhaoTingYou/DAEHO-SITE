package com.daeho.cms.service;

public class TelegramLiveChatException extends RuntimeException {
  private final boolean deliveryUncertain;
  private final boolean recoveryPersisted;

  public TelegramLiveChatException(String message) {
    super(message);
    this.deliveryUncertain = false;
    this.recoveryPersisted = false;
  }

  public TelegramLiveChatException(String message, Throwable cause) {
    super(message, cause);
    this.deliveryUncertain = false;
    this.recoveryPersisted = false;
  }

  public TelegramLiveChatException(String message, boolean deliveryUncertain) {
    super(message);
    this.deliveryUncertain = deliveryUncertain;
    this.recoveryPersisted = false;
  }

  public TelegramLiveChatException(String message, Throwable cause, boolean deliveryUncertain) {
    super(message, cause);
    this.deliveryUncertain = deliveryUncertain;
    this.recoveryPersisted = false;
  }

  public TelegramLiveChatException(
      String message,
      Throwable cause,
      boolean deliveryUncertain,
      boolean recoveryPersisted
  ) {
    super(message, cause);
    this.deliveryUncertain = deliveryUncertain;
    this.recoveryPersisted = recoveryPersisted;
  }

  public boolean deliveryUncertain() {
    return deliveryUncertain;
  }

  public boolean recoveryPersisted() {
    return recoveryPersisted;
  }
}
