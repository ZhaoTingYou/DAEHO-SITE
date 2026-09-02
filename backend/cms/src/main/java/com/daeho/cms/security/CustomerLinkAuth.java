package com.daeho.cms.security;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CustomerLinkAuth {
  private final String serviceKey;

  public CustomerLinkAuth(@Value("${cms.customer-link-api-key:}") String serviceKey) {
    this.serviceKey = serviceKey == null ? "" : serviceKey;
  }

  public String customerId(HttpServletRequest request) {
    var customerId = text(request.getHeader("x-customer-id"));
    if (customerId.isBlank()) {
      return "";
    }
    requireService(request);
    try {
      return UUID.fromString(customerId).toString();
    } catch (IllegalArgumentException error) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid customer identifier");
    }
  }

  public void requireService(HttpServletRequest request) {
    if (serviceKey.length() < 24 || !constantTimeEquals(
        request.getHeader("x-customer-service-key"), serviceKey)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid customer service credential");
    }
  }

  private boolean constantTimeEquals(String value, String expected) {
    if (value == null || expected == null) {
      return false;
    }
    var left = value.getBytes(StandardCharsets.UTF_8);
    var right = expected.getBytes(StandardCharsets.UTF_8);
    return left.length == right.length && MessageDigest.isEqual(left, right);
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
