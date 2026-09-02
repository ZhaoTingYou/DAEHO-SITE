package com.daeho.customer.sms;

public class SmsDeliveryException extends RuntimeException {
  public SmsDeliveryException(String message) {
    super(message);
  }

  public SmsDeliveryException(String message, Throwable cause) {
    super(message, cause);
  }
}
