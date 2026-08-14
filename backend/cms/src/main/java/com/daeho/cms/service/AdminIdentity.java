package com.daeho.cms.service;

import java.time.Instant;

public record AdminIdentity(
    String id,
    String email,
    String role,
    long sessionVersion,
    Instant expiresAt,
    boolean mustChangePassword
) {
}
