package com.daeho.customer.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Component
public class AuthenticatedSubjectResolver {
  private final String mode;

  public AuthenticatedSubjectResolver(@Value("${customer.auth.mode:disabled}") String mode) {
    this.mode = mode;
  }

  public AuthenticatedCustomer require(Authentication authentication, HttpServletRequest request) {
    if (authentication instanceof JwtAuthenticationToken token) {
      return new AuthenticatedCustomer(
          token.getToken().getSubject(), token.getToken().getIssuedAt(), false
      );
    }
    if ("dev".equals(mode)) {
      var subject = request.getHeader("x-dev-subject");
      if (subject != null && !subject.isBlank()) {
        return new AuthenticatedCustomer(subject.trim(), null, true);
      }
    }
    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
  }
}
