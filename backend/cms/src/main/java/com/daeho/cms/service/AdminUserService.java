package com.daeho.cms.service;

import com.daeho.cms.error.ValidationFailedException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminUserService {
  private static final String DUMMY_PASSWORD_HASH =
      "pbkdf2_sha256$310000$AAAAAAAAAAAAAAAAAAAAAA$EWplXM_3XQLE0ZjxAgIs0YlmsyuzsQTYIlj6hULyuMQ";
  private static final Pattern EMAIL_PATTERN = Pattern.compile(
      "^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$"
  );

  private final AdminUserStore users;
  private final AdminPasswordHasher hasher;

  public AdminUserService(AdminUserStore users, AdminPasswordHasher hasher) {
    this.users = users;
    this.hasher = hasher;
  }

  public AdminIdentity authenticate(String email, String password, Instant now) {
    var user = users.findByEmail(normalizeEmail(email));
    var passwordHash = user.map(AdminUserRecord::passwordHash).orElse(DUMMY_PASSWORD_HASH);
    var passwordValid = hasher.verify(password, passwordHash);
    var record = user.orElse(null);

    if (!passwordValid || !isLive(record, now)) {
      throw invalidLogin();
    }

    users.updateLastLogin(record.id(), now);
    return identity(record);
  }

  public AdminIdentity validateSession(String userId, long sessionVersion, Instant now) {
    var user = users.findById(userId).orElse(null);
    if (!isLive(user, now) || user.sessionVersion() != sessionVersion) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "CMS session is no longer valid.");
    }
    return identity(user);
  }

  public AdminIdentity changeOwnPassword(
      String userId,
      long sessionVersion,
      String currentPassword,
      String newPassword,
      Instant now
  ) {
    var currentIdentity = validateSession(userId, sessionVersion, now);
    var user = users.findById(currentIdentity.id()).orElseThrow(this::invalidSession);
    if (!hasher.verify(currentPassword, user.passwordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect.");
    }

    hasher.validateReplacement(currentPassword, newPassword);
    users.updatePassword(user.id(), hasher.hash(newPassword), false);
    return validateSession(user.id(), user.sessionVersion() + 1, now);
  }

  public List<AdminUserSummary> listUsers(String actorId, long actorVersion, Instant now) {
    requireOwner(actorId, actorVersion, now);
    return users.listUsers().stream().map(this::summary).toList();
  }

  public AdminUserSummary createEditor(
      String actorId,
      long actorVersion,
      String email,
      String temporaryPassword,
      Instant now
  ) {
    requireOwner(actorId, actorVersion, now);
    var normalizedEmail = normalizeEmail(email);
    validateEmail(normalizedEmail);
    hasher.validateReplacement("", temporaryPassword);
    if (users.findByEmail(normalizedEmail).isPresent()) {
      throw duplicateEmail();
    }

    var user = new AdminUserRecord(
        UUID.randomUUID().toString(),
        normalizedEmail,
        hasher.hash(temporaryPassword),
        "EDITOR",
        "active",
        now.plus(30, ChronoUnit.DAYS),
        true,
        1L,
        null,
        now,
        now
    );
    try {
      users.create(user);
    } catch (DuplicateKeyException error) {
      throw duplicateEmail();
    }
    return summary(user);
  }

  public AdminUserSummary resetEditorPassword(
      String actorId,
      long actorVersion,
      String targetId,
      String temporaryPassword,
      Instant now
  ) {
    requireOwner(actorId, actorVersion, now);
    var target = requireEditor(targetId);
    hasher.validateReplacement("", temporaryPassword);
    users.updatePassword(target.id(), hasher.hash(temporaryPassword), true);
    return reloadedSummary(target.id());
  }

  public AdminUserSummary setEditorStatus(
      String actorId,
      long actorVersion,
      String targetId,
      String status,
      Instant now
  ) {
    requireOwner(actorId, actorVersion, now);
    if (!"active".equals(status) && !"disabled".equals(status)) {
      throw validation("status", "Use active or disabled.");
    }
    var target = users.findById(targetId).orElseThrow(this::userNotFound);
    if ("OWNER".equals(target.role()) && "disabled".equals(status)
        && "active".equals(target.status()) && users.countActiveOwners() <= 1) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The last active owner cannot be disabled.");
    }
    requireEditor(target);
    users.updateStatus(target.id(), status);
    return reloadedSummary(target.id());
  }

  public AdminUserSummary setEditorExpiration(
      String actorId,
      long actorVersion,
      String targetId,
      Instant expiresAt,
      Instant now
  ) {
    requireOwner(actorId, actorVersion, now);
    if (expiresAt == null || !expiresAt.isAfter(now)) {
      throw validation("expiresAt", "Expiration must be in the future.");
    }
    var target = requireEditor(targetId);
    users.updateExpiration(target.id(), expiresAt);
    return reloadedSummary(target.id());
  }

  private AdminIdentity identity(AdminUserRecord user) {
    return new AdminIdentity(
        user.id(),
        user.email(),
        user.role(),
        user.sessionVersion(),
        user.expiresAt(),
        user.mustChangePassword()
    );
  }

  private AdminUserSummary summary(AdminUserRecord user) {
    return new AdminUserSummary(
        user.id(),
        user.email(),
        user.role(),
        user.status(),
        user.expiresAt(),
        user.mustChangePassword(),
        user.sessionVersion(),
        user.lastLoginAt(),
        user.createdAt(),
        user.updatedAt()
    );
  }

  private AdminIdentity requireOwner(String actorId, long actorVersion, Instant now) {
    var actor = validateSession(actorId, actorVersion, now);
    if (!"OWNER".equals(actor.role())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner access is required.");
    }
    return actor;
  }

  private AdminUserRecord requireEditor(String id) {
    return requireEditor(users.findById(id).orElseThrow(this::userNotFound));
  }

  private AdminUserRecord requireEditor(AdminUserRecord user) {
    if (!"EDITOR".equals(user.role())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only editor accounts can be managed here.");
    }
    return user;
  }

  private AdminUserSummary reloadedSummary(String id) {
    return summary(users.findById(id).orElseThrow(this::userNotFound));
  }

  private void validateEmail(String email) {
    if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
      throw validation("email", "Enter a valid email address.");
    }
  }

  private boolean isLive(AdminUserRecord user, Instant now) {
    return user != null
        && "active".equals(user.status())
        && (user.expiresAt() == null || user.expiresAt().isAfter(now));
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

  private ResponseStatusException invalidLogin() {
    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  private ResponseStatusException invalidSession() {
    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "CMS session is no longer valid.");
  }

  private ResponseStatusException userNotFound() {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "CMS user was not found.");
  }

  private ValidationFailedException duplicateEmail() {
    return validation("email", "An account with this email already exists.");
  }

  private ValidationFailedException validation(String path, String message) {
    return new ValidationFailedException(List.of(Map.of("path", path, "message", message)));
  }
}
