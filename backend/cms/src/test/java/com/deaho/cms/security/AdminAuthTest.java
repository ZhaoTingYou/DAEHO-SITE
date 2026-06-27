package com.deaho.cms.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.deaho.cms.config.CmsProperties;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class AdminAuthTest {
  private final AdminAuth auth = new AdminAuth(new CmsProperties(
      "secret-key",
      "",
      "",
      false,
      Path.of("/tmp/uploads"),
      "/uploads"
  ));

  @Test
  void acceptsXAdminApiKeyHeader() {
    var request = new MockHttpServletRequest();
    request.addHeader("x-admin-api-key", "secret-key");

    assertDoesNotThrow(() -> auth.requireAdmin(request));
  }

  @Test
  void acceptsBearerToken() {
    var request = new MockHttpServletRequest();
    request.addHeader("authorization", "Bearer secret-key");

    assertDoesNotThrow(() -> auth.requireAdmin(request));
  }

  @Test
  void rejectsMissingToken() {
    var request = new MockHttpServletRequest();

    var error = assertThrows(ResponseStatusException.class, () -> auth.requireAdmin(request));

    assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
  }
}
