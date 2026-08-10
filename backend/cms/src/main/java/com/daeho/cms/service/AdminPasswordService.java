package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminPasswordService {
  private static final String BOOTSTRAP_VERSION = "bootstrap";

  private final AdminPasswordStore store;
  private final CmsProperties properties;
  private final AdminPasswordHasher hasher;

  public AdminPasswordService(
      AdminPasswordStore store,
      CmsProperties properties,
      AdminPasswordHasher hasher
  ) {
    this.store = store;
    this.properties = properties;
    this.hasher = hasher;
  }

  public AdminPasswordStatus status() {
    return store.findPasswordRecord()
        .map(record -> new AdminPasswordStatus(true, record.updatedAt().toString()))
        .orElseGet(() -> new AdminPasswordStatus(false, BOOTSTRAP_VERSION));
  }

  public AdminPasswordVerification verify(String password) {
    var record = store.findPasswordRecord();
    if (record.isPresent()) {
      return new AdminPasswordVerification(
          hasher.verify(password, record.get().passwordHash()),
          true,
          record.get().updatedAt().toString()
      );
    }

    return new AdminPasswordVerification(
        constantTimeEquals(normalizePassword(password), bootstrapPassword()),
        false,
        BOOTSTRAP_VERSION
    );
  }

  public AdminPasswordStatus changePassword(String currentPassword, String newPassword) {
    if (!verify(currentPassword).valid()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect.");
    }

    hasher.validateReplacement(currentPassword, newPassword);
    store.savePasswordHash(hasher.hash(newPassword));
    return status();
  }

  private String bootstrapPassword() {
    return properties.adminPassword() == null ? "" : properties.adminPassword();
  }

  private String normalizePassword(String password) {
    return password == null ? "" : password.trim();
  }

  private boolean constantTimeEquals(String value, String expected) {
    if (value == null || expected == null) {
      return false;
    }
    var valueBytes = value.getBytes(StandardCharsets.UTF_8);
    var expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
    return valueBytes.length == expectedBytes.length && MessageDigest.isEqual(valueBytes, expectedBytes);
  }

  public record AdminPasswordStatus(boolean configured, String version) {
  }

  public record AdminPasswordVerification(boolean valid, boolean configured, String version) {
  }
}
