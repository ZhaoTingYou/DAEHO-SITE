package com.daeho.cms.service;

import java.time.Instant;

public record AdminPasswordRecord(String passwordHash, Instant updatedAt) {
}
