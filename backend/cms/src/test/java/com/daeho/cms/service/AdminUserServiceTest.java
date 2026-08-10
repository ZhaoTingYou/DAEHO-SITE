package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.error.ValidationFailedException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AdminUserServiceTest {
  private static final Instant NOW = Instant.parse("2026-08-10T02:00:00Z");
  private static final String OWNER_ID = "owner-1";
  private static final String EDITOR_ID = "editor-1";

  private final MemoryAdminUserStore users = new MemoryAdminUserStore();
  private final CountingPasswordHasher hasher = new CountingPasswordHasher();
  private AdminUserService service;

  @BeforeEach
  void setUp() {
    users.create(user(
        OWNER_ID,
        "owner@example.com",
        "OWNER",
        "active",
        null,
        false,
        1L,
        "Owner-Passw0rd!"
    ));
    service = new AdminUserService(users, hasher);
  }

  @Test
  void authenticatesNormalizedEmailAndRecordsLastLogin() {
    var identity = service.authenticate("  OWNER@EXAMPLE.COM ", "Owner-Passw0rd!", NOW);

    assertEquals(OWNER_ID, identity.id());
    assertEquals("owner@example.com", identity.email());
    assertEquals("OWNER", identity.role());
    assertEquals(NOW, users.findById(OWNER_ID).orElseThrow().lastLoginAt());
    assertEquals(1, hasher.verifyCalls);
  }

  @Test
  void hidesUnknownDisabledExpiredAndWrongPasswordReasons() {
    users.create(user(
        "disabled-1", "disabled@example.com", "EDITOR", "disabled",
        NOW.plus(1, ChronoUnit.DAYS), true, 1L, "Editor-Passw0rd!"
    ));
    users.create(user(
        "expired-1", "expired@example.com", "EDITOR", "active",
        NOW, true, 1L, "Editor-Passw0rd!"
    ));

    assertGenericLoginFailure("missing@example.com", "Editor-Passw0rd!");
    assertGenericLoginFailure("disabled@example.com", "Editor-Passw0rd!");
    assertGenericLoginFailure("expired@example.com", "Editor-Passw0rd!");
    assertGenericLoginFailure("owner@example.com", "Wrong-Passw0rd!");
  }

  @Test
  void unknownEmailStillPerformsOneValidHashComparison() {
    var before = hasher.verifyCalls;

    assertGenericLoginFailure("unknown@example.com", "Any-Passw0rd!");

    assertEquals(before + 1, hasher.verifyCalls);
    assertTrue(hasher.lastStoredHash.startsWith("pbkdf2_sha256$310000$"));
  }

  @Test
  void validatesOnlyCurrentLiveSessionVersions() {
    var valid = service.validateSession(OWNER_ID, 1L, NOW);

    assertEquals(OWNER_ID, valid.id());
    assertUnauthorized(() -> service.validateSession(OWNER_ID, 0L, NOW));
    assertUnauthorized(() -> service.validateSession("missing", 1L, NOW));

    users.create(user(
        EDITOR_ID, "editor@example.com", "EDITOR", "active",
        NOW, true, 1L, "Editor-Passw0rd!"
    ));
    assertUnauthorized(() -> service.validateSession(EDITOR_ID, 1L, NOW));
  }

  @Test
  void changingOwnPasswordClearsFirstLoginFlagAndInvalidatesTheOldSessionVersion() {
    users.create(user(
        EDITOR_ID, "editor@example.com", "EDITOR", "active",
        NOW.plus(30, ChronoUnit.DAYS), true, 4L, "Editor-Passw0rd!"
    ));

    var changed = service.changeOwnPassword(
        EDITOR_ID,
        4L,
        "Editor-Passw0rd!",
        "N3w-Editor-Passw0rd!",
        NOW
    );

    assertEquals(5L, changed.sessionVersion());
    assertFalse(changed.mustChangePassword());
    assertTrue(hasher.verify(
        "N3w-Editor-Passw0rd!",
        users.findById(EDITOR_ID).orElseThrow().passwordHash()
    ));
    assertUnauthorized(() -> service.validateSession(EDITOR_ID, 4L, NOW));
  }

  @Test
  void ownerCreatesThirtyDayEditorThatMustChangePassword() {
    var created = service.createEditor(
        OWNER_ID,
        1L,
        " LOCALOCA.MASTER@GMAIL.COM ",
        "Temp-Editor-Passw0rd!",
        NOW
    );

    assertEquals("localoca.master@gmail.com", created.email());
    assertEquals("EDITOR", created.role());
    assertEquals(NOW.plus(30, ChronoUnit.DAYS), created.expiresAt());
    assertTrue(created.mustChangePassword());
    assertFalse(users.findById(created.id()).orElseThrow().passwordHash().contains("Temp-Editor-Passw0rd!"));
  }

  @Test
  void rejectsDuplicateEmailsAndMapsInsertRacesToTheSameEmailIssue() {
    service.createEditor(OWNER_ID, 1L, "editor@example.com", "Temp-Editor-Passw0rd!", NOW);

    var duplicate = assertThrows(
        ValidationFailedException.class,
        () -> service.createEditor(
            OWNER_ID, 1L, " EDITOR@EXAMPLE.COM ", "Other-Editor-Passw0rd!", NOW
        )
    );
    assertEquals("email", duplicate.issues().get(0).get("path"));

    users.failNextCreate = true;
    var raced = assertThrows(
        ValidationFailedException.class,
        () -> service.createEditor(
            OWNER_ID, 1L, "race@example.com", "Other-Editor-Passw0rd!", NOW
        )
    );
    assertEquals(duplicate.issues(), raced.issues());
  }

  @Test
  void editorActorsCannotAdministerUsers() {
    users.create(user(
        EDITOR_ID, "editor@example.com", "EDITOR", "active",
        NOW.plus(30, ChronoUnit.DAYS), false, 1L, "Editor-Passw0rd!"
    ));

    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.listUsers(EDITOR_ID, 1L, NOW)
    );

    assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
  }

  @Test
  void ownerResetsDisablesEnablesAndExtendsAnEditorWithLiveSessionInvalidation() {
    var editor = service.createEditor(
        OWNER_ID, 1L, "editor@example.com", "Temp-Editor-Passw0rd!", NOW
    );

    var reset = service.resetEditorPassword(
        OWNER_ID, 1L, editor.id(), "Reset-Editor-Passw0rd!", NOW
    );
    assertEquals(2L, reset.sessionVersion());
    assertTrue(reset.mustChangePassword());
    assertTrue(hasher.verify(
        "Reset-Editor-Passw0rd!",
        users.findById(editor.id()).orElseThrow().passwordHash()
    ));

    var disabled = service.setEditorStatus(OWNER_ID, 1L, editor.id(), "disabled", NOW);
    assertEquals("disabled", disabled.status());
    assertEquals(3L, disabled.sessionVersion());

    var enabled = service.setEditorStatus(OWNER_ID, 1L, editor.id(), "active", NOW);
    assertEquals("active", enabled.status());
    assertEquals(4L, enabled.sessionVersion());

    var extendedUntil = NOW.plus(60, ChronoUnit.DAYS);
    var extended = service.setEditorExpiration(
        OWNER_ID, 1L, editor.id(), extendedUntil, NOW
    );
    assertEquals(extendedUntil, extended.expiresAt());
    assertEquals(5L, extended.sessionVersion());
  }

  @Test
  void rejectsInvalidLifecycleInputsAndOwnerTargets() {
    var editor = service.createEditor(
        OWNER_ID, 1L, "editor@example.com", "Temp-Editor-Passw0rd!", NOW
    );

    assertThrows(
        ValidationFailedException.class,
        () -> service.setEditorStatus(OWNER_ID, 1L, editor.id(), "deleted", NOW)
    );
    assertThrows(
        ValidationFailedException.class,
        () -> service.setEditorExpiration(OWNER_ID, 1L, editor.id(), NOW, NOW)
    );
    assertThrows(
        ResponseStatusException.class,
        () -> service.resetEditorPassword(
            OWNER_ID, 1L, OWNER_ID, "Reset-Owner-Passw0rd!", NOW
        )
    );
    assertThrows(
        ResponseStatusException.class,
        () -> service.setEditorStatus(OWNER_ID, 1L, OWNER_ID, "disabled", NOW)
    );
    assertEquals(1L, users.countActiveOwners());
  }

  @Test
  void ownerListsPasswordFreeUserSummaries() {
    service.createEditor(OWNER_ID, 1L, "editor@example.com", "Temp-Editor-Passw0rd!", NOW);

    var listed = service.listUsers(OWNER_ID, 1L, NOW);

    assertEquals(2, listed.size());
    assertEquals("owner@example.com", listed.get(0).email());
    assertEquals("EDITOR", listed.get(1).role());
  }

  private void assertGenericLoginFailure(String email, String password) {
    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.authenticate(email, password, NOW)
    );
    assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
    assertEquals("Invalid email or password.", error.getReason());
  }

  private void assertUnauthorized(Runnable action) {
    var error = assertThrows(ResponseStatusException.class, action::run);
    assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
  }

  private AdminUserRecord user(
      String id,
      String email,
      String role,
      String status,
      Instant expiresAt,
      boolean mustChangePassword,
      long sessionVersion,
      String password
  ) {
    return new AdminUserRecord(
        id,
        email,
        hasher.hash(password),
        role,
        status,
        expiresAt,
        mustChangePassword,
        sessionVersion,
        null,
        NOW.minus(1, ChronoUnit.DAYS),
        NOW.minus(1, ChronoUnit.DAYS)
    );
  }

  private static class CountingPasswordHasher extends AdminPasswordHasher {
    private int verifyCalls;
    private String lastStoredHash = "";

    @Override
    public boolean verify(String password, String storedHash) {
      verifyCalls += 1;
      lastStoredHash = storedHash;
      return super.verify(password, storedHash);
    }
  }

  private static class MemoryAdminUserStore implements AdminUserStore {
    private final List<AdminUserRecord> records = new ArrayList<>();
    private boolean failNextCreate;

    @Override
    public Optional<AdminUserRecord> findByEmail(String email) {
      var normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
      return records.stream().filter(user -> user.email().equals(normalized)).findFirst();
    }

    @Override
    public Optional<AdminUserRecord> findById(String id) {
      return records.stream().filter(user -> user.id().equals(id)).findFirst();
    }

    @Override
    public List<AdminUserRecord> listUsers() {
      return List.copyOf(records);
    }

    @Override
    public long countOwners() {
      return records.stream().filter(user -> "OWNER".equals(user.role())).count();
    }

    @Override
    public long countActiveOwners() {
      return records.stream()
          .filter(user -> "OWNER".equals(user.role()) && "active".equals(user.status()))
          .count();
    }

    @Override
    public void create(AdminUserRecord user) {
      if (failNextCreate) {
        failNextCreate = false;
        throw new DuplicateKeyException("simulated normalized email race");
      }
      records.add(user);
    }

    @Override
    public void updateLastLogin(String id, Instant loggedInAt) {
      replace(id, user -> copy(
          user,
          user.passwordHash(),
          user.status(),
          user.expiresAt(),
          user.mustChangePassword(),
          user.sessionVersion(),
          loggedInAt
      ));
    }

    @Override
    public void updatePassword(String id, String passwordHash, boolean mustChangePassword) {
      replace(id, user -> copy(
          user,
          passwordHash,
          user.status(),
          user.expiresAt(),
          mustChangePassword,
          user.sessionVersion() + 1,
          user.lastLoginAt()
      ));
    }

    @Override
    public void updateStatus(String id, String status) {
      replace(id, user -> copy(
          user,
          user.passwordHash(),
          status,
          user.expiresAt(),
          user.mustChangePassword(),
          user.sessionVersion() + 1,
          user.lastLoginAt()
      ));
    }

    @Override
    public void updateExpiration(String id, Instant expiresAt) {
      replace(id, user -> copy(
          user,
          user.passwordHash(),
          user.status(),
          expiresAt,
          user.mustChangePassword(),
          user.sessionVersion() + 1,
          user.lastLoginAt()
      ));
    }

    private void replace(String id, java.util.function.Function<AdminUserRecord, AdminUserRecord> update) {
      for (var index = 0; index < records.size(); index += 1) {
        if (records.get(index).id().equals(id)) {
          records.set(index, update.apply(records.get(index)));
          return;
        }
      }
    }

    private AdminUserRecord copy(
        AdminUserRecord user,
        String passwordHash,
        String status,
        Instant expiresAt,
        boolean mustChangePassword,
        long sessionVersion,
        Instant lastLoginAt
    ) {
      return new AdminUserRecord(
          user.id(), user.email(), passwordHash, user.role(), status, expiresAt,
          mustChangePassword, sessionVersion, lastLoginAt, user.createdAt(), NOW
      );
    }
  }
}
