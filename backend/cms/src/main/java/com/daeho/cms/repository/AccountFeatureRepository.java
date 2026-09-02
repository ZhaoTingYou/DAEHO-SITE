package com.daeho.cms.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AccountFeatureRepository {
  private final JdbcTemplate jdbc;

  public AccountFeatureRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Settings get() {
    return jdbc.query("""
        SELECT customer_accounts_enabled, inquiry_account_required, updated_by, updated_at
        FROM cms_account_feature_settings
        WHERE id = 'global'
        """, this::mapSettings).stream().findFirst().orElseGet(Settings::disabled);
  }

  @Transactional
  public Settings update(boolean customerAccountsEnabled, boolean inquiryAccountRequired, String actor) {
    jdbc.update("""
        INSERT INTO cms_account_feature_settings (
          id, customer_accounts_enabled, inquiry_account_required, updated_by, created_at, updated_at
        ) VALUES ('global', ?, ?, ?, now(), now())
        ON CONFLICT (id) DO UPDATE SET
          customer_accounts_enabled = excluded.customer_accounts_enabled,
          inquiry_account_required = excluded.inquiry_account_required,
          updated_by = excluded.updated_by,
          updated_at = now()
        """, customerAccountsEnabled, inquiryAccountRequired, actor);
    jdbc.update("""
        INSERT INTO cms_account_feature_events (
          id, customer_accounts_enabled, inquiry_account_required, actor, created_at
        ) VALUES (?, ?, ?, ?, now())
        """, UUID.randomUUID(), customerAccountsEnabled, inquiryAccountRequired, actor);
    return get();
  }

  private Settings mapSettings(ResultSet rs, int rowNumber) throws SQLException {
    return new Settings(
        rs.getBoolean("customer_accounts_enabled"),
        rs.getBoolean("inquiry_account_required"),
        rs.getString("updated_by"),
        rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );
  }

  public record Settings(
      boolean customerAccountsEnabled,
      boolean inquiryAccountRequired,
      String updatedBy,
      Instant updatedAt
  ) {
    public static Settings disabled() {
      return new Settings(false, false, "", Instant.EPOCH);
    }
  }
}
