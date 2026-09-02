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
  void bindsARegistrationGrantAndKeepsTheExactSignupRetryIdempotent() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("subject@example.com"));

    var consumed = service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");

    assertThat(consumed.identifier()).isEqualTo("subject@example.com");
    assertThat(service.requireConsumedForProvisioning(
        issued.grant(), "+821012345678", "daeho.member").identifier())
        .isEqualTo("subject@example.com");
    assertThat(service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member").consumedAt())
        .isEqualTo(consumed.consumedAt());
  }

  @Test
  void rejectsAnExpiredRegistrationGrant() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var session = verifiedSession("subject@example.com");
    store.save(session.withGrant("stored-hash", Instant.parse("2026-09-01T23:59:59Z")));

    assertThatThrownBy(() -> service.consumeForSignup(
        "expired-grant", "ap-northeast-2_pool", "client-one", "daeho.member"))
        .isInstanceOf(RegistrationGrantException.class);
  }

  @Test
  void preSignupConsumesTheGrantBeforeProfileProvisioning() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("+821012345678"));

    assertThat(service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member").phone())
        .isEqualTo("+821012345678");
    assertThat(service.requireConsumedForProvisioning(
        issued.grant(), "+821012345678", "daeho.member").phone())
        .isEqualTo("+821012345678");
  }

  @Test
  void allowsPreSignupRetryAfterCognitoRejectsThePassword() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("+821012345678"));

    var firstValidation = service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");
    var retryValidation = service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");

    assertThat(retryValidation.id()).isEqualTo(firstValidation.id());
    assertThat(retryValidation.consumedAt()).isEqualTo(firstValidation.consumedAt());
  }

  @Test
  void rejectsReusingAGrantForAnotherUsernameOrClient() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var issued = service.issue(verifiedSession("+821012345678"));
    service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");

    assertThatThrownBy(() -> service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-one", "another.member"))
        .isInstanceOf(RegistrationGrantException.class);
    assertThatThrownBy(() -> service.consumeForSignup(
        issued.grant(), "ap-northeast-2_pool", "client-two", "daeho.member"))
        .isInstanceOf(RegistrationGrantException.class);
  }

  @Test
  void reservesOneVerifiedPhoneForOnlyOneCognitoSignupAtATime() {
    var store = new MemoryStore();
    var service = new RegistrationGrantService(store, clock);
    var first = service.issue(verifiedSession("+821012345678"));
    var second = service.issue(verifiedSession("+821012345678"));

    service.consumeForSignup(
        first.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");

    assertThatThrownBy(() -> service.consumeForSignup(
        second.grant(), "ap-northeast-2_pool", "client-one", "another.member"))
        .isInstanceOf(RegistrationGrantException.class)
        .hasMessageContaining("account already exists");
  }

  @Test
  void keepsThePhoneReservationAfterTheSignupGrantExpires() {
    var store = new MemoryStore();
    var signupService = new RegistrationGrantService(store, clock);
    var first = signupService.issue(verifiedSession("+821012345678"));
    signupService.consumeForSignup(
        first.grant(), "ap-northeast-2_pool", "client-one", "daeho.member");

    var laterService = new RegistrationGrantService(
        store, Clock.fixed(Instant.parse("2026-09-02T01:00:00Z"), ZoneOffset.UTC));
    var laterSession = verifiedSession("+821012345678");
    store.save(laterSession.withGrant(hashForTest("later-grant"), Instant.parse("2026-09-02T01:15:00Z")));

    assertThatThrownBy(() -> laterService.consumeForSignup(
        "later-grant", "ap-northeast-2_pool", "client-one", "another.member"))
        .isInstanceOf(RegistrationGrantException.class)
        .hasMessageContaining("account already exists");
  }

  private VerificationSession verifiedSession(String identifier) {
    return new VerificationSession(
        UUID.randomUUID(), "email", identifier, "Verified User", "+821012345678", "phone-fingerprint",
        true, "ko", "terms-2026-09", "privacy-2026-09", false,
        "verified", "", null, Instant.parse("2026-09-02T00:15:00Z"), null,
        "", "", ""
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
    public VerificationSession findLatestConsumedByPhone(String phone) {
      return sessions.values().stream()
          .filter(session -> phone.equals(session.phone()) && session.consumedAt() != null)
          .findFirst().orElse(null);
    }

    @Override
    public VerificationSession findLatestConsumedByPhoneFingerprint(String fingerprint) {
      return sessions.values().stream()
          .filter(session -> fingerprint.equals(session.ciFingerprint()) && session.consumedAt() != null)
          .findFirst().orElse(null);
    }

    @Override
    public void acquireSignupPhoneLock(String phone) {}

    @Override
    public void delete(UUID id) { sessions.remove(id); }

    @Override
    public boolean bindGrant(UUID id, String grantHash, String userPoolId, String clientId,
        String username, Instant consumedAt) {
      var session = sessions.get(id);
      if (session == null || !grantHash.equals(session.grantHash())) {
        return false;
      }
      if (session.consumedAt() != null && (!userPoolId.equals(session.signupUserPoolId())
          || !clientId.equals(session.signupClientId()) || !username.equals(session.signupUsername()))) {
        return false;
      }
      sessions.put(id, session.withSignupBinding(userPoolId, clientId, username, consumedAt));
      return true;
    }
  }

  private static String hashForTest(String value) {
    try {
      return java.util.HexFormat.of().formatHex(
          java.security.MessageDigest.getInstance("SHA-256")
              .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException error) {
      throw new IllegalStateException(error);
    }
  }
}
