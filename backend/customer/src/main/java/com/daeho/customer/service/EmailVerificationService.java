package com.daeho.customer.service;

import com.daeho.customer.repository.VerificationSessionStore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class EmailVerificationService {
  private static final Duration CHALLENGE_TTL = Duration.ofMinutes(10);
  private final JdbcTemplate jdbc;
  private final VerificationSessionStore sessions;
  private final RegistrationGrantService grants;
  private final JavaMailSender mailSender;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();
  private final String mode;
  private final String from;
  private final byte[] hmacSecret;
  private final boolean accountsEnabled;
  private final String termsVersion;
  private final String privacyVersion;

  public EmailVerificationService(
      JdbcTemplate jdbc,
      VerificationSessionStore sessions,
      RegistrationGrantService grants,
      JavaMailSender mailSender,
      Clock clock,
      @Value("${customer.email.mode:disabled}") String mode,
      @Value("${customer.email.from:}") String from,
      @Value("${customer.verification-hmac-secret:}") String hmacSecret,
      @Value("${customer.accounts-enabled:false}") boolean accountsEnabled,
      @Value("${customer.consent.terms-version:terms-2026-09}") String termsVersion,
      @Value("${customer.consent.privacy-version:privacy-2026-09}") String privacyVersion) {
    this.jdbc = jdbc;
    this.sessions = sessions;
    this.grants = grants;
    this.mailSender = mailSender;
    this.clock = clock;
    this.mode = mode;
    this.from = from;
    this.hmacSecret = hmacSecret.getBytes(StandardCharsets.UTF_8);
    this.accountsEnabled = accountsEnabled;
    this.termsVersion = termsVersion;
    this.privacyVersion = privacyVersion;
  }

  public EmailStartResult start(EmailStartRequest request) {
    if (!accountsEnabled || "disabled".equals(mode)) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email verification is not configured");
    }
    if (hmacSecret.length < 24) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verification secret is not configured");
    }
    var email = request.email() == null ? "" : request.email().trim().toLowerCase();
    if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") || request.birthDate() == null
        || !request.adultDeclaration() || !request.requiredConsent()
        || !AdultEligibility.isAdult(request.birthDate(), clock)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid adult verification details are required");
    }
    var id = UUID.randomUUID();
    var code = String.format("%06d", random.nextInt(1_000_000));
    var expiresAt = clock.instant().plus(CHALLENGE_TTL);
    jdbc.update("""
        INSERT INTO verification_sessions (
          id, method, identifier, adult_verified, locale, terms_version, privacy_version,
          marketing_consent, status, challenge_hash, expires_at, created_at, updated_at
        ) VALUES (?, 'email_declaration', ?, true, ?, ?, ?, ?, 'pending', ?, ?, now(), now())
        """, id, email, locale(request.locale()), required(termsVersion),
        required(privacyVersion), request.marketingConsent(), hmac(id, code), expiresAt);
    sendCode(email, code, request.locale());
    return new EmailStartResult(id, expiresAt, "log".equals(mode) ? code : null);
  }

  public RegistrationGrantService.IssuedGrant complete(UUID id, String code) {
    if (code == null || !code.matches("\\d{6}")) {
      throw invalidCode();
    }
    var rows = jdbc.queryForList("""
        SELECT identifier, locale, terms_version, privacy_version, marketing_consent,
          challenge_hash, attempt_count, expires_at, status
        FROM verification_sessions WHERE id = ?
        """, id);
    if (rows.isEmpty()) {
      throw invalidCode();
    }
    var row = rows.get(0);
    var expires = instant(row.get("expires_at"));
    var attempts = ((Number) row.get("attempt_count")).intValue();
    if (!"pending".equals(row.get("status")) || attempts >= 5 || !expires.isAfter(clock.instant())
        || !MessageDigest.isEqual(
            text(row.get("challenge_hash")).getBytes(StandardCharsets.UTF_8),
            hmac(id, code).getBytes(StandardCharsets.UTF_8))) {
      jdbc.update("UPDATE verification_sessions SET attempt_count = attempt_count + 1, updated_at = now() WHERE id = ?", id);
      throw invalidCode();
    }
    jdbc.update("UPDATE verification_sessions SET status = 'verified', challenge_hash = '', updated_at = now() WHERE id = ?", id);
    var verified = new VerificationSession(
        id, "email_declaration", text(row.get("identifier")), "", "", "", true,
        text(row.get("locale")), text(row.get("terms_version")), text(row.get("privacy_version")),
        Boolean.TRUE.equals(row.get("marketing_consent")), "verified", "", null, expires, null,
        "", "", ""
    );
    sessions.save(verified);
    return grants.issue(verified);
  }

  private void sendCode(String email, String code, String locale) {
    if ("log".equals(mode)) {
      return;
    }
    if (!"smtp".equals(mode) || from.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery is not configured");
    }
    var message = new SimpleMailMessage();
    message.setFrom(from);
    message.setTo(email);
    message.setSubject("en".equals(locale) ? "Your DAEHO verification code" : "DAEHO 이메일 인증번호");
    message.setText(("en".equals(locale) ? "Your verification code is " : "인증번호는 ") + code);
    mailSender.send(message);
  }

  private String hmac(UUID id, String code) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal((id + ":" + code).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private ResponseStatusException invalidCode() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is invalid or expired");
  }

  private String required(String value) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consent version is required");
    }
    return value.trim();
  }

  private String locale(String value) {
    return "en".equals(value) ? "en" : "ko";
  }

  private String text(Object value) {
    return value == null ? "" : value.toString();
  }

  private Instant instant(Object value) {
    if (value instanceof OffsetDateTime offset) {
      return offset.toInstant();
    }
    if (value instanceof java.sql.Timestamp timestamp) {
      return timestamp.toInstant();
    }
    throw new IllegalStateException("Verification expiry is missing");
  }

  public record EmailStartRequest(
      String email,
      LocalDate birthDate,
      boolean adultDeclaration,
      boolean requiredConsent,
      String locale,
      boolean marketingConsent
  ) {}

  public record EmailStartResult(UUID verificationId, Instant expiresAt, String developmentCode) {}
}
