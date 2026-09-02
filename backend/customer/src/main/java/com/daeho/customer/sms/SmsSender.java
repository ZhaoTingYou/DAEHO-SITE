package com.daeho.customer.sms;

public interface SmsSender {
  SmsSendReceipt send(String to, String text);

  boolean isConfigured();
}
