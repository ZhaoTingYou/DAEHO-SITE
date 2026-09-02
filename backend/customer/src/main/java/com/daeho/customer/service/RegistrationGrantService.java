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
import org.springframework.stereotype.Service;

@Service
public class RegistrationGrantService {
  private static final Duration GRANT_TTL = Duration.ofMinutes(15);
  private final VerificationSessionStore store;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();

  public RegistrationGrantService(VerificationSessionStore store, Clock clock) {
    this.store = store;
    this.clock = clock;
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

  public VerificationSession consumeForSignup(String grant) {
    var session = requireGrant(grant, false);
    var grantHash = hash(grant);
    var now = clock.instant();
    if (!store.consumeGrant(session.id(), grantHash, now)) {
      throw new RegistrationGrantException("Registration grant has already been consumed");
    }
    return session.consumedAt(now);
  }

  public VerificationSession requireConsumedForProvisioning(String grant) {
    return requireGrant(grant, true);
  }

  public VerificationSession requireConsumedPhoneForProvisioning(String phone) {
    if (phone == null || !phone.matches("^\\+8210\\d{8}$")) {
      throw new RegistrationGrantException("A verified Korean phone is required");
    }
    var session = store.findLatestConsumedByPhone(phone);
    if (session == null || session.consumedAt() == null || !"verified".equals(session.status())
        || !session.adultVerified() || !phone.equals(session.phone())) {
      throw new RegistrationGrantException("No completed registration exists for this verified phone");
    }
    return session;
  }

  private VerificationSession requireGrant(String grant, boolean mustBeConsumed) {
    if (grant == null || grant.isBlank()) {
      throw new RegistrationGrantException("Registration grant is required");
    }
    var grantHash = hash(grant);
    var session = store.findByGrantHash(grantHash);
    var now = clock.instant();
    if (session == null || (mustBeConsumed ? session.consumedAt() == null : session.consumedAt() != null)
        || session.grantExpiresAt() == null
        || !session.grantExpiresAt().isAfter(now) || !"verified".equals(session.status())
        || !session.adultVerified()) {
      throw new RegistrationGrantException("Registration grant is invalid or expired");
    }
    return session;
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
