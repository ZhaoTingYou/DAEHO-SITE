package com.daeho.cms.controller;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.AdminUserService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class AdminUsersController {
  private final AdminAuth auth;
  private final AdminUserService users;

  public AdminUsersController(AdminAuth auth, AdminUserService users) {
    this.auth = auth;
    this.users = users;
  }

  @PostMapping("/auth/login")
  public Map<String, Object> login(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var user = users.authenticate(
        requiredString(body, "email"),
        requiredString(body, "password"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  @PostMapping("/auth/session")
  public Map<String, Object> session(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var user = users.validateSession(
        requiredString(body, "userId"),
        requiredLong(body, "sessionVersion"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  @PostMapping("/auth/change-own-password")
  public Map<String, Object> changeOwnPassword(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var actor = actor(request);
    var user = users.changeOwnPassword(
        actor.id(),
        actor.sessionVersion(),
        requiredString(body, "currentPassword"),
        requiredString(body, "newPassword"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  @GetMapping("/users")
  public Map<String, Object> listUsers(HttpServletRequest request) {
    auth.requireAdmin(request);
    var actor = actor(request);
    return Map.of("items", users.listUsers(actor.id(), actor.sessionVersion(), Instant.now()));
  }

  @PostMapping("/users/editors")
  public ResponseEntity<Map<String, Object>> createEditor(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var actor = actor(request);
    var user = users.createEditor(
        actor.id(),
        actor.sessionVersion(),
        requiredString(body, "email"),
        requiredString(body, "temporaryPassword"),
        Instant.now()
    );
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("user", user));
  }

  @PostMapping("/users/{id}/reset-password")
  public Map<String, Object> resetEditorPassword(
      @PathVariable String id,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var actor = actor(request);
    var user = users.resetEditorPassword(
        actor.id(),
        actor.sessionVersion(),
        id,
        requiredString(body, "temporaryPassword"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  @PatchMapping("/users/{id}/status")
  public Map<String, Object> setEditorStatus(
      @PathVariable String id,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var actor = actor(request);
    var user = users.setEditorStatus(
        actor.id(),
        actor.sessionVersion(),
        id,
        requiredString(body, "status"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  @PatchMapping("/users/{id}/expiration")
  public Map<String, Object> setEditorExpiration(
      @PathVariable String id,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var actor = actor(request);
    var user = users.setEditorExpiration(
        actor.id(),
        actor.sessionVersion(),
        id,
        requiredInstant(body, "expiresAt"),
        Instant.now()
    );
    return Map.of("user", user);
  }

  private Actor actor(HttpServletRequest request) {
    var id = request.getHeader("x-admin-user-id");
    var rawVersion = request.getHeader("x-admin-session-version");
    if (id == null || id.isBlank() || rawVersion == null || rawVersion.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing CMS actor headers.");
    }
    try {
      return new Actor(id, Long.parseLong(rawVersion));
    } catch (NumberFormatException error) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid CMS actor headers.");
    }
  }

  private String requiredString(Map<String, Object> body, String key) {
    var value = body.get(key);
    if (!(value instanceof String text) || text.isBlank()) {
      throw validation(key, "This field is required.");
    }
    return text;
  }

  private long requiredLong(Map<String, Object> body, String key) {
    var value = body.get(key);
    if (value instanceof Number number) {
      return number.longValue();
    }
    if (value instanceof String text) {
      try {
        return Long.parseLong(text);
      } catch (NumberFormatException ignored) {
        // Handled by the shared structured validation response below.
      }
    }
    throw validation(key, "Expected an integer.");
  }

  private Instant requiredInstant(Map<String, Object> body, String key) {
    var value = requiredString(body, key);
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException error) {
      throw validation(key, "Expected an ISO-8601 timestamp.");
    }
  }

  private ValidationFailedException validation(String path, String message) {
    return new ValidationFailedException(List.of(Map.of("path", path, "message", message)));
  }

  private record Actor(String id, long sessionVersion) {
  }
}
