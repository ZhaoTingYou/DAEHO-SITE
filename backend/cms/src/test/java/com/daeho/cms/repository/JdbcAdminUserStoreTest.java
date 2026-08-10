package com.daeho.cms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.service.AdminUserRecord;
import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcAdminUserStoreTest {
  private static final Instant NOW = Instant.parse("2026-08-10T01:00:00Z");
  private static final Instant EXPIRY = Instant.parse("2026-09-09T01:00:00Z");

  @Test
  void normalizesEmailAndMapsEveryStoredColumn() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.rows = List.of(ownerRow());
    var store = new JdbcAdminUserStore(jdbc);

    var owner = store.findByEmail("  OWNER@EXAMPLE.COM ").orElseThrow();

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("FROM cms_admin_users"));
    assertTrue(call.sql().contains("WHERE email = ?"));
    assertEquals(List.of("owner@example.com"), Arrays.asList(call.args()));
    assertEquals("owner-1", owner.id());
    assertEquals("owner@example.com", owner.email());
    assertEquals("stored-hash", owner.passwordHash());
    assertEquals("OWNER", owner.role());
    assertEquals("active", owner.status());
    assertNull(owner.expiresAt());
    assertEquals(7L, owner.sessionVersion());
    assertEquals(NOW, owner.lastLoginAt());
    assertEquals(NOW.minusSeconds(60), owner.createdAt());
    assertEquals(NOW, owner.updatedAt());
  }

  @Test
  void insertsUsersWithParameterizedValues() {
    var jdbc = new RecordingJdbcTemplate();
    var store = new JdbcAdminUserStore(jdbc);
    var user = new AdminUserRecord(
        "editor-1",
        "editor@example.com",
        "secret-hash",
        "EDITOR",
        "active",
        EXPIRY,
        true,
        1L,
        null,
        NOW,
        NOW
    );

    store.create(user);

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("INSERT INTO cms_admin_users"));
    assertTrue(call.sql().contains("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"));
    assertTrue(!call.sql().contains("editor@example.com"));
    assertEquals(
        Arrays.asList("editor-1", "editor@example.com", "secret-hash", "EDITOR", "active", databaseTime(EXPIRY),
            true, 1L, null, databaseTime(NOW), databaseTime(NOW)),
        Arrays.asList(call.args())
    );
  }

  @Test
  void securitySensitiveUpdatesIncrementSessionVersion() {
    var jdbc = new RecordingJdbcTemplate();
    var store = new JdbcAdminUserStore(jdbc);

    store.updatePassword("editor-1", "new-hash", false);
    store.updateStatus("editor-1", "disabled");
    store.updateExpiration("editor-1", EXPIRY);
    store.updateLastLogin("editor-1", NOW);

    var password = jdbc.calls.get(0);
    assertTrue(password.sql().contains("password_hash = ?"));
    assertTrue(password.sql().contains("must_change_password = ?"));
    assertTrue(password.sql().contains("session_version = session_version + 1"));
    assertTrue(password.sql().contains("updated_at = now()"));
    assertEquals(List.of("new-hash", false, "editor-1"), Arrays.asList(password.args()));

    var status = jdbc.calls.get(1);
    assertTrue(status.sql().contains("status = ?"));
    assertTrue(status.sql().contains("session_version = session_version + 1"));
    assertEquals(List.of("disabled", "editor-1"), Arrays.asList(status.args()));

    var expiration = jdbc.calls.get(2);
    assertTrue(expiration.sql().contains("expires_at = ?"));
    assertTrue(expiration.sql().contains("session_version = session_version + 1"));
    assertEquals(List.of(databaseTime(EXPIRY), "editor-1"), Arrays.asList(expiration.args()));

    var lastLogin = jdbc.calls.get(3);
    assertTrue(lastLogin.sql().contains("last_login_at = ?"));
    assertTrue(!lastLogin.sql().contains("session_version = session_version + 1"));
    assertEquals(List.of(databaseTime(NOW), "editor-1"), Arrays.asList(lastLogin.args()));
  }

  @Test
  void listsUsersAndCountsOwnerStatesWithoutSelectingExtraColumns() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.rows = List.of(ownerRow());
    jdbc.counts = List.of(1L, 1L);
    var store = new JdbcAdminUserStore(jdbc);

    var users = store.listUsers();
    var owners = store.countOwners();
    var activeOwners = store.countActiveOwners();

    assertEquals(1, users.size());
    assertEquals("stored-hash", users.get(0).passwordHash());
    assertTrue(jdbc.calls.get(0).sql().contains("ORDER BY created_at ASC"));
    assertEquals(1L, owners);
    assertEquals(1L, activeOwners);
    assertTrue(jdbc.calls.get(1).sql().contains("role = 'OWNER'"));
    assertTrue(jdbc.calls.get(2).sql().contains("role = 'OWNER' AND status = 'active'"));
  }

  private static Map<String, Object> ownerRow() {
    var row = new LinkedHashMap<String, Object>();
    row.put("id", "owner-1");
    row.put("email", "owner@example.com");
    row.put("password_hash", "stored-hash");
    row.put("role", "OWNER");
    row.put("status", "active");
    row.put("expires_at", null);
    row.put("must_change_password", false);
    row.put("session_version", 7L);
    row.put("last_login_at", OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
    row.put("created_at", OffsetDateTime.ofInstant(NOW.minusSeconds(60), ZoneOffset.UTC));
    row.put("updated_at", OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
    return row;
  }

  private static OffsetDateTime databaseTime(Instant value) {
    return OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
  }

  private static class RecordingJdbcTemplate extends JdbcTemplate {
    private final List<SqlCall> calls = new ArrayList<>();
    private List<Map<String, Object>> rows = List.of();
    private List<Long> counts = List.of();
    private int countIndex;

    @Override
    public int update(String sql, Object... args) {
      calls.add(new SqlCall(sql, args));
      return 1;
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
      calls.add(new SqlCall(sql, args));
      var mapped = new ArrayList<T>();
      for (var index = 0; index < rows.size(); index += 1) {
        try {
          mapped.add(rowMapper.mapRow(resultSet(rows.get(index)), index));
        } catch (java.sql.SQLException error) {
          throw new AssertionError(error);
        }
      }
      return mapped;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
      calls.add(new SqlCall(sql, args));
      return (T) counts.get(countIndex++);
    }
  }

  private static ResultSet resultSet(Map<String, Object> row) {
    return (ResultSet) Proxy.newProxyInstance(
        JdbcAdminUserStoreTest.class.getClassLoader(),
        new Class<?>[] {ResultSet.class},
        (proxy, method, args) -> {
          if ("getString".equals(method.getName()) || "getBoolean".equals(method.getName())
              || "getLong".equals(method.getName()) || "getObject".equals(method.getName())) {
            var column = (String) args[0];
            if (!row.containsKey(column)) {
              throw new AssertionError("Unexpected SQL column: " + column);
            }
            return row.get(column);
          }
          if ("wasNull".equals(method.getName())) {
            return false;
          }
          throw new UnsupportedOperationException(method.getName());
        }
    );
  }

  private record SqlCall(String sql, Object[] args) {
  }
}
