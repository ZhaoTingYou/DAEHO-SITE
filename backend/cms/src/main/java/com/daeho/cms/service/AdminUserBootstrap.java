package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

@Component
public class AdminUserBootstrap implements ApplicationRunner, Ordered {
  private final AdminUserStore users;
  private final AdminPasswordStore legacyPasswords;
  private final AdminPasswordHasher hasher;
  private final CmsProperties properties;

  public AdminUserBootstrap(
      AdminUserStore users,
      AdminPasswordStore legacyPasswords,
      AdminPasswordHasher hasher,
      CmsProperties properties
  ) {
    this.users = users;
    this.legacyPasswords = legacyPasswords;
    this.hasher = hasher;
    this.properties = properties;
  }

  @Override
  public void run(ApplicationArguments args) {
    ensureOwner();
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE + 1;
  }

  void ensureOwner() {
    if (users.countOwners() > 0) {
      return;
    }

    var email = normalizeEmail(properties.ownerEmail());
    if (email.isBlank()) {
      throw new IllegalStateException("CMS_OWNER_EMAIL is required to provision the CMS owner.");
    }

    var passwordHash = legacyPasswords.findPasswordRecord()
        .map(AdminPasswordRecord::passwordHash)
        .filter(value -> value != null && !value.isBlank())
        .orElseGet(this::hashBootstrapPassword);
    var now = Instant.now();
    users.create(new AdminUserRecord(
        UUID.randomUUID().toString(),
        email,
        passwordHash,
        "OWNER",
        "active",
        null,
        false,
        1L,
        null,
        now,
        now
    ));
  }

  private String hashBootstrapPassword() {
    var password = properties.adminPassword();
    if (password == null || password.trim().isEmpty()) {
      throw new IllegalStateException(
          "CMS_ADMIN_PASSWORD or the legacy CMS password hash is required to provision the CMS owner."
      );
    }
    return hasher.hash(password);
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }
}
