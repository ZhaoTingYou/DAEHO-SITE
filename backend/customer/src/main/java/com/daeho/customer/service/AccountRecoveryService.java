package com.daeho.customer.service;

import com.daeho.customer.repository.AccountRecoveryStore;
import com.daeho.customer.repository.CustomerProfileStore;
import com.daeho.customer.sms.SmsSender;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountRecoveryService {
  private static final Duration ATTEMPT_TTL = Duration.ofMinutes(10);
  private static final Duration GRANT_TTL = Duration.ofMinutes(10);
  private static final Duration RESET_LEASE = Duration.ofSeconds(15);
  private static final Duration RESET_DEADLINE = Duration.ofMinutes(3);
  private static final Duration RATE_WINDOW = Duration.ofHours(1);
  private static final int PHONE_LIMIT = 3;
  private static final int IP_LIMIT = 20;
  private final CustomerProfileStore profiles;
  private final AccountRecoveryStore attempts;
  private final SmsSender sender;
  private final Clock clock;
  private final byte[] hmacSecret;
  private final boolean accountsEnabled;

  @Autowired
  public AccountRecoveryService(
      CustomerProfileStore profiles,
      AccountRecoveryStore attempts,
      SmsSender sender,
      Clock clock,
      @Value("${customer.verification-hmac-secret:}") String secret,
      @Value("${customer.accounts-enabled:false}") boolean accountsEnabled) {
    this.profiles = profiles;
    this.attempts = attempts;
    this.sender = sender;
    this.clock = clock;
    this.hmacSecret = secret.getBytes(StandardCharsets.UTF_8);
    this.accountsEnabled = accountsEnabled;
  }

  public AccountRecoveryService(
      CustomerProfileStore profiles,
      AccountRecoveryStore attempts,
      SmsSender sender,
      Clock clock,
      String secret,
      Supplier<String> ignoredGrantSupplier) {
    this(profiles, attempts, sender, clock, secret, ignoredGrantSupplier, true);
  }

  AccountRecoveryService(
      CustomerProfileStore profiles,
      AccountRecoveryStore attempts,
      SmsSender sender,
      Clock clock,
      String secret,
      Supplier<String> ignoredGrantSupplier,
      boolean accountsEnabled) {
    this.profiles = profiles;
    this.attempts = attempts;
    this.sender = sender;
    this.clock = clock;
    this.hmacSecret = secret.getBytes(StandardCharsets.UTF_8);
    this.accountsEnabled = accountsEnabled;
  }

  @Transactional(noRollbackFor = ResponseStatusException.class)
  public RecoveryStartResult startUsernameRecovery(
      UsernameRecoveryRequest request, String ipAddress, String idempotencyKey) {
    requireConfigured();
    var phone = normalizePhone(request.phone());
    var locale = locale(request.locale());
    var now = clock.instant();
    var phoneFingerprint = hmac("phone:" + phone);
    var ipFingerprint = hmac("ip:" + safeIp(ipAddress));
    var idempotencyHash = hmac("idempotency:" + requireIdempotencyKey(idempotencyKey));
    attempts.acquireRecoveryRateLimitLocks(
        "username", phoneFingerprint, ipFingerprint, idempotencyHash);
    var existing = attempts.findRecoveryByIdempotencyHash(idempotencyHash);
    if (existing != null) {
      if (!"username".equals(existing.purpose())
          || !phoneFingerprint.equals(existing.phoneFingerprint())
          || !ipFingerprint.equals(existing.ipFingerprint())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was already used");
      }
      return usernameStartResult(locale);
    }
    enforceRateLimit("username", phoneFingerprint, ipFingerprint, now);

    var profile = profiles.findByPhone(phone);
    var recoverable = profile != null && "active".equals(profile.status())
        && profile.loginName() != null && !profile.loginName().isBlank();
    var id = UUID.randomUUID();
    attempts.createRecovery(new AccountRecoveryAttempt(
        id, "username", recoverable ? profile.customerId() : null,
        recoverable ? profile.loginName() : "", phoneFingerprint, ipFingerprint,
        idempotencyHash, locale, recoverable ? "pending" : "decoy", "", 0, "", null,
        null, now.plus(ATTEMPT_TTL), "", null, null, null, "", "", null, null, now
    ));
    return usernameStartResult(locale);
  }

  @Transactional(noRollbackFor = {ResponseStatusException.class, AccountRecoveryException.class})
  public RecoveryStartResult startPasswordRecovery(
      PasswordRecoveryRequest request, String ipAddress, String idempotencyKey) {
    requireConfigured();
    var loginName = normalizeLoginName(request.loginName());
    var phone = normalizePhone(request.phone());
    var locale = locale(request.locale());
    var now = clock.instant();
    var phoneFingerprint = hmac("phone:" + phone);
    var ipFingerprint = hmac("ip:" + safeIp(ipAddress));
    var idempotencyHash = hmac("idempotency:" + requireIdempotencyKey(idempotencyKey));
    attempts.acquireRecoveryRateLimitLocks(
        "password", phoneFingerprint, ipFingerprint, idempotencyHash);
    var existing = attempts.findRecoveryByIdempotencyHash(idempotencyHash);
    if (existing != null) {
      if (!"password".equals(existing.purpose())
          || !phoneFingerprint.equals(existing.phoneFingerprint())
          || !ipFingerprint.equals(existing.ipFingerprint())
          || !loginName.equals(existing.loginName())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was already used");
      }
      return passwordStartResult(existing.id(), existing.expiresAt(), locale);
    }
    enforceRateLimit("password", phoneFingerprint, ipFingerprint, now);

    var profile = profiles.findByPhone(phone);
    var recoverable = profile != null && "active".equals(profile.status())
        && loginName.equals(profile.loginName());
    var id = UUID.randomUUID();
    var expiresAt = now.plus(ATTEMPT_TTL);
    attempts.createRecovery(new AccountRecoveryAttempt(
        id, "password", recoverable ? profile.customerId() : null, loginName,
        phoneFingerprint, ipFingerprint, idempotencyHash, locale,
        recoverable ? "pending" : "decoy", "", 0, "", null, null, expiresAt,
        "", null, null, null, "", "", null, null, now
    ));
    return passwordStartResult(id, expiresAt, locale);
  }

  @Transactional(noRollbackFor = AccountRecoveryException.class)
  public IssuedRecoveryGrant completePasswordRecovery(
      UUID id, String code, String idempotencyKey) {
    requireConfigured();
    if (code == null || !code.matches("\\d{6}")) throw invalidRecovery();
    var completionKey = requireIdempotencyKey(idempotencyKey);
    var grant = recoveryGrant(id, completionKey);
    var grantHash = hmac("grant:" + grant);
    var attempt = attempts.findRecovery(id);
    var now = clock.instant();
    if (attempt == null || !"password".equals(attempt.purpose())
        || attempt.customerId() == null
        || !MessageDigest.isEqual(
            attempt.challengeHash().getBytes(StandardCharsets.UTF_8),
            challengeHash(id, code).getBytes(StandardCharsets.UTF_8))) {
      if (attempt != null && "password".equals(attempt.purpose())) {
        attempts.recordRecoveryFailedAttempt(id, now);
      }
      throw invalidRecovery();
    }
    if (isMatchingVerifiedCompletion(attempt, grantHash, now)) {
      return new IssuedRecoveryGrant(grant, attempt.grantExpiresAt());
    }
    if (!"sent".equals(attempt.status()) || attempt.attemptCount() >= 5
        || !attempt.expiresAt().isAfter(now)) {
      throw invalidRecovery();
    }
    var grantExpiresAt = now.plus(GRANT_TTL);
    if (!attempts.markRecoveryVerified(id, grantHash, grantExpiresAt, now)) {
      var concurrent = attempts.findRecovery(id);
      if (isMatchingVerifiedCompletion(concurrent, grantHash, now)) {
        return new IssuedRecoveryGrant(grant, concurrent.grantExpiresAt());
      }
      throw invalidRecovery();
    }
    return new IssuedRecoveryGrant(grant, grantExpiresAt);
  }

  private boolean isMatchingVerifiedCompletion(
      AccountRecoveryAttempt attempt, String grantHash, Instant now) {
    return attempt != null && "verified".equals(attempt.status())
        && attempt.grantExpiresAt() != null && attempt.grantExpiresAt().isAfter(now)
        && MessageDigest.isEqual(
            attempt.grantHash().getBytes(StandardCharsets.UTF_8),
            grantHash.getBytes(StandardCharsets.UTF_8));
  }

  @Transactional(noRollbackFor = AccountRecoveryException.class)
  public PasswordRecoveryReservation reservePasswordRecovery(
      String grant, String requestedLoginName, String operationKey) {
    requireConfigured();
    var loginName = normalizeLoginName(requestedLoginName);
    var grantHash = hmac("grant:" + required(grant));
    var operationHash = hmac("reset-operation:" + requireIdempotencyKey(operationKey));
    attempts.acquireRecoveryGrantLock(grantHash);
    var attempt = attempts.findRecoveryByGrantHash(grantHash);
    var now = clock.instant();
    if (attempt == null || !"password".equals(attempt.purpose()) || attempt.customerId() == null
        || !loginName.equals(attempt.loginName())) {
      throw invalidRecovery();
    }
    if ("consumed".equals(attempt.status())
        && operationHash.equals(attempt.resetOperationHash())) {
      return new PasswordRecoveryReservation("completed", "sessions_invalidated");
    }
    if ("resetting".equals(attempt.status())) {
      if (!operationHash.equals(attempt.resetOperationHash())
          || attempt.resetDeadlineAt() == null || !attempt.resetDeadlineAt().isAfter(now)
          || !attempts.isRecoveryAccountActive(attempt.id(), loginName, now)) {
        throw invalidRecovery();
      }
      if (attempt.resetLeaseExpiresAt() != null && attempt.resetLeaseExpiresAt().isAfter(now)) {
        return new PasswordRecoveryReservation("in_progress", attempt.resetStage());
      }
      if (!attempts.renewRecoveryResetting(
          attempt.id(), loginName, operationHash, now.plus(RESET_LEASE), now)) {
        throw invalidRecovery();
      }
      return new PasswordRecoveryReservation("acquired", attempt.resetStage());
    }
    if (!"verified".equals(attempt.status()) || attempt.grantExpiresAt() == null
        || !attempt.grantExpiresAt().isAfter(now)
        || !attempts.markRecoveryResetting(
            attempt.id(), loginName, operationHash, now.plus(RESET_LEASE),
            now.plus(RESET_DEADLINE), now)) {
      throw invalidRecovery();
    }
    return new PasswordRecoveryReservation("acquired", "reserved");
  }

  @Transactional(noRollbackFor = AccountRecoveryException.class)
  public void invalidatePasswordRecoverySessions(
      String grant, String requestedLoginName, String operationKey) {
    requireConfigured();
    var loginName = normalizeLoginName(requestedLoginName);
    var grantHash = hmac("grant:" + required(grant));
    var operationHash = hmac("reset-operation:" + requireIdempotencyKey(operationKey));
    attempts.acquireRecoveryGrantLock(grantHash);
    var attempt = attempts.findRecoveryByGrantHash(grantHash);
    var now = clock.instant();
    if (attempt == null || !"password".equals(attempt.purpose())
        || !"resetting".equals(attempt.status()) || attempt.customerId() == null
        || !loginName.equals(attempt.loginName())
        || !operationHash.equals(attempt.resetOperationHash())) {
      throw invalidRecovery();
    }
    if ("sessions_invalidated".equals(attempt.resetStage())) return;
    if (!"reserved".equals(attempt.resetStage())
        || !attempts.markRecoverySessionsInvalidated(
            attempt.id(), operationHash, now.plus(RESET_LEASE), now)) {
      throw invalidRecovery();
    }
  }

  @Transactional(noRollbackFor = AccountRecoveryException.class)
  public void completePasswordReset(
      String grant, String requestedLoginName, String operationKey) {
    requireConfigured();
    var loginName = normalizeLoginName(requestedLoginName);
    var grantHash = hmac("grant:" + required(grant));
    var operationHash = hmac("reset-operation:" + requireIdempotencyKey(operationKey));
    attempts.acquireRecoveryGrantLock(grantHash);
    var attempt = attempts.findRecoveryByGrantHash(grantHash);
    var now = clock.instant();
    if (attempt == null || !"password".equals(attempt.purpose())
        || !"resetting".equals(attempt.status()) || attempt.customerId() == null
        || !loginName.equals(attempt.loginName())
        || !operationHash.equals(attempt.resetOperationHash())
        || !attempts.markRecoveryResetCompleted(attempt.id(), operationHash, now)) {
      throw invalidRecovery();
    }
    profiles.recordAudit(attempt.customerId(), "password_reset_completed", "account-recovery");
  }

  @Transactional(noRollbackFor = AccountRecoveryException.class)
  public void releasePasswordReset(
      String grant, String requestedLoginName, String operationKey) {
    requireConfigured();
    var loginName = normalizeLoginName(requestedLoginName);
    var grantHash = hmac("grant:" + required(grant));
    var operationHash = hmac("reset-operation:" + requireIdempotencyKey(operationKey));
    attempts.acquireRecoveryGrantLock(grantHash);
    var attempt = attempts.findRecoveryByGrantHash(grantHash);
    if (attempt == null || !"resetting".equals(attempt.status())
        || !loginName.equals(attempt.loginName())
        || !operationHash.equals(attempt.resetOperationHash())
        || !attempts.releaseRecoveryReset(attempt.id(), operationHash, clock.instant())) {
      throw invalidRecovery();
    }
  }

  private RecoveryStartResult usernameStartResult(String locale) {
    return new RecoveryStartResult(
        null,
        null,
        "en".equals(locale)
            ? "If an account exists, its username was sent by SMS."
            : "가입된 계정이 있으면 아이디를 문자로 전송했습니다."
    );
  }

  private RecoveryStartResult passwordStartResult(UUID id, Instant expiresAt, String locale) {
    return new RecoveryStartResult(
        id,
        expiresAt,
        "en".equals(locale)
            ? "If the account details match, a verification code was sent by SMS."
            : "계정 정보가 일치하면 인증번호를 문자로 전송했습니다."
    );
  }

  private void enforceRateLimit(
      String purpose, String phoneFingerprint, String ipFingerprint, Instant now) {
    if (attempts.countRecentRecoveryForPhone(
        purpose, phoneFingerprint, now.minus(RATE_WINDOW)) >= PHONE_LIMIT
        || attempts.countRecentRecoveryForIp(
        purpose, ipFingerprint, now.minus(RATE_WINDOW)) >= IP_LIMIT) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many recovery requests");
    }
  }

  private void requireConfigured() {
    if (!accountsEnabled || hmacSecret.length < 24 || !sender.isConfigured()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Account recovery is not configured");
    }
  }

  private String normalizePhone(String input) {
    var value = required(input).replaceAll("[^0-9+]", "");
    if (value.startsWith("010")) value = "+82" + value.substring(1);
    if (!value.matches("^\\+8210\\d{8}$")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Korean mobile number is required");
    }
    return value;
  }

  private String challengeHash(UUID id, String code) {
    return hmac(id + ":" + code);
  }

  private String hmac(String value) {
    return HexFormat.of().formatHex(hmacBytes(value));
  }

  private byte[] hmacBytes(String value) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
      return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private String recoveryGrant(UUID id, String completionKey) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(
        hmacBytes("recovery-grant:" + id + ":" + completionKey));
  }

  private String required(String value) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required field is missing");
    }
    return value.trim();
  }

  private String requireIdempotencyKey(String value) {
    var key = value == null ? "" : value.trim();
    if (key.length() < 16 || key.length() > 200) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid Idempotency-Key is required");
    }
    return key;
  }

  private String safeIp(String value) {
    return value == null || value.isBlank() ? "unknown" : value.trim();
  }

  private String locale(String value) {
    return "en".equals(value) ? "en" : "ko";
  }

  private String normalizeLoginName(String value) {
    try {
      return LoginNamePolicy.normalize(value);
    } catch (RegistrationGrantException error) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid login name is required");
    }
  }

  private AccountRecoveryException invalidRecovery() {
    return new AccountRecoveryException(
        "invalid_recovery", "Password recovery code or grant is invalid or expired");
  }

  public record UsernameRecoveryRequest(String phone, String locale) {}

  public record PasswordRecoveryRequest(String loginName, String phone, String locale) {}

  public record RecoveryStartResult(UUID verificationId, Instant expiresAt, String message) {}

  public record IssuedRecoveryGrant(String grant, Instant expiresAt) {}

  public record PasswordRecoveryReservation(String state, String stage) {}
}
