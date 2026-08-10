package com.daeho.cms.service;

import java.time.Instant;

public record AdminUserSummary(
    String id,
    String email,
    String role,
    String status,
    Instant expiresAt,
    boolean mustChangePassword,
    long sessionVersion,
    Instant lastLoginAt,
    Instant createdAt,
    Instant updatedAt
) {
}
