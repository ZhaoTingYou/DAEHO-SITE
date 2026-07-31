package com.daeho.cms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms.notifications")
public record NotificationProperties(
    boolean workerEnabled,
    long workerDelayMs,
    String adminBaseUrl,
    String kakaoApiBaseUrl,
    String kakaoAccessKey,
    String kakaoSecretKey,
    String kakaoServiceId,
    String kakaoChannelId
) {
  public String normalizedAdminBaseUrl() {
    return trimTrailingSlash(text(adminBaseUrl));
  }

  public String normalizedKakaoApiBaseUrl() {
    var value = text(kakaoApiBaseUrl);
    return trimTrailingSlash(value.isBlank() ? "https://sens.apigw.ntruss.com" : value);
  }

  public boolean kakaoConfigured() {
    return !text(kakaoAccessKey).isBlank()
        && !text(kakaoSecretKey).isBlank()
        && !text(kakaoServiceId).isBlank()
        && !text(kakaoChannelId).isBlank();
  }

  private String trimTrailingSlash(String value) {
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
