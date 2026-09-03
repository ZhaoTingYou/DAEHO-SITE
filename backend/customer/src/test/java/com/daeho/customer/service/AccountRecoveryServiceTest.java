package com.daeho.customer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.repository.AccountRecoveryStore;
import com.daeho.customer.repository.CustomerProfileStore;
import com.daeho.customer.sms.SmsDeliveryException;
import com.daeho.customer.sms.SmsSendReceipt;
import com.daeho.customer.sms.SmsSender;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class AccountRecoveryServiceTest {
  private final Clock clock = Clock.fixed(Instant.parse("2026-09-02T00:00:00Z"), ZoneOffset.UTC);

  @Test
  void sendsExistingUsernameOnlyToTheRegisteredPhone() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant"
    );

    var result = service.startUsernameRecovery(
        new AccountRecoveryService.UsernameRecoveryRequest("010-1234-5678", "ko"),
        "203.0.113.10", "username-request-123456"
    );

    assertThat(sender.sendCount).isZero();
    worker(attempts, profiles, sender).deliverNext();
    assertThat(sender.to).isEqualTo("+821012345678");
    assertThat(sender.text).isEqualTo("[DAEHO] 가입 아이디는 daeho.member 입니다.");
    assertThat(result.message()).isEqualTo("가입된 계정이 있으면 아이디를 문자로 전송했습니다.");
    assertThat(result.toString()).doesNotContain("daeho.member");
  }

  @Test
  void issuesAndCompletesOnePasswordResetGrantForAMatchingAccount() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant"
    );

    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "010-1234-5678", "ko"),
        "203.0.113.10", "password-request-123456"
    );
    worker(attempts, profiles, sender).deliverNext();
    var issued = service.completePasswordRecovery(
        started.verificationId(), "123456", "code-completion-123456");
    var reserved = service.reservePasswordRecovery(
        issued.grant(), "daeho.member", "reset-operation-123456");
    var concurrent = service.reservePasswordRecovery(
        issued.grant(), "daeho.member", "reset-operation-123456");
    assertThatThrownBy(() -> service.completePasswordReset(
        issued.grant(), "daeho.member", "reset-operation-123456"))
        .isInstanceOf(AccountRecoveryException.class);
    assertThatThrownBy(() -> service.reservePasswordRecovery(
        issued.grant(), "daeho.member", "different-operation-123"))
        .isInstanceOf(AccountRecoveryException.class);
    service.invalidatePasswordRecoverySessions(
        issued.grant(), "daeho.member", "reset-operation-123456");
    service.completePasswordReset(
        issued.grant(), "daeho.member", "reset-operation-123456");

    assertThat(sender.text).isEqualTo("[DAEHO] 비밀번호 재설정 인증번호 123456 (10분간 유효)");
    assertThat(reserved.state()).isEqualTo("acquired");
    assertThat(reserved.stage()).isEqualTo("reserved");
    assertThat(concurrent.state()).isEqualTo("in_progress");
    assertThat(attempts.sessionInvalidations).isEqualTo(1);
    assertThat(service.reservePasswordRecovery(
        issued.grant(), "daeho.member", "reset-operation-123456").state())
        .isEqualTo("completed");
    assertThatThrownBy(() -> service.reservePasswordRecovery(
        issued.grant(), "daeho.member", "different-operation-123"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void repeatsCodeCompletionWithTheSameOperationAfterAResponseIsLost() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "unused-random-grant");
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "completion-replay-request");
    worker(attempts, profiles, sender).deliverNext();

    var nearSmsExpiry = new AccountRecoveryService(
        profiles, attempts, sender,
        Clock.offset(clock, Duration.ofMinutes(9).plusSeconds(59)),
        "a-secret-long-enough-for-hmac", () -> "unused-random-grant");
    var first = nearSmsExpiry.completePasswordRecovery(
        started.verificationId(), "123456", "completion-replay-key");
    var afterSmsExpiry = new AccountRecoveryService(
        profiles, attempts, sender,
        Clock.offset(clock, Duration.ofMinutes(10).plusSeconds(1)),
        "a-secret-long-enough-for-hmac", () -> "unused-random-grant");
    var repeated = afterSmsExpiry.completePasswordRecovery(
        started.verificationId(), "123456", "completion-replay-key");

    assertThat(repeated).isEqualTo(first);
    assertThatThrownBy(() -> afterSmsExpiry.completePasswordRecovery(
        started.verificationId(), "123456", "different-completion-key"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void hidesWhetherTheUsernameAndPhoneMatchAnAccount() {
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        new ProfileStore(null), attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant"
    );

    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "010-1234-5678", "ko"),
        "203.0.113.10", "unknown-request-1234567"
    );

    assertThat(started.verificationId()).isNotNull();
    assertThat(started.message()).isEqualTo("계정 정보가 일치하면 인증번호를 문자로 전송했습니다.");
    assertThat(sender.to).isNull();
    worker(attempts, new ProfileStore(null), sender).deliverNext();
    assertThat(sender.to).isNull();
    assertThatThrownBy(() -> service.completePasswordRecovery(
        started.verificationId(), "123456", "code-completion-123456"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void limitsPasswordRecoveryToThreeSmsRequestsPerPhoneAndHour() {
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        new ProfileStore(activeProfile()), attempts, sender, clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );
    var request = new AccountRecoveryService.PasswordRecoveryRequest(
        "daeho.member", "010-1234-5678", "ko");

    for (var index = 0; index < 3; index += 1) {
      service.startPasswordRecovery(
          request, "203.0.113.10", "password-rate-request-" + index);
    }

    assertThatThrownBy(() -> service.startPasswordRecovery(
        request, "203.0.113.10", "password-rate-request-4"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("429 TOO_MANY_REQUESTS");
    assertThat(sender.sendCount).isZero();
  }

  @Test
  void recordsAnUnknownDeliveryWithoutAutomaticallySendingItAgain() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new SmsSender() {
      @Override public SmsSendReceipt send(String to, String text) {
        throw new SmsDeliveryException("simulated timeout after provider request");
      }

      @Override public boolean isConfigured() {
        return true;
      }
    };
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant");
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "unknown-delivery-123456");
    var worker = new AccountRecoveryDeliveryWorker(
        attempts, profiles, sender, clock, "a-secret-long-enough-for-hmac", () -> "123456");

    worker.deliverNext();
    worker.deliverNext();

    assertThat(attempts.findRecovery(started.verificationId()).status())
        .isEqualTo("delivery_unknown");
  }

  @Test
  void auditsUsernameDeliveryAndConsumedPasswordResetAuthorization() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant"
    );

    service.startUsernameRecovery(
        new AccountRecoveryService.UsernameRecoveryRequest("01012345678", "ko"),
        "203.0.113.10", "username-audit-123456");
    worker(attempts, profiles, sender).deliverNext();
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "password-audit-123456");
    worker(attempts, profiles, sender).deliverNext();
    var grant = service.completePasswordRecovery(
        started.verificationId(), "123456", "audit-completion-123456");
    service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "audit-operation-123456");
    service.invalidatePasswordRecoverySessions(
        grant.grant(), "daeho.member", "audit-operation-123456");
    service.completePasswordReset(
        grant.grant(), "daeho.member", "audit-operation-123456");

    assertThat(profiles.auditEvents).containsExactly(
        "username_recovery_sent", "password_reset_completed");
  }

  @Test
  void repeatsAnIdempotentPasswordRequestWithoutSendingAnotherSms() {
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        new ProfileStore(activeProfile()), attempts, sender, clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );
    var request = new AccountRecoveryService.PasswordRecoveryRequest(
        "daeho.member", "01012345678", "ko");

    var first = service.startPasswordRecovery(request, "203.0.113.10", "same-request-12345678");
    var repeated = service.startPasswordRecovery(request, "203.0.113.10", "same-request-12345678");

    assertThat(repeated.verificationId()).isEqualTo(first.verificationId());
    assertThat(sender.sendCount).isZero();
    worker(attempts, new ProfileStore(activeProfile()), sender).deliverNext();
    assertThat(sender.sendCount).isEqualTo(1);
  }

  @Test
  void rejectsARecoveryCodeAfterFiveIncorrectAttempts() {
    var attempts = new MemoryRecoveryStore();
    var service = new AccountRecoveryService(
        new ProfileStore(activeProfile()), attempts, new CapturingSender(), clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "five-attempts-12345678");
    worker(attempts, new ProfileStore(activeProfile()), new CapturingSender()).deliverNext();

    for (var index = 0; index < 5; index += 1) {
      assertThatThrownBy(() -> service.completePasswordRecovery(
          started.verificationId(), "654321", "attempt-completion-123456"))
          .isInstanceOf(AccountRecoveryException.class);
    }
    assertThatThrownBy(() -> service.completePasswordRecovery(
        started.verificationId(), "123456", "attempt-completion-123456"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void doesNotSendRecoveryMessagesForSuspendedAccounts() {
    var active = activeProfile();
    var suspended = new CustomerProfile(
        active.customerId(), active.cognitoSubject(), active.loginName(), "suspended",
        active.legalName(), active.displayName(), active.phone(), active.email(), active.locale(),
        active.country(), active.organization(), active.team(), active.verificationMethod(),
        active.verifiedAt(), active.adultVerified(), active.sessionVersion(),
        active.sessionsValidAfter(), active.createdAt(), active.updatedAt());
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        new ProfileStore(suspended), new MemoryRecoveryStore(), sender, clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );

    service.startUsernameRecovery(
        new AccountRecoveryService.UsernameRecoveryRequest("01012345678", "ko"),
        "203.0.113.10", "suspended-user-12345678");
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "suspended-password-1234");

    worker(new MemoryRecoveryStore(), new ProfileStore(suspended), sender).deliverNext();
    assertThat(sender.sendCount).isZero();
    assertThatThrownBy(() -> service.completePasswordRecovery(
        started.verificationId(), "123456", "suspend-completion-123456"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void reportsInvalidLoginNamesAsBadRecoveryRequests() {
    var service = new AccountRecoveryService(
        new ProfileStore(activeProfile()), new MemoryRecoveryStore(), new CapturingSender(), clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );

    assertThatThrownBy(() -> service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "01012345678", "01012345678", "ko"),
        "203.0.113.10", "invalid-name-request-123"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400 BAD_REQUEST");
  }

  @Test
  void refusesToConsumeAGrantIfTheAccountWasSuspendedAfterVerification() {
    var attempts = new MemoryRecoveryStore();
    var service = new AccountRecoveryService(
        new ProfileStore(activeProfile()), attempts, new CapturingSender(), clock,
        "a-secret-long-enough-for-hmac", () -> "recovery-grant"
    );
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "suspend-after-code-12345");
    worker(attempts, new ProfileStore(activeProfile()), new CapturingSender()).deliverNext();
    var grant = service.completePasswordRecovery(
        started.verificationId(), "123456", "suspend-completion-123456");
    attempts.customerRecoverable = false;

    assertThatThrownBy(() -> service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "suspended-operation-123"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void rechecksAccountStatusAndUsesAShortLeaseForRecoveryRetries() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant");
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "lease-retry-request-123");
    worker(attempts, profiles, sender).deliverNext();
    var grant = service.completePasswordRecovery(
        started.verificationId(), "123456", "lease-completion-123456");

    assertThat(service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "lease-operation-12345").state())
        .isEqualTo("acquired");
    assertThat(service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "lease-operation-12345").state())
        .isEqualTo("in_progress");

    var afterLease = new AccountRecoveryService(
        profiles, attempts, sender, Clock.offset(clock, Duration.ofSeconds(16)),
        "a-secret-long-enough-for-hmac", () -> "unused-grant");
    assertThat(afterLease.reservePasswordRecovery(
        grant.grant(), "daeho.member", "lease-operation-12345").state())
        .isEqualTo("acquired");

    attempts.customerRecoverable = false;
    assertThatThrownBy(() -> afterLease.reservePasswordRecovery(
        grant.grant(), "daeho.member", "lease-operation-12345"))
        .isInstanceOf(AccountRecoveryException.class);

    attempts.customerRecoverable = true;
    var afterDeadline = new AccountRecoveryService(
        profiles, attempts, sender, Clock.offset(clock, Duration.ofMinutes(4)),
        "a-secret-long-enough-for-hmac", () -> "unused-grant");
    assertThatThrownBy(() -> afterDeadline.reservePasswordRecovery(
        grant.grant(), "daeho.member", "lease-operation-12345"))
        .isInstanceOf(AccountRecoveryException.class);
  }

  @Test
  void releasesAProviderFailureForAnIdempotentRetry() {
    var profiles = new ProfileStore(activeProfile());
    var attempts = new MemoryRecoveryStore();
    var sender = new CapturingSender();
    var service = new AccountRecoveryService(
        profiles, attempts, sender, clock, "a-secret-long-enough-for-hmac",
        () -> "recovery-grant");
    var started = service.startPasswordRecovery(
        new AccountRecoveryService.PasswordRecoveryRequest(
            "daeho.member", "01012345678", "ko"),
        "203.0.113.10", "provider-retry-12345678");
    worker(attempts, profiles, sender).deliverNext();
    var grant = service.completePasswordRecovery(
        started.verificationId(), "123456", "provider-completion-123456");

    service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "provider-operation-123");
    service.releasePasswordReset(
        grant.grant(), "daeho.member", "provider-operation-123");
    assertThat(service.reservePasswordRecovery(
        grant.grant(), "daeho.member", "provider-operation-123").state())
        .isEqualTo("acquired");
    service.invalidatePasswordRecoverySessions(
        grant.grant(), "daeho.member", "provider-operation-123");
    service.completePasswordReset(
        grant.grant(), "daeho.member", "provider-operation-123");

    assertThat(attempts.sessionInvalidations).isEqualTo(1);
  }

  private AccountRecoveryDeliveryWorker worker(
      MemoryRecoveryStore attempts, ProfileStore profiles, CapturingSender sender) {
    return new AccountRecoveryDeliveryWorker(
        attempts, profiles, sender, clock, "a-secret-long-enough-for-hmac", () -> "123456");
  }

  private static CustomerProfile activeProfile() {
    var now = Instant.parse("2026-09-01T00:00:00Z");
    return new CustomerProfile(
        UUID.fromString("f7d59560-a235-47ca-8f4c-c5b0882fb223"), "subject-one", "daeho.member",
        "active", "", "", "+821012345678", "", "ko", "KR", "", "",
        "sms_declaration", now, true, 1, Instant.EPOCH, now, now
    );
  }

  private static final class CapturingSender implements SmsSender {
    private String to;
    private String text;
    private int sendCount;

    @Override
    public SmsSendReceipt send(String to, String text) {
      sendCount += 1;
      this.to = to;
      this.text = text;
      return new SmsSendReceipt("message-one");
    }

    @Override
    public boolean isConfigured() {
      return true;
    }
  }

  private static final class MemoryRecoveryStore implements AccountRecoveryStore {
    private final List<AccountRecoveryAttempt> values = new ArrayList<>();
    private boolean customerRecoverable = true;
    private int sessionInvalidations;

    @Override public void acquireRecoveryRateLimitLocks(String purpose, String phoneFingerprint,
        String ipFingerprint, String idempotencyHash) {}
    @Override public long countRecentRecoveryForPhone(
        String purpose, String fingerprint, Instant since) {
      return values.stream().filter(value -> purpose.equals(value.purpose())
          && fingerprint.equals(value.phoneFingerprint()) && !value.createdAt().isBefore(since)).count();
    }
    @Override public long countRecentRecoveryForIp(
        String purpose, String fingerprint, Instant since) {
      return values.stream().filter(value -> purpose.equals(value.purpose())
          && fingerprint.equals(value.ipFingerprint()) && !value.createdAt().isBefore(since)).count();
    }
    @Override public AccountRecoveryAttempt findRecoveryByIdempotencyHash(String hash) {
      return values.stream().filter(value -> hash.equals(value.idempotencyHash())).findFirst().orElse(null);
    }
    @Override public void createRecovery(AccountRecoveryAttempt attempt) { values.add(attempt); }
    @Override public void expireStaleRecoveryDeliveries(Instant now) {
      values.stream()
          .filter(value -> "sending".equals(value.status())
              && value.deliveryLeaseExpiresAt() != null
              && !value.deliveryLeaseExpiresAt().isAfter(now))
          .map(AccountRecoveryAttempt::id).toList()
          .forEach(id -> markRecoveryDeliveryUnknown(id, now));
    }
    @Override public AccountRecoveryDelivery findNextPendingRecovery(Instant now) {
      if (!customerRecoverable) return null;
      return values.stream()
          .filter(value -> "pending".equals(value.status()) && value.expiresAt().isAfter(now))
          .findFirst().map(value -> new AccountRecoveryDelivery(value, "+821012345678"))
          .orElse(null);
    }
    @Override public void prepareRecoveryChallenge(UUID id, String challengeHash, Instant preparedAt) {
      replace(id, current -> copy(current, current.status(), challengeHash,
          current.attemptCount(), current.providerMessageId(), current.sentAt(),
          current.grantHash(), current.grantExpiresAt(), current.verifiedAt(),
          current.consumedAt(), current.resetOperationHash()));
    }
    @Override public void markRecoverySending(
        UUID id, Instant leaseExpiresAt, Instant claimedAt) {
      replace(id, current -> copyDelivery(
          current, "sending", current.challengeHash(), current.providerMessageId(),
          current.sentAt(), leaseExpiresAt));
    }
    @Override public void markRecoverySent(UUID id, String messageId, Instant sentAt) {
      replace(id, current -> copy(current, "sent", current.challengeHash(),
          current.attemptCount(), messageId, sentAt, current.grantHash(),
          current.grantExpiresAt(), current.verifiedAt(), current.consumedAt(),
          current.resetOperationHash()));
    }
    @Override public void markRecoveryFailed(UUID id, Instant failedAt) {
      replace(id, current -> copy(current, "failed", "", current.attemptCount(),
          current.providerMessageId(), current.sentAt(), current.grantHash(),
          current.grantExpiresAt(), current.verifiedAt(), current.consumedAt(),
          current.resetOperationHash()));
    }
    @Override public void markRecoveryDeliveryUnknown(UUID id, Instant failedAt) {
      replace(id, current -> copy(current, "delivery_unknown", "", current.attemptCount(),
          current.providerMessageId(), current.sentAt(), current.grantHash(),
          current.grantExpiresAt(), current.verifiedAt(), current.consumedAt(),
          current.resetOperationHash()));
    }
    @Override public void markRecoveryDecoy(UUID id, Instant completedAt) {
      replace(id, current -> copy(current, "decoy", "", current.attemptCount(), "", null,
          current.grantHash(), current.grantExpiresAt(), current.verifiedAt(),
          current.consumedAt(), current.resetOperationHash()));
    }
    @Override public AccountRecoveryAttempt findRecovery(UUID id) {
      return values.stream().filter(value -> id.equals(value.id())).findFirst().orElse(null);
    }
    @Override public void recordRecoveryFailedAttempt(UUID id, Instant attemptedAt) {
      replace(id, current -> copy(current, current.status(), current.challengeHash(),
          current.attemptCount() + 1, current.providerMessageId(), current.sentAt(),
          current.grantHash(), current.grantExpiresAt(), current.verifiedAt(),
          current.consumedAt(), current.resetOperationHash()));
    }
    @Override public boolean markRecoveryVerified(
        UUID id, String grantHash, Instant grantExpiresAt,
        Instant verifiedAt) {
      var current = findRecovery(id);
      if (current == null || !"sent".equals(current.status())) return false;
      replace(id, value -> copy(value, "verified", value.challengeHash(), value.attemptCount(),
          value.providerMessageId(), value.sentAt(), grantHash, grantExpiresAt,
          verifiedAt, null, ""));
      return true;
    }
    @Override public AccountRecoveryAttempt findRecoveryByGrantHash(String grantHash) {
      return values.stream().filter(value -> grantHash.equals(value.grantHash())).findFirst().orElse(null);
    }
    @Override public void acquireRecoveryGrantLock(String grantHash) {}
    @Override public boolean markRecoveryResetting(
        UUID id, String loginName, String operationHash, Instant leaseExpiresAt,
        Instant deadlineAt, Instant reservedAt) {
      var current = findRecovery(id);
      if (current == null || !"verified".equals(current.status()) || !customerRecoverable
          || !loginName.equals(current.loginName())) return false;
      replace(id, value -> copyReset(value, "resetting", operationHash, "reserved",
          leaseExpiresAt, deadlineAt, value.consumedAt()));
      return true;
    }
    @Override public boolean isRecoveryAccountActive(UUID id, String loginName, Instant now) {
      var current = findRecovery(id);
      return current != null && customerRecoverable && loginName.equals(current.loginName())
          && current.resetDeadlineAt() != null && current.resetDeadlineAt().isAfter(now);
    }
    @Override public boolean renewRecoveryResetting(
        UUID id, String loginName, String operationHash, Instant leaseExpiresAt, Instant renewedAt) {
      var current = findRecovery(id);
      if (current == null || !isRecoveryAccountActive(id, loginName, renewedAt)
          || !operationHash.equals(current.resetOperationHash())
          || current.resetLeaseExpiresAt() == null
          || current.resetLeaseExpiresAt().isAfter(renewedAt)) return false;
      replace(id, value -> copyReset(value, value.status(), operationHash, value.resetStage(),
          leaseExpiresAt, value.resetDeadlineAt(), value.consumedAt()));
      return true;
    }
    @Override public boolean markRecoverySessionsInvalidated(
        UUID id, String operationHash, Instant leaseExpiresAt, Instant invalidatedAt) {
      var current = findRecovery(id);
      if (current == null || !customerRecoverable || !"resetting".equals(current.status())
          || !"reserved".equals(current.resetStage())
          || !operationHash.equals(current.resetOperationHash())
          || current.resetDeadlineAt() == null
          || !current.resetDeadlineAt().isAfter(invalidatedAt)) return false;
      replace(id, value -> copyReset(value, value.status(), operationHash,
          "sessions_invalidated", leaseExpiresAt, value.resetDeadlineAt(), value.consumedAt()));
      sessionInvalidations += 1;
      return true;
    }
    @Override public boolean markRecoveryResetCompleted(
        UUID id, String operationHash, Instant completedAt) {
      var current = findRecovery(id);
      if (current == null || !"resetting".equals(current.status()) || !customerRecoverable
          || !"sessions_invalidated".equals(current.resetStage())
          || !operationHash.equals(current.resetOperationHash())
          || current.resetDeadlineAt() == null
          || !current.resetDeadlineAt().isAfter(completedAt)) return false;
      replace(id, value -> copyReset(value, "consumed", operationHash,
          "sessions_invalidated", value.resetLeaseExpiresAt(), value.resetDeadlineAt(), completedAt));
      return true;
    }
    @Override public boolean releaseRecoveryReset(
        UUID id, String operationHash, Instant releasedAt) {
      var current = findRecovery(id);
      if (current == null || !"resetting".equals(current.status())
          || !"reserved".equals(current.resetStage())
          || !operationHash.equals(current.resetOperationHash())) return false;
      var status = current.grantExpiresAt().isAfter(releasedAt) ? "verified" : "failed";
      replace(id, value -> copyReset(value, status, "", "", null, null,
          value.consumedAt()));
      return true;
    }

    private void replace(UUID id, java.util.function.Function<AccountRecoveryAttempt,
        AccountRecoveryAttempt> update) {
      for (var index = 0; index < values.size(); index += 1) {
        if (id.equals(values.get(index).id())) {
          values.set(index, update.apply(values.get(index)));
          return;
        }
      }
    }

    private AccountRecoveryAttempt copy(
        AccountRecoveryAttempt value, String status, String challengeHash,
        int attemptCount, String messageId,
        Instant sentAt, String grantHash, Instant grantExpiresAt, Instant verifiedAt,
        Instant consumedAt, String resetOperationHash) {
      return new AccountRecoveryAttempt(
          value.id(), value.purpose(), value.customerId(), value.loginName(),
          value.phoneFingerprint(), value.ipFingerprint(), value.idempotencyHash(), value.locale(),
          status, challengeHash, attemptCount, messageId, sentAt,
          value.deliveryLeaseExpiresAt(), value.expiresAt(), grantHash, grantExpiresAt,
          verifiedAt, consumedAt, resetOperationHash, value.resetStage(),
          value.resetLeaseExpiresAt(), value.resetDeadlineAt(), value.createdAt());
    }

    private AccountRecoveryAttempt copyDelivery(
        AccountRecoveryAttempt value, String status, String challengeHash,
        String messageId, Instant sentAt, Instant deliveryLeaseExpiresAt) {
      return new AccountRecoveryAttempt(
          value.id(), value.purpose(), value.customerId(), value.loginName(),
          value.phoneFingerprint(), value.ipFingerprint(), value.idempotencyHash(), value.locale(),
          status, challengeHash, value.attemptCount(), messageId, sentAt,
          deliveryLeaseExpiresAt, value.expiresAt(), value.grantHash(), value.grantExpiresAt(),
          value.verifiedAt(), value.consumedAt(), value.resetOperationHash(), value.resetStage(),
          value.resetLeaseExpiresAt(), value.resetDeadlineAt(), value.createdAt());
    }

    private AccountRecoveryAttempt copyReset(
        AccountRecoveryAttempt value, String status, String operationHash, String stage,
        Instant leaseExpiresAt, Instant deadlineAt, Instant consumedAt) {
      return new AccountRecoveryAttempt(
          value.id(), value.purpose(), value.customerId(), value.loginName(),
          value.phoneFingerprint(), value.ipFingerprint(), value.idempotencyHash(), value.locale(),
          status, value.challengeHash(), value.attemptCount(), value.providerMessageId(),
          value.sentAt(), value.deliveryLeaseExpiresAt(), value.expiresAt(), value.grantHash(),
          value.grantExpiresAt(), value.verifiedAt(), consumedAt, operationHash, stage,
          leaseExpiresAt, deadlineAt, value.createdAt());
    }
  }

  private static final class ProfileStore implements CustomerProfileStore {
    private final CustomerProfile profile;
    private final List<String> auditEvents = new ArrayList<>();

    private ProfileStore(CustomerProfile profile) {
      this.profile = profile;
    }

    @Override public CustomerProfile findBySubject(String subject) { return null; }
    @Override public CustomerProfile findByPhone(String phone) {
      return profile != null && profile.phone().equals(phone) ? profile : null;
    }
    @Override public CustomerProfile findByCiFingerprint(String fingerprint) { return null; }
    @Override public CustomerProfile createFromVerification(String subject,
        VerificationSession verification, String loginName) { return null; }
    @Override public CustomerProfile relinkVerifiedPhone(UUID customerId, String subject,
        String loginName, VerificationSession verification) { return null; }
    @Override public CustomerProfile update(String subject, String displayName, String email,
        String organization, String team, String locale) { return null; }
    @Override public CustomerProfile markDeletionPending(String subject) { return null; }
    @Override public CustomerProfile incrementSessionVersion(String subject) { return null; }
    @Override public CustomerProfile updateStatus(UUID customerId, String status, String actor) { return null; }
    @Override public int anonymizeDeletionPendingBefore(Instant cutoff) { return 0; }
    @Override public List<UUID> findCustomersAwaitingInquiryUnlink(int limit) { return List.of(); }
    @Override public void markInquiriesUnlinked(UUID customerId) {}
    @Override public List<CustomerProfile> search(String query, int limit) { return List.of(); }

    @Override public void recordAudit(UUID customerId, String eventType, String actor) {
      auditEvents.add(eventType);
    }
  }
}
