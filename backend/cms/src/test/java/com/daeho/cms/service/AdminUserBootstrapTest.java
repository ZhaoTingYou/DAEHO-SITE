package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.CmsProperties;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AdminUserBootstrapTest {
  private final AdminPasswordHasher hasher = new AdminPasswordHasher();
  private final MemoryAdminUserStore users = new MemoryAdminUserStore();
  private final MemoryAdminPasswordStore legacyStore = new MemoryAdminPasswordStore();

  @Test
  void copiesLegacyHashIntoTheConfiguredOwner() {
    var legacyHash = hasher.hash("Current-Owner-Passw0rd!");
    legacyStore.savePasswordHash(legacyHash);

    bootstrap("  DAEHOVRIANO@GMAIL.COM  ", "different-bootstrap").ensureOwner();

    var owner = users.findByEmail("daehovriano@gmail.com").orElseThrow();
    assertEquals("OWNER", owner.role());
    assertEquals("active", owner.status());
    assertNull(owner.expiresAt());
    assertFalse(owner.mustChangePassword());
    assertEquals(legacyHash, owner.passwordHash());
  }

  @Test
  void hashesBootstrapPasswordWhenNoLegacyHashExists() {
    bootstrap("daehovriano@gmail.com", "Current-Owner-Passw0rd!").ensureOwner();

    var owner = users.findByEmail("daehovriano@gmail.com").orElseThrow();
    assertTrue(hasher.verify("Current-Owner-Passw0rd!", owner.passwordHash()));
    assertFalse(owner.passwordHash().contains("Current-Owner-Passw0rd!"));
  }

  @Test
  void doesNotCreateAnotherOwnerWhenOneAlreadyExists() {
    bootstrap("daehovriano@gmail.com", "Current-Owner-Passw0rd!").ensureOwner();
    var original = users.listUsers().get(0);

    bootstrap("another-owner@example.com", "Another-Owner-Passw0rd!").ensureOwner();

    assertEquals(1, users.listUsers().size());
    assertEquals(original, users.listUsers().get(0));
  }

  @Test
  void failsWhenAnOwnerCannotBeProvisionedSafely() {
    var missingEmail = bootstrap("  ", "Current-Owner-Passw0rd!");
    var missingPassword = bootstrap("daehovriano@gmail.com", "  ");

    assertThrows(IllegalStateException.class, missingEmail::ensureOwner);
    assertThrows(IllegalStateException.class, missingPassword::ensureOwner);
    assertTrue(users.listUsers().isEmpty());
  }

  private AdminUserBootstrap bootstrap(String ownerEmail, String bootstrapPassword) {
    return new AdminUserBootstrap(
        users,
        legacyStore,
        hasher,
        new CmsProperties(
            "admin-key", "", "", false, Path.of("."), "/uploads", bootstrapPassword,
            ownerEmail, "local", "", "", "", "", "", ""
        )
    );
  }

  private static class MemoryAdminPasswordStore implements AdminPasswordStore {
    private Optional<AdminPasswordRecord> record = Optional.empty();

    @Override
    public Optional<AdminPasswordRecord> findPasswordRecord() {
      return record;
    }

    @Override
    public void savePasswordHash(String passwordHash) {
      record = Optional.of(new AdminPasswordRecord(passwordHash, Instant.now()));
    }
  }

  private static class MemoryAdminUserStore implements AdminUserStore {
    private final List<AdminUserRecord> users = new ArrayList<>();

    @Override
    public Optional<AdminUserRecord> findByEmail(String email) {
      var normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
      return users.stream().filter(user -> user.email().equals(normalized)).findFirst();
    }

    @Override
    public Optional<AdminUserRecord> findById(String id) {
      return users.stream().filter(user -> user.id().equals(id)).findFirst();
    }

    @Override
    public List<AdminUserRecord> listUsers() {
      return List.copyOf(users);
    }

    @Override
    public long countOwners() {
      return users.stream().filter(user -> "OWNER".equals(user.role())).count();
    }

    @Override
    public long countActiveOwners() {
      return users.stream()
          .filter(user -> "OWNER".equals(user.role()) && "active".equals(user.status()))
          .count();
    }

    @Override
    public void create(AdminUserRecord user) {
      users.add(user);
    }

    @Override
    public void updateLastLogin(String id, Instant loggedInAt) {
      throw new UnsupportedOperationException();
    }

    @Override
    public void updatePassword(String id, String passwordHash, boolean mustChangePassword) {
      throw new UnsupportedOperationException();
    }

    @Override
    public void updateStatus(String id, String status) {
      throw new UnsupportedOperationException();
    }

    @Override
    public void updateExpiration(String id, Instant expiresAt) {
      throw new UnsupportedOperationException();
    }
  }
}
