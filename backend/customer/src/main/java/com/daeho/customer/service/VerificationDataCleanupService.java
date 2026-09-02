package com.daeho.customer.service;

import java.time.Clock;
import java.time.Duration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class VerificationDataCleanupService {
  private static final Duration RETENTION_AFTER_EXPIRY = Duration.ofDays(7);
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public VerificationDataCleanupService(JdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Scheduled(cron = "0 40 3 * * *", zone = "UTC")
  public void purgeExpiredVerificationData() {
    var cutoff = clock.instant().minus(RETENTION_AFTER_EXPIRY);
    jdbc.update("DELETE FROM verification_sessions WHERE expires_at < ? AND consumed_at IS NULL", cutoff);
    jdbc.update("""
        UPDATE verification_sessions SET identifier = '', phone = '', legal_name = '',
          challenge_hash = '', ip_fingerprint = '', idempotency_key_hash = '',
          provider_message_id = '', updated_at = now()
        WHERE expires_at < ? AND consumed_at IS NOT NULL
        """, cutoff);
  }
}
