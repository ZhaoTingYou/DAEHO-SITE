package com.daeho.customer.security;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InternalApiKey {
  private final byte[] expected;

  public InternalApiKey(@Value("${customer.internal-api-key:}") String expected) {
    this.expected = expected.getBytes(StandardCharsets.UTF_8);
  }

  public void require(HttpServletRequest request) {
    var supplied = request.getHeader("x-customer-service-key");
    if (expected.length < 24 || supplied == null || !MessageDigest.isEqual(
        expected, supplied.getBytes(StandardCharsets.UTF_8))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid service credential");
    }
  }
}
