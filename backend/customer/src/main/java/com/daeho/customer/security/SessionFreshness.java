package com.daeho.customer.security;

import com.daeho.customer.model.CustomerProfile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class SessionFreshness {
  private SessionFreshness() {}

  public static void requireCurrent(CustomerProfile profile, AuthenticatedCustomer customer) {
    if (customer.development()) {
      return;
    }
    if (customer.issuedAt() == null || profile.sessionsValidAfter() == null
        || customer.issuedAt().isBefore(profile.sessionsValidAfter())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Customer session has been revoked");
    }
  }
}
