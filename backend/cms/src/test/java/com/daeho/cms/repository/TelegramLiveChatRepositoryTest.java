package com.daeho.cms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class TelegramLiveChatRepositoryTest {
  private static final Instant CREATED_AT = Instant.parse("2026-09-01T08:00:00Z");
  private static final Instant UPDATED_AT = Instant.parse("2026-09-01T08:05:00Z");

  @Test
  void sessionMapperReadsPostgresTimestampsThroughTheTypedJdbcContract() {
    var jdbc = new TimestampJdbcTemplate();
    var repository = new TelegramLiveChatRepository(jdbc);

    var session = repository.recentSessions(50).get(0);

    assertEquals(CREATED_AT, session.createdAt());
    assertEquals(UPDATED_AT, session.updatedAt());
  }

  private static ResultSet resultSet(Map<String, Object> row) {
    return (ResultSet) Proxy.newProxyInstance(
        TelegramLiveChatRepositoryTest.class.getClassLoader(),
        new Class<?>[] {ResultSet.class},
        (proxy, method, args) -> {
          var column = (String) args[0];
          if (!row.containsKey(column)) {
            throw new AssertionError("Unexpected SQL column: " + column);
          }
          var value = row.get(column);
          if ("getString".equals(method.getName())) {
            return value == null ? null : value.toString();
          }
          if ("getLong".equals(method.getName())) {
            return value == null ? 0L : ((Number) value).longValue();
          }
          if ("getObject".equals(method.getName()) && args.length == 2) {
            assertEquals(OffsetDateTime.class, args[1]);
            if (value instanceof Timestamp timestamp) {
              return timestamp.toInstant().atOffset(ZoneOffset.UTC);
            }
            return value;
          }
          if ("getObject".equals(method.getName())) {
            if ("created_at".equals(column) || "updated_at".equals(column)) {
              throw new AssertionError("Timestamp columns must use typed JDBC retrieval");
            }
            return value;
          }
          throw new UnsupportedOperationException(method.getName());
        }
    );
  }

  private static Map<String, Object> sessionRow() {
    var row = new LinkedHashMap<String, Object>();
    row.put("id", "legacy-session");
    row.put("telegram_chat_id", 101L);
    row.put("telegram_user_id", 202L);
    row.put("inquiry_id", "inquiry-legacy");
    row.put("locale", "ko");
    row.put("state", "active");
    row.put("customer_name", "Legacy Customer");
    row.put("customer_contact", "legacy@example.com");
    row.put("inquiry_content", "Legacy inquiry");
    row.put("attention_code", "");
    row.put("pending_customer_message_id", null);
    row.put("pending_group_message_id", null);
    row.put("pending_direction", "");
    row.put("topic_thread_id", 702L);
    row.put("topic_root_message_id", 703L);
    row.put("created_at", Timestamp.from(CREATED_AT));
    row.put("updated_at", UPDATED_AT.atOffset(ZoneOffset.UTC));
    return row;
  }

  private static class TimestampJdbcTemplate extends JdbcTemplate {
    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
      var mapped = new ArrayList<T>();
      try {
        mapped.add(rowMapper.mapRow(resultSet(sessionRow()), 0));
      } catch (java.sql.SQLException error) {
        throw new AssertionError(error);
      }
      return mapped;
    }
  }
}
