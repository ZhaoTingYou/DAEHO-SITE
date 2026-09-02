package com.daeho.customer.service;

import com.daeho.customer.repository.SmsChallengeStore;
import com.daeho.customer.repository.VerificationSessionStore;
import com.daeho.customer.sms.SmsDeliveryException;
import com.daeho.customer.sms.SmsSender;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
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
public class SmsVerificationService {
  private static final Duration CHALLENGE_TTL = Duration.ofMinutes(10);
  private static final Duration RATE_WINDOW = Duration.ofHours(1);
  private static final int PHONE_LIMIT = 3;
  private static final int IP_LIMIT = 20;
  private final SmsChallengeStore challenges;
  private final VerificationSessionStore sessions;
  private final RegistrationGrantService grants;
  private final SmsSender sender;
  private final Clock clock;
  private final byte[] hmacSecret;
  private final Supplier<String> codeSupplier;
  private final String termsVersion;
  private final String privacyVersion;
  private final boolean accountsEnabled;

  @Autowired
  public SmsVerificationService(
      SmsChallengeStore challenges,
      VerificationSessionStore sessions,
      RegistrationGrantService grants,
      SmsSender sender,
      Clock clock,
      @Value("${customer.verification-hmac-secret:}") String secret,
      @Value("${customer.consent.terms-version:terms-2026-09}") String termsVersion,
      @Value("${customer.consent.privacy-version:privacy-2026-09}") String privacyVersion,
      @Value("${customer.accounts-enabled:false}") boolean accountsEnabled) {
    this(challenges, sessions, grants, sender, clock, secret, randomCodeSupplier(), termsVersion,
        privacyVersion, accountsEnabled);
  }

  public SmsVerificationService(
      SmsChallengeStore challenges,
      VerificationSessionStore sessions,
      RegistrationGrantService grants,
      SmsSender sender,
      Clock clock,
      String secret,
      Supplier<String> codeSupplier) {
    this(challenges, sessions, grants, sender, clock, secret, codeSupplier,
        "terms-2026-09", "privacy-2026-09", true);
  }

  SmsVerificationService(
      SmsChallengeStore challenges,
      VerificationSessionStore sessions,
      RegistrationGrantService grants,
      SmsSender sender,
      Clock clock,
      String secret,
      Supplier<String> codeSupplier,
      String termsVersion,
      String privacyVersion,
      boolean accountsEnabled) {
    this.challenges = challenges;
    this.sessions = sessions;
    this.grants = grants;
    this.sender = sender;
    this.clock = clock;
    this.hmacSecret = secret.getBytes(StandardCharsets.UTF_8);
    this.codeSupplier = codeSupplier;
    this.termsVersion = termsVersion;
    this.privacyVersion = privacyVersion;
    this.accountsEnabled = accountsEnabled;
  }

