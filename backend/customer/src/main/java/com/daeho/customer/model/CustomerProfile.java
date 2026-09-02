package com.daeho.customer.model;

import java.time.Instant;
import java.util.UUID;

public record CustomerProfile(
    UUID customerId,
    String cognitoSubject,
    String loginName,
    String status,
    String legalName,
    String displayName,
    String phone,
    String email,
    String locale,
    String country,
    String organization,
    String team,
    String verificationMethod,
    Instant verifiedAt,
    boolean adultVerified,
    long sessionVersion,
    Instant sessionsValidAfter,
    Instant createdAt,
    Instant updatedAt
) {}
