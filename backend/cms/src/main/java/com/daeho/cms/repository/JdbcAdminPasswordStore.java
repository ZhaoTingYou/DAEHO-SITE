package com.daeho.cms.repository;

import com.daeho.cms.service.AdminPasswordRecord;
import com.daeho.cms.service.AdminPasswordStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAdminPasswordStore implements AdminPasswordStore {
  private static final String PASSWORD_KEY = "admin_password_hash";

  private final JdbcTemplate jdbc;

  public JdbcAdminPasswordStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public Optional<AdminPasswordRecord> findPasswordRecord() {
    return jdbc.query(
        "SELECT setting_value, updated_at FROM cms_admin_settings WHERE setting_key = ?",
        this::mapRecord,
        PASSWORD_KEY
    ).stream().findFirst();
  }

  @Override
  public void savePasswordHash(String passwordHash) {
    jdbc.update("""
        INSERT INTO cms_admin_settings (setting_key, setting_value, created_at, updated_at)
        VALUES (?, ?, now(), now())
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = now()
        """,
        PASSWORD_KEY,
        passwordHash
    );
  }

  private AdminPasswordRecord mapRecord(ResultSet rs, int rowNum) throws SQLException {
    return new AdminPasswordRecord(
        rs.getString("setting_value"),
        rs.getObject("updated_at", java.time.OffsetDateTime.class).toInstant()
    );
  }
}