  @Transactional(noRollbackFor = ResponseStatusException.class)
  public SmsStartResult start(SmsStartRequest request, String ipAddress, String idempotencyKey) {
    requireConfigured();
    var phone = normalizePhone(request.phone());
    if (request.birthDate() == null || !request.adultDeclaration() || !request.requiredConsent()
        || !AdultEligibility.isAdult(request.birthDate(), clock)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adult and required consent declarations are required");
    }
    var now = clock.instant();
    var ipFingerprint = hmac("ip:" + safeIp(ipAddress));
    var idempotencyHash = hmac("idempotency:" + requireIdempotencyKey(idempotencyKey));
    challenges.acquireRateLimitLocks(phone, ipFingerprint, idempotencyHash);
    var existing = challenges.findByIdempotencyHash(idempotencyHash);
    if (existing != null) {
      if (!existing.phone().equals(phone) || !existing.ipFingerprint().equals(ipFingerprint)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was already used");
      }
      if ("pending".equals(existing.status()) && existing.sentAt() != null
          && existing.expiresAt().isAfter(now)) {
        return startResult(existing.id(), existing.expiresAt(), request.locale());
      }
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verification SMS could not be sent");
    }
    if (challenges.countRecentForPhone(phone, now.minus(RATE_WINDOW)) >= PHONE_LIMIT
        || challenges.countRecentForIp(ipFingerprint, now.minus(RATE_WINDOW)) >= IP_LIMIT) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many verification requests");
    }
    var id = UUID.randomUUID();
    var code = codeSupplier.get();
    if (code == null || !code.matches("\\d{6}")) {
      throw new IllegalStateException("SMS verification code generator returned an invalid value");
    }
    var expiresAt = now.plus(CHALLENGE_TTL);
    challenges.create(new SmsChallenge(
        id, phone, ipFingerprint, idempotencyHash, locale(request.locale()), required(termsVersion),
        required(privacyVersion), request.marketingConsent(), "pending",
        challengeHash(id, code), 0, "", null, expiresAt, now
    ));
    try {
      var receipt = sender.send(phone, message(code, request.locale()));
      challenges.markSent(id, receipt.providerMessageId(), now);
    } catch (SmsDeliveryException error) {
      challenges.markFailed(id, now);
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Verification SMS could not be sent"
      );
    }
    return startResult(id, expiresAt, request.locale());
  }

  private SmsStartResult startResult(UUID id, Instant expiresAt, String requestedLocale) {
    return new SmsStartResult(
        id, expiresAt,
        "en".equals(requestedLocale)
            ? "The verification code was sent by SMS."
            : "인증번호를 문자로 전송했습니다."
    );
  }

  public RegistrationGrantService.IssuedGrant complete(UUID id, String code) {
    if (code == null || !code.matches("\\d{6}")) {
      throw invalidCode();
    }
    var challenge = challenges.find(id);
    var now = clock.instant();
    if (challenge == null || challenge.sentAt() == null || !"pending".equals(challenge.status())
        || challenge.attemptCount() >= 5 || !challenge.expiresAt().isAfter(now)
        || !MessageDigest.isEqual(
            challenge.challengeHash().getBytes(StandardCharsets.UTF_8),
            challengeHash(id, code).getBytes(StandardCharsets.UTF_8))) {
      if (challenge != null) {
        challenges.recordFailedAttempt(id, now);
      }
      throw invalidCode();
    }
    if (!challenges.markVerified(id, now)) {
      throw invalidCode();
    }
    var verified = new VerificationSession(
        id, "sms_declaration", challenge.phone(), "", challenge.phone(), "", true,
        challenge.locale(), challenge.termsVersion(), challenge.privacyVersion(),
        challenge.marketingConsent(), "verified", "", null, challenge.expiresAt(), null
    );
    sessions.save(verified);
    return grants.issue(verified);
  }

  private void requireConfigured() {
    if (!accountsEnabled || hmacSecret.length < 24 || !sender.isConfigured()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMS verification is not configured");
    }
  }

  private String challengeHash(UUID id, String code) {
    return hmac(id + ":" + code);
  }

  private String hmac(String value) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private String normalizePhone(String input) {
    var value = required(input).replaceAll("[^0-9+]", "");
    if (value.startsWith("010")) {
      value = "+82" + value.substring(1);
    }
    if (!value.matches("^\\+8210\\d{8}$")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Korean mobile number is required");
    }
    return value;
  }

  private String required(String value) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required field is missing");
    }
    return value.trim();
  }

  private String safeIp(String value) {
    return value == null || value.isBlank() ? "unknown" : value.trim();
  }

  private String requireIdempotencyKey(String value) {
    var key = value == null ? "" : value.trim();
    if (key.length() < 16 || key.length() > 200) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid Idempotency-Key is required");
    }
    return key;
  }

  private String locale(String value) {
    return "en".equals(value) ? "en" : "ko";
  }

  private String message(String code, String locale) {
    return "en".equals(locale)
        ? "[DAEHO] Code %s (valid 10 min)".formatted(code)
        : "[DAEHO] 인증번호 %s (10분간 유효)".formatted(code);
  }

  private ResponseStatusException invalidCode() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is invalid or expired");
  }

  private static Supplier<String> randomCodeSupplier() {
    var random = new SecureRandom();
    return () -> String.format("%06d", random.nextInt(1_000_000));
  }

  public record SmsStartRequest(
      String phone,
      LocalDate birthDate,
      boolean adultDeclaration,
      boolean requiredConsent,
      String locale,
      boolean marketingConsent
  ) {}

  public record SmsStartResult(UUID verificationId, Instant expiresAt, String deliveryMessage) {}
}
