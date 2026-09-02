package com.daeho.customer.security;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daeho.customer.model.CustomerProfile;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SessionFreshnessTest {
  @Test
  void rejectsTokensIssuedBeforeLogoutEverywhere() {
    var profile = profile(Instant.parse("2026-09-02T00:05:00Z"));

    assertThatThrownBy(() -> SessionFreshness.requireCurrent(
        profile, new AuthenticatedCustomer("subject", Instant.parse("2026-09-02T00:04:59Z"), false)
    )).isInstanceOf(ResponseStatusException.class).hasMessageContaining("401 UNAUTHORIZED");

    assertThatCode(() -> SessionFreshness.requireCurrent(
        profile, new AuthenticatedCustomer("subject", Instant.parse("2026-09-02T00:05:00Z"), false)
    )).doesNotThrowAnyException();
  }

  @Test
  void permitsExplicitDevelopmentSessionsWithoutAJwtTimestamp() {
    assertThatCode(() -> SessionFreshness.requireCurrent(
        profile(Instant.parse("2026-09-02T00:05:00Z")),
        new AuthenticatedCustomer("dev-subject", null, true)
    )).doesNotThrowAnyException();
  }

  private CustomerProfile profile(Instant sessionsValidAfter) {
    return new CustomerProfile(
        UUID.randomUUID(), "subject", "active", "", "", "+821012345678", "", "ko", "KR",
        "", "", "sms_declaration", Instant.parse("2026-09-01T00:00:00Z"), true, 2,
        sessionsValidAfter, Instant.parse("2026-09-01T00:00:00Z"), Instant.parse("2026-09-02T00:05:00Z")
    );
  }
}
