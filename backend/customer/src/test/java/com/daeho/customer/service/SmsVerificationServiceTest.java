package com.daeho.customer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daeho.customer.repository.SmsChallengeStore;
import com.daeho.customer.repository.VerificationSessionStore;
import com.daeho.customer.sms.SmsSendReceipt;
import com.daeho.customer.sms.SmsDeliveryException;
import com.daeho.customer.sms.SmsSender;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SmsVerificationServiceTest {
  private final Clock clock = Clock.fixed(Instant.parse("2026-09-02T00:00:00Z"), ZoneOffset.UTC);

  @Test
  void automaticallySendsAndCompletesAKoreanSmsChallenge() {
    var store = new MemoryStore();
    var sender = new CapturingSender();
    var grants = new RegistrationGrantService(store, clock);
    var service = new SmsVerificationService(
        store, store, grants, sender, clock, "a-secret-long-enough-for-hmac", () -> "123456"
    );

    var started = service.start(new SmsVerificationService.SmsStartRequest(
        "010-1234-5678",
        LocalDate.of(1990, 1, 1),
        true,
        true,
        "ko",
        false
    ), "203.0.113.10", "request-1234567890");
    var grant = service.complete(started.verificationId(), "123456");
    var verified = grants.consumeForSignup(grant.grant());

    assertThat(sender.to).isEqualTo("+821012345678");
    assertThat(sender.text).isEqualTo("[DAEHO] 인증번호 123456 (10분간 유효)");
    assertThat(verified.method()).isEqualTo("sms_declaration");
    assertThat(verified.phone()).isEqualTo("+821012345678");
    assertThat(started.deliveryMessage()).doesNotContain("123456");
  }

  @Test
  void failsClosedWhenSolapiDoesNotAcceptTheMessage() {
    var store = new MemoryStore();
    var sender = new CapturingSender();
    sender.fail = true;
    var service = new SmsVerificationService(
        store, store, new RegistrationGrantService(store, clock), sender, clock,
        "a-secret-long-enough-for-hmac", () -> "123456"
    );

    assertThatThrownBy(() -> service.start(new SmsVerificationService.SmsStartRequest(
        "01012345678", LocalDate.of(1990, 1, 1), true, true, "ko", false
    ), "203.0.113.10", "request-1234567890"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("503 SERVICE_UNAVAILABLE");

    assertThat(store.challenges.values()).singleElement()
        .extracting(SmsChallenge::status)
        .isEqualTo("failed");
  }

  @Test
  void repeatsTheSameStartResponseWithoutSendingASecondSms() {
    var store = new MemoryStore();
    var sender = new CapturingSender();
    var service = new SmsVerificationService(
        store, store, new RegistrationGrantService(store, clock), sender, clock,
        "a-secret-long-enough-for-hmac", () -> "123456"
    );
    var request = new SmsVerificationService.SmsStartRequest(
        "01012345678", LocalDate.of(1990, 1, 1), true, true, "ko", false
    );

    var first = service.start(request, "203.0.113.10", "same-request-123456");
    var second = service.start(request, "203.0.113.10", "same-request-123456");

    assertThat(second.verificationId()).isEqualTo(first.verificationId());
    assertThat(sender.sendCount).isEqualTo(1);
  }

  @Test
  void rejectsRegistrationWithoutRequiredConsent() {
    var store = new MemoryStore();
    var service = new SmsVerificationService(
        store, store, new RegistrationGrantService(store, clock), new CapturingSender(), clock,
        "a-secret-long-enough-for-hmac", () -> "123456"
    );

    assertThatThrownBy(() -> service.start(new SmsVerificationService.SmsStartRequest(
        "01012345678", LocalDate.of(1990, 1, 1), true, false, "ko", false
    ), "203.0.113.10", "request-no-consent-12345"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400 BAD_REQUEST");
  }

  @Test
  void accountFeatureFlagPreventsSmsChargesEvenWhenSenderIsConfigured() {
    var store = new MemoryStore();
    var sender = new CapturingSender();
    var service = new SmsVerificationService(
        store, store, new RegistrationGrantService(store, clock), sender, clock,
        "a-secret-long-enough-for-hmac", () -> "123456",
        "terms-2026-09", "privacy-2026-09", false
    );

    assertThatThrownBy(() -> service.start(new SmsVerificationService.SmsStartRequest(
        "01012345678", LocalDate.of(1990, 1, 1), true, true, "ko", false
    ), "203.0.113.10", "request-disabled-12345"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("503 SERVICE_UNAVAILABLE");
    assertThat(sender.sendCount).isZero();
  }

  private static final class CapturingSender implements SmsSender {
    private String to;
    private String text;
    private boolean fail;
    private int sendCount;

    @Override
    public SmsSendReceipt send(String to, String text) {
      sendCount += 1;
      if (fail) {
        throw new SmsDeliveryException("provider unavailable");
      }
      this.to = to;
      this.text = text;
      return new SmsSendReceipt("group-123");
    }

    @Override
    public boolean isConfigured() {
      return true;
    }
  }

  private static final class MemoryStore implements SmsChallengeStore, VerificationSessionStore {
    private final Map<UUID, SmsChallenge> challenges = new HashMap<>();
    private final Map<UUID, VerificationSession> sessions = new HashMap<>();

    @Override
    public void acquireRateLimitLocks(String phone, String ipFingerprint, String idempotencyHash) {}

    @Override
    public long countRecentForPhone(String phone, Instant since) {
      return 0;
    }

    @Override
    public long countRecentForIp(String ipFingerprint, Instant since) {
      return 0;
    }

    @Override
    public SmsChallenge findByIdempotencyHash(String hash) {
      return challenges.values().stream()
          .filter(challenge -> hash.equals(challenge.idempotencyHash()))
          .findFirst().orElse(null);
    }

    @Override
    public void create(SmsChallenge challenge) {
      challenges.put(challenge.id(), challenge);
    }

    @Override
    public void markSent(UUID id, String providerMessageId, Instant sentAt) {
      challenges.computeIfPresent(id, (key, value) -> value.sent(providerMessageId, sentAt));
    }

    @Override
    public void markFailed(UUID id, Instant failedAt) {
      challenges.computeIfPresent(id, (key, value) -> value.failed());
    }

    @Override
    public SmsChallenge find(UUID id) {
      return challenges.get(id);
    }

    @Override
    public void recordFailedAttempt(UUID id, Instant attemptedAt) {
      challenges.computeIfPresent(id, (key, value) -> value.failedAttempt());
    }

    @Override
    public boolean markVerified(UUID id, Instant verifiedAt) {
      var current = challenges.get(id);
      if (current == null || !"pending".equals(current.status())) {
        return false;
      }
      challenges.put(id, current.verified());
      return true;
    }

    @Override
    public VerificationSession save(VerificationSession session) {
      sessions.put(session.id(), session);
      return session;
    }

    @Override
    public VerificationSession findByGrantHash(String grantHash) {
      return sessions.values().stream()
          .filter(session -> grantHash.equals(session.grantHash()))
          .findFirst().orElse(null);
    }

    @Override
    public VerificationSession findLatestConsumedByPhone(String phone) {
      return sessions.values().stream()
          .filter(session -> phone.equals(session.phone()) && session.consumedAt() != null)
          .findFirst().orElse(null);
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
