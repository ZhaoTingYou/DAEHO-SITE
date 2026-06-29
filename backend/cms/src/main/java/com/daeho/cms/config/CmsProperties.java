package com.daeho.cms.config;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms")
public record CmsProperties(
    String adminApiKey,
    String notifyTo,
    String smtpFrom,
    boolean smtpSecure,
    Path uploadDir,
    String publicUploadBaseUrl,
    String adminPassword
) {
  public String normalizedUploadBaseUrl() {
    if (publicUploadBaseUrl == null || publicUploadBaseUrl.isBlank()) {
      return "/uploads";
    }
    return publicUploadBaseUrl.endsWith("/")
        ? publicUploadBaseUrl.substring(0, publicUploadBaseUrl.length() - 1)
        : publicUploadBaseUrl;
  }
}
