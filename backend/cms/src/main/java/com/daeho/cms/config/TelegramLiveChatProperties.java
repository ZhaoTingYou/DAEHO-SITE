package com.daeho.cms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms.live-chat")
public record TelegramLiveChatProperties(String publicSiteUrl) {
  public String normalizedPublicSiteUrl() {
    var value = publicSiteUrl == null ? "" : publicSiteUrl.trim();
    while (value.endsWith("/")) {
      value = value.substring(0, value.length() - 1);
    }
    return value;
  }
}
