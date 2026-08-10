package com.daeho.cms.repository;

import com.daeho.cms.service.AdminUserRecord;
import com.daeho.cms.service.AdminUserStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAdminUserStore implements AdminUserStore {
  private static final String SELECT_COLUMNS = """
      id, email, password_hash, role, status, expires_at, must_change_password,
      session_version, last_login_at, created_at, updated_at
      """;

  private final JdbcTemplate jdbc;

  public JdbcAdminUserStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public Optional<AdminUserRecord> findByEmail(String email) {
    var normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM cms_admin_users WHERE email = ?",
        this::mapUser,
        normalizedEmail
    ).stream().findFirst();
  }

  @Override
  public Optional<AdminUserRecord> findById(String id) {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM cms_admin_users WHERE id = ?",
        this::mapUser,
        id
    ).stream().findFirst();
  }

  @Override
  public List<AdminUserRecord> listUsers() {
    return jdbc.query(
        "SELECT " + SELECT_COLUMNS + " FROM cms_admin_users ORDER BY created_at ASC",
        this::mapUser,
        new Object[0]
    );
  }

  @Override
  public long countOwners() {
    var count = jdbc.queryForObject(
        "SELECT COUNT(*) FROM cms_admin_users WHERE role = 'OWNER'",
        Long.class,
        new Object[0]
    );
    return count == null ? 0L : count;
  }

  @Override
  public long countActiveOwners() {
    var count = jdbc.queryForObject(
        "SELECT COUNT(*) FROM cms_admin_users WHERE role = 'OWNER' AND status = 'active'",
        Long.class,
        new Object[0]
    );
    return count == null ? 0L : count;
  }

  @Override
  public void create(AdminUserRecord user) {
    jdbc.update("""
        INSERT INTO cms_admin_users (
          id, email, password_hash, role, status, expires_at, must_change_password,
          session_version, last_login_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        user.id(),
        normalizeEmail(user.email()),
        user.passwordHash(),
        user.role(),
        user.status(),
        databaseTime(user.expiresAt()),
        user.mustChangePassword(),
        user.sessionVersion(),
        databaseTime(user.lastLoginAt()),
        databaseTime(user.createdAt()),
        databaseTime(user.updatedAt())
    );
  }

  @Override
  public void updateLastLogin(String id, Instant loggedInAt) {
    jdbc.update(
        "UPDATE cms_admin_users SET last_login_at = ?, updated_at = now() WHERE id = ?",
        databaseTime(loggedInAt),
        id
    );
  }

  @Override
  public void updatePassword(String id, String passwordHash, boolean mustChangePassword) {
    jdbc.update("""
        UPDATE cms_admin_users SET
          password_hash = ?,
          must_change_password = ?,
          session_version = session_version + 1,
          updated_at = now()
        WHERE id = ?
        """,
        passwordHash,
        mustChangePassword,
        id
    );
  }

  @Override
  public void updateStatus(String id, String status) {
    jdbc.update("""
        UPDATE cms_admin_users SET
          status = ?,
          session_version = session_version + 1,
          updated_at = now()
        WHERE id = ?
        """,
        status,
        id
    );
  }

  @Override
  public void updateExpiration(String id, Instant expiresAt) {
    jdbc.update("""
        UPDATE cms_admin_users SET
          expires_at = ?,
          session_version = session_version + 1,
          updated_at = now()
        WHERE id = ?
        """,
        databaseTime(expiresAt),
        id
    );
  }

  private AdminUserRecord mapUser(ResultSet rs, int rowNum) throws SQLException {
    return new AdminUserRecord(
        rs.getString("id"),
        rs.getString("email"),
        rs.getString("password_hash"),
        rs.getString("role"),
        rs.getString("status"),
        instant(rs, "expires_at"),
        rs.getBoolean("must_change_password"),
        rs.getLong("session_version"),
        instant(rs, "last_login_at"),
        instant(rs, "created_at"),
        instant(rs, "updated_at")
    );
  }

  private Instant instant(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? null : value.toInstant();
  }

  private OffsetDateTime databaseTime(Instant value) {
    return value == null ? null : OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }
}
