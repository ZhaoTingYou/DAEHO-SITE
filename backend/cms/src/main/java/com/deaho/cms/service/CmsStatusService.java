package com.deaho.cms.service;

import com.deaho.cms.config.CmsProperties;
import com.deaho.cms.repository.CmsRepository;
import java.nio.file.Files;
import java.time.Instant;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
public class CmsStatusService {
  private final CmsProperties properties;
  private final Environment environment;
  private final CmsRepository repository;

  public CmsStatusService(CmsProperties properties, Environment environment, CmsRepository repository) {
    this.properties = properties;
    this.environment = environment;
    this.repository = repository;
  }

  public Map<String, Object> status() {
    var uploadDir = properties.uploadDir().toAbsolutePath().normalize();
    var datasourceUrl = environment.getProperty("spring.datasource.url", "");
    return Map.of(
        "checkedAt", Instant.now().toString(),
        "database", Map.of(
            "url", datasourceUrl,
            "path", datasourceUrl,
            "engine", "postgresql"
        ),
        "environment", Map.of(
            "persistence", "configured",
            "javaVersion", System.getProperty("java.version"),
            "uploadDir", uploadDir.toString(),
            "uploadDirExists", Files.exists(uploadDir),
            "publicUploadBaseUrl", properties.normalizedUploadBaseUrl(),
            "mediaStorage", repository.mediaProviders()
        ),
        "security", Map.of(
            "hasAdminApiKey", properties.adminApiKey() != null && !properties.adminApiKey().isBlank()
        ),
        "email", Map.of(
            "configured", configured(properties.notifyTo()) && configured(properties.smtpFrom()) && configured(environment.getProperty("spring.mail.host")),
            "hasSmtpHost", configured(environment.getProperty("spring.mail.host")),
            "hasSender", configured(properties.smtpFrom()),
            "hasRecipient", configured(properties.notifyTo()),
            "hasSmtpAuth", configured(environment.getProperty("spring.mail.username")) && configured(environment.getProperty("spring.mail.password"))
        ),
        "latest", Map.of(
            "inquiryCreatedAt", repository.latestCreatedAt("cms_inquiries"),
            "emailEventCreatedAt", repository.latestCreatedAt("cms_email_events")
        ),
        "tables", repository.tableCounts()
    );
  }

  private boolean configured(String value) {
    return value != null && !value.isBlank();
  }
}
