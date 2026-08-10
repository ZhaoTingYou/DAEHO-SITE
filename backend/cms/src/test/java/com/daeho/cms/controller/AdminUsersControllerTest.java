package com.daeho.cms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ApiExceptionHandler;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.AdminIdentity;
import com.daeho.cms.service.AdminUserService;
import com.daeho.cms.service.AdminUserSummary;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class AdminUsersControllerTest {
  private static final String ADMIN_KEY = "test-admin-key";
  private static final String OWNER_ID = "owner-1";
  private static final String EDITOR_ID = "editor-1";
  private static final Instant NOW = Instant.parse("2026-08-10T02:00:00Z");
  private static final Instant EXPIRY = Instant.parse("2026-09-09T02:00:00Z");

  private AdminUserService users;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    users = mock(AdminUserService.class);
    var auth = new AdminAuth(new CmsProperties(
        ADMIN_KEY, "", "", false, Path.of("."), "/uploads", "", "", "local",
        "", "", "", "", "", ""
    ));
    mvc = MockMvcBuilders.standaloneSetup(new AdminUsersController(auth, users))
        .setControllerAdvice(new ApiExceptionHandler())
        .build();
  }

  @Test
  void logsInWithoutExposingPasswordHashes() throws Exception {
    when(users.authenticate(eq("owner@example.com"), eq("Owner-Passw0rd!"), any(Instant.class)))
        .thenReturn(ownerIdentity());

    mvc.perform(post("/api/admin/auth/login")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"owner@example.com\",\"password\":\"Owner-Passw0rd!\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value("owner@example.com"))
        .andExpect(jsonPath("$.user.role").value("OWNER"))
        .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
  }

  @Test
  void validatesSessionsAndChangesTheActorsOwnPassword() throws Exception {
    when(users.validateSession(eq(OWNER_ID), eq(1L), any(Instant.class)))
        .thenReturn(ownerIdentity());
    when(users.changeOwnPassword(
        eq(OWNER_ID), eq(1L), eq("Owner-Passw0rd!"), eq("N3w-Owner-Passw0rd!"), any(Instant.class)
    )).thenReturn(new AdminIdentity(OWNER_ID, "owner@example.com", "OWNER", 2L, null, false));

    mvc.perform(post("/api/admin/auth/session")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"userId\":\"owner-1\",\"sessionVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.id").value(OWNER_ID));

    mvc.perform(post("/api/admin/auth/change-own-password")
            .header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID)
            .header("x-admin-session-version", "1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"Owner-Passw0rd!\",\"newPassword\":\"N3w-Owner-Passw0rd!\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.sessionVersion").value(2));
  }

  @Test
  void supportsTheCompleteOwnerEditorLifecycle() throws Exception {
    var owner = ownerSummary();
    var editor = editorSummary();
    when(users.listUsers(eq(OWNER_ID), eq(1L), any(Instant.class))).thenReturn(List.of(owner, editor));
    when(users.createEditor(
        eq(OWNER_ID), eq(1L), eq("editor@example.com"), eq("Temp-Editor-Passw0rd!"), any(Instant.class)
    )).thenReturn(editor);
    when(users.resetEditorPassword(
        eq(OWNER_ID), eq(1L), eq(EDITOR_ID), eq("Reset-Editor-Passw0rd!"), any(Instant.class)
    )).thenReturn(editor);
    when(users.setEditorStatus(
        eq(OWNER_ID), eq(1L), eq(EDITOR_ID), eq("disabled"), any(Instant.class)
    )).thenReturn(editor);
    when(users.setEditorExpiration(
        eq(OWNER_ID), eq(1L), eq(EDITOR_ID), eq(EXPIRY), any(Instant.class)
    )).thenReturn(editor);

    mvc.perform(get("/api/admin/users").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID).header("x-admin-session-version", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(2))
        .andExpect(jsonPath("$.items[1].passwordHash").doesNotExist());

    mvc.perform(post("/api/admin/users/editors").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID).header("x-admin-session-version", "1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"editor@example.com\",\"temporaryPassword\":\"Temp-Editor-Passw0rd!\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user.role").value("EDITOR"));

    mvc.perform(post("/api/admin/users/editor-1/reset-password").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID).header("x-admin-session-version", "1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"temporaryPassword\":\"Reset-Editor-Passw0rd!\"}"))
        .andExpect(status().isOk());

    mvc.perform(patch("/api/admin/users/editor-1/status").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID).header("x-admin-session-version", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"disabled\"}"))
        .andExpect(status().isOk());

    mvc.perform(patch("/api/admin/users/editor-1/expiration").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", OWNER_ID).header("x-admin-session-version", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"expiresAt\":\"2026-09-09T02:00:00Z\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void rejectsMissingServiceKeysAndActorHeaders() throws Exception {
    mvc.perform(post("/api/admin/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"owner@example.com\",\"password\":\"Owner-Passw0rd!\"}"))
        .andExpect(status().isUnauthorized());
    verify(users, never()).authenticate(anyString(), anyString(), any(Instant.class));

    mvc.perform(get("/api/admin/users").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Missing CMS actor headers."));
  }

  @Test
  void preservesGenericLoginErrorsAndEditorForbiddenResponses() throws Exception {
    when(users.authenticate(anyString(), anyString(), any(Instant.class))).thenThrow(
        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.")
    );
    when(users.listUsers(eq(EDITOR_ID), eq(1L), any(Instant.class))).thenThrow(
        new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner access is required.")
    );

    mvc.perform(post("/api/admin/auth/login").header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"unknown@example.com\",\"password\":\"Wrong-Passw0rd!\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Invalid email or password."));

    mvc.perform(get("/api/admin/users").header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", EDITOR_ID).header("x-admin-session-version", "1"))
        .andExpect(status().isForbidden());
  }

  private AdminIdentity ownerIdentity() {
    return new AdminIdentity(OWNER_ID, "owner@example.com", "OWNER", 1L, null, false);
  }

  private AdminUserSummary ownerSummary() {
    return new AdminUserSummary(
        OWNER_ID, "owner@example.com", "OWNER", "active", null, false, 1L,
        NOW, NOW, NOW
    );
  }

  private AdminUserSummary editorSummary() {
    return new AdminUserSummary(
        EDITOR_ID, "editor@example.com", "EDITOR", "active", EXPIRY, true, 1L,
        null, NOW, NOW
    );
  }
}
