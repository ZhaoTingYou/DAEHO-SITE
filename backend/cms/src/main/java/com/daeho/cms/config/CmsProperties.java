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
    String adminPassword,
    String ownerEmail,
    String storageProvider,
    String s3Bucket,
    String s3Region,
    String s3Endpoint,
    String s3PublicBaseUrl,
    String s3AccessKeyId,
    String s3SecretAccessKey
) {
  public String normalizedUploadBaseUrl() {
    if (publicUploadBaseUrl == null || publicUploadBaseUrl.isBlank()) {
      return "/uploads";
    }
    return publicUploadBaseUrl.endsWith("/")
        ? publicUploadBaseUrl.substring(0, publicUploadBaseUrl.length() - 1)
        : publicUploadBaseUrl;
  }

  public boolean usesS3Storage() {
    return "s3".equalsIgnoreCase(text(storageProvider));
  }

  public String normalizedS3PublicBaseUrl() {
    var configured = text(s3PublicBaseUrl);
    if (!configured.isBlank()) {
      return trimTrailingSlash(configured);
    }

    var bucket = text(s3Bucket);
    if (bucket.isBlank()) {
      return "";
    }

    return "https://" + bucket + ".s3." + normalizedS3Region() + ".amazonaws.com";
  }

  public String normalizedS3Region() {
    var region = text(s3Region);
    return region.isBlank() ? "ap-northeast-2" : region;
  }

  private String trimTrailingSlash(String value) {
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
