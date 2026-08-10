package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ValidationFailedException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AdminPasswordServiceTest {
  @Test
  void verifiesBootstrapPasswordBeforeStoredHashExists() {
    var service = serviceWithBootstrapPassword("Bootstrap-Passw0rd!");

    assertFalse(service.status().configured());
    assertTrue(service.verify("Bootstrap-Passw0rd!").valid());
    assertEquals("bootstrap", service.verify("Bootstrap-Passw0rd!").version());
    assertFalse(service.verify("wrong-password").valid());
  }

  @Test
  void changePasswordPersistsOnlyHashAndInvalidatesPreviousPassword() {
    var store = new MemoryAdminPasswordStore();
    var service = serviceWithStore(store, "Bootstrap-Passw0rd!");

    var changed = service.changePassword("Bootstrap-Passw0rd!", "N3w-Stronger-Pass!");

    assertTrue(changed.configured());
    assertTrue(store.record.isPresent());
    assertFalse(store.record.orElseThrow().passwordHash().contains("N3w-Stronger-Pass!"));
    assertFalse(service.verify("Bootstrap-Passw0rd!").valid());
    assertTrue(service.verify("N3w-Stronger-Pass!").valid());
    assertEquals(changed.version(), service.verify("N3w-Stronger-Pass!").version());
  }

  @Test
  void changePasswordRejectsWrongCurrentPassword() {
    var service = serviceWithBootstrapPassword("Bootstrap-Passw0rd!");

    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.changePassword("wrong-password", "N3w-Stronger-Pass!")
    );

    assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
  }

  @Test
  void changePasswordRejectsWeakNewPassword() {
    var store = new MemoryAdminPasswordStore();
    var service = serviceWithStore(store, "Bootstrap-Passw0rd!");

    var error = assertThrows(
        ValidationFailedException.class,
        () -> service.changePassword("Bootstrap-Passw0rd!", "short")
    );

    assertEquals("newPassword", error.issues().get(0).get("path"));
    assertFalse(store.record.isPresent());
  }

  @Test
  void changePasswordAcceptsMixedCaseDigitAndSymbolPassword() {
    var service = serviceWithBootstrapPassword("Bootstrap-Passw0rd!");

    service.changePassword("Bootstrap-Passw0rd!", "Codex-Test-Passw0rd!");

    assertTrue(service.verify("Codex-Test-Passw0rd!").valid());
  }

  private AdminPasswordService serviceWithBootstrapPassword(String bootstrapPassword) {
    return serviceWithStore(new MemoryAdminPasswordStore(), bootstrapPassword);
  }

  private AdminPasswordService serviceWithStore(MemoryAdminPasswordStore store, String bootstrapPassword) {
    return new AdminPasswordService(
        store,
        new CmsProperties("admin-key", "", "", false, Path.of("."), "/uploads", bootstrapPassword, "local", "", "", "", "", "", ""),
        new AdminPasswordHasher()
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
}
