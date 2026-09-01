package com.daeho.cms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class WebLiveChatRepositoryTest {
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  @Test
  void currentConversationReliesOnTheOpenConversationConstraint() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    var conversation = repository.currentConversation("visitor-1", 3L);

    assertEquals("conversation-1", conversation.id());
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("visitor_id = ?"));
    assertTrue(call.sql().contains("configuration_generation = ?"));
    assertTrue(call.sql().contains("state <> 'closed'"));
    assertEquals(List.of("visitor-1", 3L), Arrays.asList(call.args()));
  }

  @Test
  void visitorQueriesUsePrivacySafeProjectionsAndRecords() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(visitorRow());
    var repository = new WebLiveChatRepository(jdbc);

    assertEquals("visitor-1", repository.visitorByTokenHash("secret-hash").id());
    assertEquals("visitor-1", repository.createVisitor("secret-hash", Duration.ofDays(30)).id());
    assertEquals("visitor-1", repository.touchVisitor("visitor-1", Duration.ofDays(30)).id());

    assertTrue(Arrays.stream(WebLiveChatRepository.Visitor.class.getRecordComponents())
        .noneMatch(component -> component.getName().equals("tokenHash")));
    assertFalse(selectProjection(jdbc.calls.get(0).sql()).contains("token_hash"));
    assertFalse(returningProjection(jdbc.calls.get(1).sql()).contains("token_hash"));
    assertFalse(returningProjection(jdbc.calls.get(2).sql()).contains("token_hash"));
  }

  @Test
  void claimOpenUsesInsertOnConflictAndReturnsTheWinningConversation() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> call.sql().contains("INSERT INTO")
        ? List.of()
        : List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    var result = repository.claimOpen(conversation());

    assertEquals("conversation-1", result.id());
    var insert = jdbc.calls.get(0);
    assertTrue(insert.sql().contains("ON CONFLICT (visitor_id, configuration_generation)"));
    assertTrue(insert.sql().contains("WHERE state <> 'closed'"));
    assertTrue(insert.sql().contains("DO NOTHING"));
    assertEquals(2, jdbc.calls.size());
  }

  @Test
  void visibleHistoryFiltersVisitorMessagesInSqlBeforeApplyingTheLimit() {
    var jdbc = new RecordingJdbcTemplate();
    var repository = new WebLiveChatRepository(jdbc);

    repository.visibleMessagesAfter("conversation-1", 40L, 100);

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("direction IN ('team', 'system')"));
    assertTrue(call.sql().contains("id > ?"));
    assertTrue(call.sql().contains("LIMIT ?"));
    assertEquals(List.of("conversation-1", 40L, 100), Arrays.asList(call.args()));
  }

  @Test
  void topicLookupIncludesConfigurationChatAndThread() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    var result = repository.conversationForTopic(3L, "-1003425727647", 701L);

    assertEquals("conversation-1", result.id());
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("configuration_generation = ?"));
    assertTrue(call.sql().contains("target_chat_id = ?"));
    assertTrue(call.sql().contains("topic_thread_id = ?"));
    assertEquals(List.of(3L, "-1003425727647", 701L), Arrays.asList(call.args()));
  }

  @Test
  void visitorMessageClaimHasOneDatabaseOwnerAndExplicitRetryStatuses() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(claimRow("acquired"));
    var repository = new WebLiveChatRepository(jdbc);

    var acquired = repository.claimVisitorMessage("conversation-1", "client-key-1", "추가 문의");

    assertEquals("acquired", acquired.status());
    assertEquals(41L, acquired.message().id());
    var sql = jdbc.calls.get(0).sql();
    assertTrue(sql.contains("ON CONFLICT (conversation_id, client_message_key) DO UPDATE"));
    assertTrue(sql.contains("pending_action = 'visitor_delivery'"));
    assertTrue(sql.contains("pending_message_id"));
    assertTrue(sql.contains("pending_client_message_key"));
    assertTrue(sql.contains("c.pending_action = ''"));

    jdbc.queryResult = call -> List.of(claimRow("in_progress"));
    assertEquals("in_progress",
        repository.claimVisitorMessage("conversation-1", "client-key-1", "추가 문의").status());

    jdbc.queryResult = call -> List.of(claimRow("already_delivered"));
    assertEquals("already_delivered",
        repository.claimVisitorMessage("conversation-1", "client-key-1", "추가 문의").status());
  }

  @Test
  void telegramMessageIdIsIdempotentWithoutPublishingADuplicateRow() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of();
    var repository = new WebLiveChatRepository(jdbc);

    var duplicate = repository.recordTeamMessage("conversation-1", 900L, "확인했습니다.");

    assertNull(duplicate);
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("ON CONFLICT (conversation_id, telegram_message_id) DO NOTHING"));
    assertTrue(call.sql().contains("RETURNING"));
  }

  @Test
  void systemEventsArePersistedAsVisibleDeliveredMessages() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(messageRow("system", 0L, ""));
    var repository = new WebLiveChatRepository(jdbc);

    var event = repository.recordSystemMessage("conversation-1", "상담이 종료되었습니다.");

    assertEquals("system", event.direction());
    var sql = jdbc.calls.get(0).sql();
    assertTrue(sql.contains("'system'"));
    assertTrue(sql.contains("'delivered'"));
    assertTrue(sql.contains("RETURNING"));
  }

  @Test
  void deliveryCompletionRequiresAndClearsTheMatchingConversationClaim() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(Map.of("id", 41L));
    var repository = new WebLiveChatRepository(jdbc);

    assertTrue(repository.markVisitorDelivered(41L, 703L));

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("delivery_state = 'pending'"));
    assertTrue(call.sql().contains("delivery_state = 'delivered'"));
    assertTrue(call.sql().contains("pending_action = 'visitor_delivery'"));
    assertTrue(call.sql().contains("pending_message_id = m.id"));
    assertTrue(call.sql().contains("pending_client_message_key = m.client_message_key"));
    assertTrue(call.sql().contains("pending_action = ''"));
    assertEquals(List.of(703L, 41L), Arrays.asList(call.args()));

    jdbc.queryResult = ignored -> List.of();
    assertFalse(repository.markVisitorDelivered(41L, 703L));
  }

  @Test
  void definiteVisitorDeliveryFailureReleasesOnlyTheMatchingPendingClaim() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.updateResult = call -> 1;
    var repository = new WebLiveChatRepository(jdbc);

    assertTrue(repository.releaseVisitorMessage(41L));

    var sql = jdbc.calls.get(0).sql();
    assertTrue(sql.contains("pending_action = 'visitor_delivery'"));
    assertTrue(sql.contains("pending_message_id = ?"));
    assertTrue(sql.contains("delivery_state = 'pending'"));
    assertTrue(sql.contains("pending_action = ''"));
    assertEquals(List.of(41L, 41L), Arrays.asList(jdbc.calls.get(0).args()));
  }

  @Test
  void conversationTransitionsUseExpectedStateAndPendingActionPredicates() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> call.sql().contains("WITH closed")
        ? List.of(closeRow())
        : List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    repository.attachInquiry("conversation-1", "inquiry-1");
    repository.reserveTopicCreation("conversation-1");
    repository.recordTopic("conversation-1", 701L);
    repository.activate("conversation-1", 702L);
    var closed = repository.close("conversation-1", "상담이 종료되었습니다.");

    assertTrue(jdbc.calls.get(0).sql().contains("state = 'opening'"));
    assertTrue(jdbc.calls.get(0).sql().contains("inquiry_id IS NULL"));
    assertTrue(jdbc.calls.get(1).sql().contains("pending_action = ''"));
    assertTrue(jdbc.calls.get(2).sql().contains("pending_action = 'topic_creation'"));
    assertTrue(jdbc.calls.get(2).sql().contains("topic_thread_id IS NULL"));
    assertTrue(jdbc.calls.get(3).sql().contains("pending_action = 'registration_delivery'"));
    assertEquals("closed", closed.conversation().state());
    assertEquals("system", closed.event().direction());
    assertTrue(jdbc.calls.get(4).sql().contains("WITH closed"));
    assertTrue(jdbc.calls.get(4).sql().contains("state <> 'closed'"));
    assertTrue(jdbc.calls.get(4).sql().contains("FROM closed"));
  }

  @Test
  void recoveryTransitionsCompareAndSetTheExpectedActionAndAttentionCode() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    repository.markNeedsAttention(
        "conversation-1", "topic_creation", "topic_creation_uncertain");
    repository.resetTopicCreation("conversation-1", "topic_creation_uncertain");
    repository.reserveRegistrationRetry("conversation-1", "registration_delivery_uncertain");

    assertTrue(jdbc.calls.get(0).sql().contains("state = 'needs_attention'"));
    assertTrue(jdbc.calls.get(0).sql().contains("pending_action = ?"));
    assertEquals(List.of("topic_creation_uncertain", "conversation-1", "topic_creation"),
        Arrays.asList(jdbc.calls.get(0).args()));

    assertTrue(jdbc.calls.get(1).sql().contains("state = 'needs_attention'"));
    assertTrue(jdbc.calls.get(1).sql().contains("attention_code = ?"));
    assertTrue(jdbc.calls.get(1).sql().contains("pending_action = 'topic_creation'"));
    assertTrue(jdbc.calls.get(1).sql().contains("topic_thread_id IS NULL"));

    assertTrue(jdbc.calls.get(2).sql().contains("state = 'needs_attention'"));
    assertTrue(jdbc.calls.get(2).sql().contains("attention_code = ?"));
    assertTrue(jdbc.calls.get(2).sql().contains("pending_action = 'registration_delivery'"));
    assertTrue(jdbc.calls.get(2).sql().contains("topic_thread_id IS NOT NULL"));
  }

  @Test
  void readCursorIsClampedToAPersistedTeamMessageInTheConversation() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    repository.markRead("conversation-1", 9_999L);

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("MAX(m.id)"));
    assertTrue(call.sql().contains("m.conversation_id = c.id"));
    assertTrue(call.sql().contains("m.direction = 'team'"));
    assertTrue(call.sql().contains("m.id <= ?"));
    assertEquals(List.of(9_999L, "conversation-1"), Arrays.asList(call.args()));
  }

  @Test
  void rateBucketAtomicallyReplacesStaleWindowsAndRejectsFullLiveWindows() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(Map.of("request_count", 1));
    var repository = new WebLiveChatRepository(jdbc);

    assertTrue(repository.consumeRateBucket("ip-hash", "start", 5, Duration.ofHours(1)));

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("ON CONFLICT (key_hash, action) DO UPDATE"));
    assertTrue(call.sql().contains("expires_at <= now()"));
    assertTrue(call.sql().contains("request_count < ?"));
    assertEquals(List.of("ip-hash", "start", 3_600_000L, 3_600_000L, 5), Arrays.asList(call.args()));

    jdbc.queryResult = ignored -> List.of();
    assertFalse(repository.consumeRateBucket("ip-hash", "start", 5, Duration.ofHours(1)));
  }

  @Test
  void recentCmsListingNeverSelectsVisitorTokenHashes() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(summaryRow(7L, 2L));
    var repository = new WebLiveChatRepository(jdbc);

    var summary = repository.recentConversations(50).get(0);

    assertEquals("conversation-1", summary.conversation().id());
    assertEquals(7L, summary.messageCount());
    assertEquals(2L, summary.unreadCount());
    var sql = jdbc.calls.get(0).sql().toLowerCase();
    assertTrue(sql.contains("from cms_web_live_chat_conversations"));
    assertTrue(sql.contains("message_count"));
    assertFalse(sql.contains("token_hash"));
  }

  private static WebLiveChatRepository.Conversation conversation() {
    return new WebLiveChatRepository.Conversation(
        "conversation-1", "visitor-1", 3L, "-1003425727647", "", "ko", "opening",
        "홍길동", "010-1234-5678", "견적 문의", "2026-09", NOW, "", "", 0L, "",
        0L, 0L, 0L, NOW, NOW, NOW, null
    );
  }

  private static Map<String, Object> conversationRow() {
    return Map.ofEntries(
        Map.entry("id", "conversation-1"), Map.entry("visitor_id", "visitor-1"),
        Map.entry("configuration_generation", 3L), Map.entry("target_chat_id", "-1003425727647"),
        Map.entry("inquiry_id", "inquiry-1"), Map.entry("locale", "ko"),
        Map.entry("state", "active"), Map.entry("customer_name", "홍길동"),
        Map.entry("customer_contact", "010-1234-5678"), Map.entry("inquiry_content", "견적 문의"),
        Map.entry("consent_version", "2026-09"), Map.entry("consented_at", databaseTime(NOW)),
        Map.entry("attention_code", ""), Map.entry("pending_action", ""),
        Map.entry("pending_message_id", 0L), Map.entry("pending_client_message_key", ""),
        Map.entry("topic_thread_id", 701L), Map.entry("topic_root_message_id", 702L),
        Map.entry("last_read_team_message_id", 0L), Map.entry("last_activity_at", databaseTime(NOW)),
        Map.entry("created_at", databaseTime(NOW)), Map.entry("updated_at", databaseTime(NOW)),
        Map.entry("closed_at", databaseTime(NOW))
    );
  }

  private static Map<String, Object> visitorRow() {
    return Map.of(
        "id", "visitor-1",
        "expires_at", databaseTime(NOW.plus(Duration.ofDays(30))),
        "last_seen_at", databaseTime(NOW),
        "created_at", databaseTime(NOW),
        "updated_at", databaseTime(NOW)
    );
  }

  private static Map<String, Object> closeRow() {
    var row = new java.util.LinkedHashMap<>(conversationRow());
    row.put("state", "closed");
    row.put("event_id", 42L);
    row.put("event_conversation_id", "conversation-1");
    row.put("event_direction", "system");
    row.put("event_body", "상담이 종료되었습니다.");
    row.put("event_delivery_state", "delivered");
    row.put("event_client_message_key", "");
    row.put("event_telegram_message_id", 0L);
    row.put("event_created_at", databaseTime(NOW));
    return row;
  }

  private static Map<String, Object> summaryRow(long messageCount, long unreadCount) {
    var row = new java.util.LinkedHashMap<>(conversationRow());
    row.put("message_count", messageCount);
    row.put("unread_count", unreadCount);
    return row;
  }

  private static Map<String, Object> messageRow(String direction, long telegramMessageId,
      String clientMessageKey) {
    return Map.ofEntries(
        Map.entry("id", 41L), Map.entry("conversation_id", "conversation-1"),
        Map.entry("direction", direction), Map.entry("body", "추가 문의"),
        Map.entry("delivery_state", "pending"), Map.entry("client_message_key", clientMessageKey),
        Map.entry("telegram_message_id", telegramMessageId), Map.entry("created_at", databaseTime(NOW))
    );
  }

  private static Map<String, Object> claimRow(String status) {
    var row = new java.util.LinkedHashMap<>(messageRow("visitor", 0L, "client-key-1"));
    row.put("claim_status", status);
    return row;
  }

  private static OffsetDateTime databaseTime(Instant value) {
    return OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
  }

  private static String selectProjection(String sql) {
    return sql.substring(0, sql.toUpperCase().indexOf("FROM")).toLowerCase();
  }

  private static String returningProjection(String sql) {
    return sql.substring(sql.toUpperCase().lastIndexOf("RETURNING")).toLowerCase();
  }

  private static ResultSet resultSet(Map<String, Object> row) {
    return (ResultSet) Proxy.newProxyInstance(
        WebLiveChatRepositoryTest.class.getClassLoader(), new Class<?>[] {ResultSet.class},
        (proxy, method, args) -> {
          if ("getString".equals(method.getName()) || "getLong".equals(method.getName())
              || "getInt".equals(method.getName()) || "getObject".equals(method.getName())) {
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

  private static class RecordingJdbcTemplate extends JdbcTemplate {
    private final List<SqlCall> calls = new ArrayList<>();
    private Function<SqlCall, List<Map<String, Object>>> queryResult = call -> List.of();
    private Function<SqlCall, Integer> updateResult = call -> 0;

    @Override
    public int update(String sql, Object... args) {
      var call = new SqlCall(sql, args);
      calls.add(call);
      return updateResult.apply(call);
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
      var call = new SqlCall(sql, args);
      calls.add(call);
      var mapped = new ArrayList<T>();
      var rows = queryResult.apply(call);
      for (var index = 0; index < rows.size(); index += 1) {
        try {
          mapped.add(rowMapper.mapRow(resultSet(rows.get(index)), index));
        } catch (java.sql.SQLException error) {
          throw new AssertionError(error);
        }
      }
      return mapped;
    }
  }

  private record SqlCall(String sql, Object[] args) {
  }
}
