package com.daeho.cms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.sql.Timestamp;
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
  void latestVisitorConversationRetainsTheMostRecentClosedSession() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    var conversation = repository.latestConversation("visitor-1", 3L);

    assertEquals("conversation-1", conversation.id());
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("visitor_id = ?"));
    assertTrue(call.sql().contains("configuration_generation = ?"));
    assertFalse(call.sql().contains("state <> 'closed'"));
    assertTrue(call.sql().contains("ORDER BY created_at DESC"));
    assertTrue(call.sql().contains("LIMIT 1"));
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
  void visitorMapperReadsPostgresTimestampsThroughTheTypedJdbcContract() {
    var jdbc = new RecordingJdbcTemplate();
    var row = new java.util.LinkedHashMap<>(visitorRow());
    row.replaceAll((column, value) -> value instanceof OffsetDateTime offset
        ? Timestamp.from(offset.toInstant())
        : value);
    jdbc.queryResult = call -> List.of(row);
    var repository = new WebLiveChatRepository(jdbc);

    var visitor = repository.createVisitor("secret-hash", Duration.ofDays(30));

    assertEquals(NOW.plus(Duration.ofDays(30)), visitor.expiresAt());
    assertEquals(NOW, visitor.createdAt());
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
  void ownerHistoryIncludesVisitorMessagesBeforeApplyingTheLimit() {
    var jdbc = new RecordingJdbcTemplate();
    var repository = new WebLiveChatRepository(jdbc);

    repository.ownerMessagesAfter("conversation-1", 40L, 100);

    var call = jdbc.calls.get(0);
    assertFalse(call.sql().contains("direction IN ('team', 'system')"));
    assertTrue(call.sql().contains("id > ?"));
    assertTrue(call.sql().contains("LIMIT ?"));
    assertEquals(List.of("conversation-1", 40L, 100), Arrays.asList(call.args()));
  }

  @Test
  void streamHistoryFiltersVisitorMessagesInSqlBeforeApplyingTheLimit() {
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
  void initialVisitorMessageIsInsertedDeliveredAndIdempotentPerConversation() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(messageRow("visitor", 0L, "start-key"));
    var repository = new WebLiveChatRepository(jdbc);

    var message = repository.storeInitialVisitorMessage(
        "conversation-1", "start-key", "반지 제작 상담"
    );

    assertEquals("visitor", message.direction());
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("'visitor'"));
    assertTrue(call.sql().contains("'delivered'"));
    assertTrue(call.sql().contains("is_initial"));
    assertTrue(call.sql().contains("ON CONFLICT (conversation_id) WHERE is_initial DO UPDATE"));
    assertFalse(call.sql().contains("body = excluded.body"));
    assertEquals(
        List.of("반지 제작 상담", "start-key", "conversation-1"),
        Arrays.asList(call.args())
    );
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
  void teamRepliesDoNotExtendTheCustomerWriteExpiryClock() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(messageRow("team", 900L, ""));
    var repository = new WebLiveChatRepository(jdbc);

    repository.recordTeamMessage("conversation-1", 900L, "확인했습니다.");

    assertEquals(1, jdbc.calls.size());
    assertFalse(jdbc.calls.get(0).sql().contains("last_activity_at = now()"));
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
  void uncertainAndStaleVisitorDeliveriesBecomeExactRecoverableClaims() {
    var jdbc = new RecordingJdbcTemplate();
    var attentionRow = new java.util.LinkedHashMap<>(conversationRow());
    attentionRow.put("state", "needs_attention");
    jdbc.queryResult = call -> call.sql().contains("SELECT m.*")
        ? List.of(messageRow("visitor", 0L, "client-key-1"))
        : List.of(attentionRow);
    var repository = new WebLiveChatRepository(jdbc);

    assertEquals(
        "needs_attention",
        repository.markVisitorDeliveryNeedsAttention(
            "conversation-1", 41L, "visitor_delivery_uncertain"
        ).state()
    );
    repository.reconcileStaleVisitorDelivery(
        "conversation-1", "client-key-1", NOW.minusSeconds(120)
    );

    var uncertainSql = jdbc.calls.get(0).sql();
    assertTrue(uncertainSql.contains("delivery_state = 'needs_attention'"));
    assertTrue(uncertainSql.contains("pending_message_id = ?"));
    assertTrue(uncertainSql.contains("pending_action = 'visitor_delivery'"));
    var staleSql = jdbc.calls.get(1).sql();
    assertTrue(staleSql.contains("updated_at <= ?"));
    assertTrue(staleSql.contains("visitor_delivery_stale"));
    assertTrue(staleSql.contains("client_message_key = ?"));
  }

  @Test
  void staleVisitorDeliverySweepIsBoundedAndPreservesTheExactPendingMessage() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(Map.of("updated", 1));
    var repository = new WebLiveChatRepository(jdbc);
    var cutoff = NOW.minusSeconds(120);

    assertEquals(1, repository.reconcileStaleVisitorDeliveries(cutoff, 100));

    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("pending_action = 'visitor_delivery'"));
    assertTrue(call.sql().contains("pending_message_id = m.id"));
    assertTrue(call.sql().contains("delivery_state = 'needs_attention'"));
    assertTrue(call.sql().contains("visitor_delivery_stale"));
    assertTrue(call.sql().contains("FOR UPDATE OF c SKIP LOCKED"));
    assertTrue(call.sql().contains("LIMIT ?"));
    assertEquals(List.of(databaseTime(cutoff), 100), Arrays.asList(call.args()));
  }

  @Test
  void exactMessageRecoveryConfirmsOrReacquiresTheOriginalPersistedKey() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> call.sql().contains("claim_status")
        ? List.of(claimRow("acquired"))
        : List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    repository.confirmVisitorMessageDelivered(
        "conversation-1", 41L, "visitor_delivery_uncertain"
    );
    var retry = repository.reserveVisitorMessageRetry(
        "conversation-1", 41L, "visitor_delivery_uncertain"
    );

    assertTrue(jdbc.calls.get(0).sql().contains("delivery_state = 'delivered'"));
    assertTrue(jdbc.calls.get(0).sql().contains("m.client_message_key = c.pending_client_message_key"));
    assertEquals("client-key-1", retry.message().clientMessageKey());
    assertTrue(jdbc.calls.get(1).sql().contains("delivery_state = 'pending'"));
    assertTrue(jdbc.calls.get(1).sql().contains("pending_client_message_key = m.client_message_key"));
  }

  @Test
  void closePersistsRetryableTopicStatusAndCompletionUsesCompareAndSet() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(closeRow());
    jdbc.updateResult = call -> 1;
    var repository = new WebLiveChatRepository(jdbc);

    repository.close("conversation-1", "상담이 종료되었습니다.");
    assertTrue(jdbc.calls.get(0).sql().contains("pending_action = CASE"));
    assertTrue(jdbc.calls.get(0).sql().contains("'topic_close'"));
    assertEquals("conversation-1", repository.completeTopicClose("conversation-1").id());
    assertTrue(repository.markTopicCloseNeedsAttention(
        "conversation-1", "topic_close_uncertain"
    ));
    assertTrue(jdbc.calls.get(1).sql().contains("pending_action = 'topic_close'"));
    assertTrue(jdbc.calls.get(2).sql().contains("attention_code = ?"));
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
    assertFalse(jdbc.calls.get(3).sql().contains("last_activity_at = now()"));
    assertEquals("closed", closed.conversation().state());
    assertEquals("system", closed.event().direction());
    assertTrue(jdbc.calls.get(4).sql().contains("WITH closed"));
    assertTrue(jdbc.calls.get(4).sql().contains("state <> 'closed'"));
    assertTrue(jdbc.calls.get(4).sql().contains("FROM closed"));
  }

  @Test
  void delayedActivationPreservesTheCustomerWriteTimestampForThirtyDayExpiry() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(conversationRow());
    var repository = new WebLiveChatRepository(jdbc);

    repository.activate("conversation-1", 702L);

    var sql = jdbc.calls.get(0).sql();
    assertTrue(sql.contains("state = 'active'"));
    assertFalse(sql.contains("last_activity_at = now()"));
    assertTrue(sql.contains("updated_at = now()"));
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
  void staleExpiryAtomicallyPersistsTheDurableClosedSystemEvent() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(closeRow());
    var repository = new WebLiveChatRepository(jdbc);
    var cutoff = NOW.minus(Duration.ofDays(30));

    var results = repository.expireStale(cutoff, 100, "상담이 종료되었습니다.");

    assertEquals(1, results.size());
    assertEquals("closed", results.get(0).conversation().state());
    assertEquals(42L, results.get(0).event().id());
    assertEquals("system", results.get(0).event().direction());
    var call = jdbc.calls.get(0);
    assertTrue(call.sql().contains("FOR UPDATE SKIP LOCKED"));
    assertTrue(call.sql().contains("LIMIT ?"));
    assertTrue(call.sql().contains("INSERT INTO cms_web_live_chat_messages"));
    assertTrue(call.sql().contains("SELECT id, 'system', ?, 'delivered'"));
    assertTrue(call.sql().contains("last_activity_at = now()"));
    assertTrue(call.sql().contains("ELSE 'topic_close'"));
    assertTrue(call.sql().contains("topic_close_in_flight"));
    assertEquals(List.of(databaseTime(cutoff), 100, "상담이 종료되었습니다."), Arrays.asList(call.args()));
  }

  @Test
  void cleanupDeletesOnlyBoundedExpiredAnonymousStateAndPreservesInquiryRows() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(Map.of("deleted", 1));
    var repository = new WebLiveChatRepository(jdbc);

    repository.deleteExpiredRateBuckets(100);
    repository.deleteExpiredAnonymousConversations(100);
    repository.deleteExpiredOrphanVisitors(100);

    assertTrue(jdbc.calls.get(0).sql().contains("expires_at <= now()"));
    assertTrue(jdbc.calls.get(0).sql().contains("LIMIT ?"));
    assertTrue(jdbc.calls.get(1).sql().contains("DELETE FROM cms_web_live_chat_conversations"));
    assertFalse(jdbc.calls.get(1).sql().contains("DELETE FROM cms_inquiries"));
    assertTrue(jdbc.calls.get(2).sql().contains("NOT EXISTS"));
    assertEquals(List.of(100), Arrays.asList(jdbc.calls.get(0).args()));
    assertEquals(List.of(100), Arrays.asList(jdbc.calls.get(1).args()));
    assertEquals(List.of(100), Arrays.asList(jdbc.calls.get(2).args()));
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

  @Test
  void recentCmsListingKeepsEveryTopicCloseActionAcrossGenerationsOutsideTheHistoryCap() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> List.of(summaryRow(0L, 0L));
    var repository = new WebLiveChatRepository(jdbc);

    repository.recentConversations(50);

    var call = jdbc.calls.get(0);
    var sql = call.sql();
    assertTrue(sql.contains("WHERE actionable.state <> 'closed'"));
    assertTrue(sql.contains("actionable.state = 'closed' AND actionable.pending_action = 'topic_close'"));
    assertTrue(sql.contains("WHERE closed.state = 'closed'"));
    assertTrue(sql.contains("closed.pending_action <> 'topic_close'"));
    assertTrue(sql.contains("closed.configuration_generation"));
    assertTrue(sql.contains("ORDER BY closed.updated_at DESC, closed.id DESC"));
    assertTrue(sql.contains("LIMIT ?"));
    assertTrue(sql.contains("ORDER BY c.updated_at DESC, c.id DESC"));
    assertEquals(List.of(50), Arrays.asList(call.args()));
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
            var value = row.get(column);
            if ("getObject".equals(method.getName()) && args.length == 2
                && args[1] == OffsetDateTime.class && value instanceof Timestamp timestamp) {
              return timestamp.toInstant().atOffset(ZoneOffset.UTC);
            }
            return value;
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
