package com.daeho.customer.service;

import com.daeho.customer.repository.VerificationSessionStore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
public class RegistrationGrantService {
  private static final Duration GRANT_TTL = Duration.ofMinutes(15);
  private final VerificationSessionStore store;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();
  private final byte[] hmacSecret;

  @Autowired
  public RegistrationGrantService(VerificationSessionStore store, Clock clock,
      @Value("${customer.verification-hmac-secret:}") String secret) {
    this.store = store;
    this.clock = clock;
    this.hmacSecret = secret.getBytes(StandardCharsets.UTF_8);
  }

  public RegistrationGrantService(VerificationSessionStore store, Clock clock) {
    this(store, clock, "test-verification-secret-at-least-24-chars");
  }

  public IssuedGrant issue(VerificationSession session) {
    if (!"verified".equals(session.status()) || !session.adultVerified()) {
      throw new RegistrationGrantException("Identity verification is incomplete");
    }
    var raw = new byte[32];
    random.nextBytes(raw);
    var grant = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    var requestedExpiry = clock.instant().plus(GRANT_TTL);
    var expiry = session.expiresAt().isBefore(requestedExpiry) ? session.expiresAt() : requestedExpiry;
    store.save(session.withGrant(hash(grant), expiry));
    return new IssuedGrant(grant, expiry);
  }

  public VerificationSession consumeForSignup(
      String grant, String userPoolId, String clientId, String username) {
    var pool = requireBindingValue(userPoolId);
    var client = requireBindingValue(clientId);
    var login = requireBindingValue(username);
    var session = requireValidGrant(grant);
    var grantHash = hash(grant);
    var now = clock.instant();
    if (!store.bindGrant(session.id(), grantHash, pool, client, login, now)) {
      throw new RegistrationGrantException("Registration grant is invalid or bound to another signup");
    }
    var bound = requireGrant(grant, true);
    if (!pool.equals(bound.signupUserPoolId()) || !client.equals(bound.signupClientId())
        || !login.equals(bound.signupUsername())) {
      throw new RegistrationGrantException("Registration grant is invalid or bound to another signup");
    }
    return bound;
  }

  public VerificationSession requireConsumedForProvisioning(
      String grant, String phone, String username) {
    if (phone == null || !phone.matches("^\\+8210\\d{8}$")) {
      throw new RegistrationGrantException("A verified Korean phone is required");
    }
    var session = requireGrant(grant, true);
    var samePhone = phone.equals(session.phone())
        || phoneFingerprint(phone).equals(session.ciFingerprint());
    if (!samePhone || !username.equals(session.signupUsername())) {
      throw new RegistrationGrantException("Registration grant does not match this account");
    }
    return session.withPhone(phone);
  }

  public void consumeProvisioningReceipt(UUID id) { store.delete(id); }

  private String phoneFingerprint(String phone) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
      return java.util.HexFormat.of().formatHex(mac.doFinal(("phone:" + phone).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) { throw new IllegalStateException(error); }
  }

  private VerificationSession requireGrant(String grant, boolean mustBeConsumed) {
    var session = requireValidGrant(grant);
    if (mustBeConsumed ? session.consumedAt() == null : session.consumedAt() != null) {
      throw new RegistrationGrantException("Registration grant is invalid or expired");
    }
    return session;
  }

  private VerificationSession requireValidGrant(String grant) {
    if (grant == null || grant.isBlank()) {
      throw new RegistrationGrantException("Registration grant is required");
    }
    var grantHash = hash(grant);
    var session = store.findByGrantHash(grantHash);
    var now = clock.instant();
    if (session == null || session.grantExpiresAt() == null
        || !session.grantExpiresAt().isAfter(now) || !"verified".equals(session.status())
        || !session.adultVerified()) {
      throw new RegistrationGrantException("Registration grant is invalid or expired");
    }
    return session;
  }

  private String requireBindingValue(String value) {
    var normalized = value == null ? "" : value.trim();
    if (normalized.isBlank() || normalized.length() > 256) {
      throw new RegistrationGrantException("Registration binding is invalid");
    }
    return normalized;
  }

  private String hash(String value) {
    try {
      return java.util.HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
      );
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException(error);
    }
  }

  public record IssuedGrant(String grant, Instant expiresAt) {}
}
