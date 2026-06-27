package com.daeho.cms.security;

import com.daeho.cms.config.CmsProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminAuth {
  private final CmsProperties properties;

  public AdminAuth(CmsProperties properties) {
    this.properties = properties;
  }

  public void requireAdmin(HttpServletRequest request) {
    var expectedKey = properties.adminApiKey();
    if (expectedKey == null || expectedKey.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "CMS_ADMIN_API_KEY is required."
      );
    }

    var authHeader = request.getHeader("authorization");
    var bearer = authHeader != null && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : "";
    var headerToken = request.getHeader("x-admin-api-key");

    if (!constantTimeEquals(bearer, expectedKey) && !constantTimeEquals(headerToken, expectedKey)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
  }

  private boolean constantTimeEquals(String value, String expected) {
    if (value == null || expected == null) {
      return false;
    }
    var valueBytes = value.getBytes(StandardCharsets.UTF_8);
    var expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
    return valueBytes.length == expectedBytes.length && MessageDigest.isEqual(valueBytes, expectedBytes);
  }
}
