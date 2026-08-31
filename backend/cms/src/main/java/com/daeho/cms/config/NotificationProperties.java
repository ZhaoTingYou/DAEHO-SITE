package com.daeho.cms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms.notifications")
public record NotificationProperties(
    boolean workerEnabled,
    long workerDelayMs,
    String adminBaseUrl,
    String solapiApiBaseUrl,
    String solapiApiKey,
    String solapiApiSecret,
    String solapiPfId,
    String telegramApiBaseUrl,
    String telegramEncryptionKey
) {
  public String normalizedAdminBaseUrl() {
    return trimTrailingSlash(text(adminBaseUrl));
  }

  public String normalizedSolapiApiBaseUrl() {
    var value = text(solapiApiBaseUrl);
    return trimTrailingSlash(value.isBlank() ? "https://api.solapi.com" : value);
  }

  public boolean kakaoConfigured() {
    return !text(solapiApiKey).isBlank()
        && !text(solapiApiSecret).isBlank()
        && !text(solapiPfId).isBlank();
  }

  public String normalizedTelegramApiBaseUrl() {
    var value = text(telegramApiBaseUrl);
    return trimTrailingSlash(value.isBlank() ? "https://api.telegram.org" : value);
  }

  private String trimTrailingSlash(String value) {
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
