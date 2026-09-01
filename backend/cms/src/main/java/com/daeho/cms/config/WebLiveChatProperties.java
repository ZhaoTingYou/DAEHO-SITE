package com.daeho.cms.config;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms.web-live-chat")
public record WebLiveChatProperties(
    String sessionSecret,
    String cookieName,
    int historyDays,
    String allowedOrigins
) {
  public Set<String> normalizedOrigins() {
    return Arrays.stream((allowedOrigins == null ? "" : allowedOrigins).split(","))
        .map(String::trim)
        .filter(value -> !value.isBlank())
        .map(value -> URI.create(value).normalize())
        .peek(uri -> {
          if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null
              || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
              || (uri.getPath() != null && !uri.getPath().isBlank() && !uri.getPath().equals("/"))) {
            throw new IllegalArgumentException("CMS_LIVE_CHAT_ALLOWED_ORIGINS contains an invalid origin.");
          }
        })
        .map(uri -> uri.getScheme() + "://" + uri.getAuthority())
        .collect(Collectors.toUnmodifiableSet());
  }

  public String normalizedSessionSecret() {
    return sessionSecret == null ? "" : sessionSecret.trim();
  }
}
