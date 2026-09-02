package com.daeho.customer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daeho.customer.repository.VerificationSessionStore;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RegistrationGrantServiceTest {
  private final Clock clock = Clock.fixed(Instant.parse("2026-09-02T00:00:00Z"), ZoneOffset.UTC);

  @Test
  void consumesARegistrationGrantOnlyOnce() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("subject@example.com"));

    var consumed = service.consumeForSignup(issued.grant());

    assertThat(consumed.identifier()).isEqualTo("subject@example.com");
    assertThat(service.requireConsumedForProvisioning(issued.grant()).identifier())
        .isEqualTo("subject@example.com");
    assertThatThrownBy(() -> service.consumeForSignup(issued.grant()))
        .isInstanceOf(RegistrationGrantException.class);
  }

  @Test
  void rejectsAnExpiredRegistrationGrant() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var session = verifiedSession("subject@example.com");
    store.save(session.withGrant("stored-hash", Instant.parse("2026-09-01T23:59:59Z")));

    assertThatThrownBy(() -> service.consumeForSignup("expired-grant"))
        .isInstanceOf(RegistrationGrantException.class);
  }

  @Test
  void preSignupConsumesTheGrantBeforeProfileProvisioning() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("+821012345678"));

    assertThat(service.consumeForSignup(issued.grant()).phone()).isEqualTo("+821012345678");
    assertThatThrownBy(() -> service.consumeForSignup(issued.grant()))
        .isInstanceOf(RegistrationGrantException.class);
    assertThat(service.requireConsumedForProvisioning(issued.grant()).phone())
        .isEqualTo("+821012345678");
  }

  private VerificationSession verifiedSession(String identifier) {
    return new VerificationSession(
        UUID.randomUUID(), "email", identifier, "Verified User", "+821012345678", "",
        true, "ko", "terms-2026-09", "privacy-2026-09", false,
        "verified", "", null, Instant.parse("2026-09-02T00:15:00Z"), null
    );
  }

  private static final class MemoryStore implements VerificationSessionStore {
    private final Map<UUID, VerificationSession> sessions = new HashMap<>();

    @Override
    public VerificationSession save(VerificationSession session) {
      sessions.put(session.id(), session);
      return session;
    }

    @Override
    public VerificationSession findByGrantHash(String grantHash) {
      return sessions.values().stream()
          .filter(session -> grantHash.equals(session.grantHash()))
          .findFirst()
          .orElse(null);
    }

    @Override
    public boolean consumeGrant(UUID id, String grantHash, Instant consumedAt) {
      var session = sessions.get(id);
      if (session == null || session.consumedAt() != null || !grantHash.equals(session.grantHash())) {
        return false;
      }
      sessions.put(id, session.consumedAt(consumedAt));
      return true;
    }
  }
}
