package com.daeho.customer.service;

import java.time.Instant;
import java.util.UUID;

public record VerificationSession(
    UUID id,
    String method,
    String identifier,
    String legalName,
    String phone,
    String ciFingerprint,
    boolean adultVerified,
    String locale,
    String termsVersion,
    String privacyVersion,
    boolean marketingConsent,
    String status,
    String grantHash,
    Instant grantExpiresAt,
    Instant expiresAt,
    Instant consumedAt,
    String signupUserPoolId,
    String signupClientId,
    String signupUsername
) {
  public VerificationSession withGrant(String hash, Instant expiresAt) {
    return new VerificationSession(
        id, method, identifier, legalName, phone, ciFingerprint, adultVerified, locale,
        termsVersion, privacyVersion, marketingConsent, status, hash, expiresAt,
        this.expiresAt, consumedAt, signupUserPoolId, signupClientId, signupUsername
    );
  }

  public VerificationSession withSignupBinding(
      String userPoolId, String clientId, String username, Instant consumedAt) {
    return new VerificationSession(
        id, method, identifier, legalName, phone, ciFingerprint, adultVerified, locale,
        termsVersion, privacyVersion, marketingConsent, status, grantHash, grantExpiresAt,
        expiresAt, consumedAt, userPoolId, clientId, username
    );
  }

  public VerificationSession withPhone(String value) {
    return new VerificationSession(id, method, identifier, legalName, value, ciFingerprint,
        adultVerified, locale, termsVersion, privacyVersion, marketingConsent, status,
        grantHash, grantExpiresAt, expiresAt, consumedAt,
        signupUserPoolId, signupClientId, signupUsername);
  }
}
