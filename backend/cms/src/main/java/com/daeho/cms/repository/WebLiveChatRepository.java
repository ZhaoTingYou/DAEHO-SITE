package com.daeho.cms.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class WebLiveChatRepository {
  private final JdbcTemplate jdbc;

  public WebLiveChatRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Visitor createVisitor(String tokenHash, Duration lifetime) {
    return one(jdbc.query("""
        INSERT INTO cms_web_live_chat_visitors (id, token_hash, expires_at)
        VALUES (?, ?, now() + (? * interval '1 millisecond'))
        ON CONFLICT (token_hash) DO NOTHING
        RETURNING id, expires_at, last_seen_at, created_at, updated_at
        """, this::mapVisitor, UUID.randomUUID().toString(), tokenHash, millis(lifetime)));
  }

  public Visitor visitorByTokenHash(String tokenHash) {
    return one(jdbc.query("""
        SELECT id, expires_at, last_seen_at, created_at, updated_at
        FROM cms_web_live_chat_visitors
        WHERE token_hash = ? AND expires_at > now()
        """, this::mapVisitor, tokenHash));
  }

  public Visitor touchVisitor(String visitorId, Duration lifetime) {
    return one(jdbc.query("""
        UPDATE cms_web_live_chat_visitors
        SET last_seen_at = now(),
            expires_at = now() + (? * interval '1 millisecond'),
            updated_at = now()
        WHERE id = ? AND expires_at > now()
        RETURNING id, expires_at, last_seen_at, created_at, updated_at
        """, this::mapVisitor, millis(lifetime), visitorId));
  }

  public boolean expireVisitor(String visitorId) {
    return jdbc.update("""
        UPDATE cms_web_live_chat_visitors
        SET expires_at = now(), updated_at = now()
        WHERE id = ? AND expires_at > now()
        """, visitorId) == 1;
  }

  public Conversation currentConversation(String visitorId, long configurationGeneration) {
    return one(jdbc.query("""
        SELECT c.*
        FROM cms_web_live_chat_conversations c
        WHERE c.visitor_id = ?
          AND c.configuration_generation = ?
          AND c.state <> 'closed'
        """, this::mapConversation, visitorId, configurationGeneration));
  }

  public Conversation latestConversation(String visitorId, long configurationGeneration) {
    return one(jdbc.query("""
        SELECT c.*
        FROM cms_web_live_chat_conversations c
        WHERE c.visitor_id = ?
          AND c.configuration_generation = ?
        ORDER BY created_at DESC
        LIMIT 1
        """, this::mapConversation, visitorId, configurationGeneration));
  }

  public Conversation conversationForVisitor(String visitorId, String conversationId) {
    return one(jdbc.query("""
        SELECT c.*
        FROM cms_web_live_chat_conversations c
        WHERE c.id = ? AND c.visitor_id = ?
        """, this::mapConversation, conversationId, visitorId));
  }

  public Conversation conversationById(String conversationId) {
    return one(jdbc.query("""
        SELECT c.*
        FROM cms_web_live_chat_conversations c
        WHERE c.id = ?
        """, this::mapConversation, conversationId));
  }

  public Conversation conversationForTopic(long configurationGeneration, String targetChatId,
      long topicThreadId) {
    return one(jdbc.query("""
        SELECT c.*
        FROM cms_web_live_chat_conversations c
        WHERE c.configuration_generation = ?
          AND c.target_chat_id = ?
          AND c.topic_thread_id = ?
        """, this::mapConversation, configurationGeneration, targetChatId, topicThreadId));
  }

  @Transactional
  public Conversation claimOpen(Conversation candidate) {
    var inserted = one(jdbc.query("""
        INSERT INTO cms_web_live_chat_conversations (
          id, visitor_id, configuration_generation, target_chat_id, locale, state,
          customer_name, customer_contact, inquiry_content, consent_version, consented_at
        ) VALUES (?, ?, ?, ?, ?, 'opening', ?, ?, ?, ?, ?)
        ON CONFLICT (visitor_id, configuration_generation) WHERE state <> 'closed' DO NOTHING
        RETURNING *
        """, this::mapConversation,
        candidate.id(), candidate.visitorId(), candidate.configurationGeneration(),
        candidate.targetChatId(), candidate.locale(), candidate.customerName(),
        candidate.customerContact(), candidate.inquiryContent(), candidate.consentVersion(),
        databaseTime(candidate.consentedAt())));
    return inserted == null
        ? currentConversation(candidate.visitorId(), candidate.configurationGeneration())
        : inserted;
  }

  public Message storeInitialVisitorMessage(
      String conversationId,
      String clientMessageKey,
      String body
  ) {
    return one(jdbc.query("""
        INSERT INTO cms_web_live_chat_messages (
          conversation_id, direction, body, delivery_state, client_message_key,
          delivered_at, is_initial
        )
        SELECT id, 'visitor', ?, 'delivered', ?, now(), true
        FROM cms_web_live_chat_conversations
        WHERE id = ?
        ON CONFLICT (conversation_id) WHERE is_initial DO UPDATE
        SET is_initial = excluded.is_initial
        RETURNING *
        """, this::mapMessage, body, clientMessageKey, conversationId));
  }

  public Conversation attachInquiry(String conversationId, String inquiryId) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET inquiry_id = ?, updated_at = now()
        WHERE id = ? AND state = 'opening' AND inquiry_id IS NULL
        RETURNING *
        """, inquiryId, conversationId);
  }

  public Conversation reserveTopicCreation(String conversationId) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET pending_action = 'topic_creation', attention_code = '', updated_at = now()
        WHERE id = ? AND state = 'opening' AND pending_action = '' AND topic_thread_id IS NULL
        RETURNING *
        """, conversationId);
  }

  public Conversation recordTopic(String conversationId, long topicThreadId) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET topic_thread_id = ?, pending_action = 'registration_delivery', updated_at = now()
        WHERE id = ? AND state = 'opening'
          AND pending_action = 'topic_creation' AND topic_thread_id IS NULL
        RETURNING *
        """, topicThreadId, conversationId);
  }

  public Conversation activate(String conversationId, long topicRootMessageId) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET state = 'active', topic_root_message_id = ?, pending_action = '',
            attention_code = '', last_activity_at = now(), updated_at = now()
        WHERE id = ? AND state = 'opening' AND pending_action = 'registration_delivery'
        RETURNING *
        """, topicRootMessageId, conversationId);
  }

  public Conversation markNeedsAttention(
      String conversationId,
      String expectedPendingAction,
      String attentionCode
  ) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET state = 'needs_attention', attention_code = ?, updated_at = now()
        WHERE id = ? AND state <> 'closed' AND pending_action = ?
        RETURNING *
        """, attentionCode, conversationId, expectedPendingAction);
  }

  public Conversation resetTopicCreation(String conversationId, String expectedAttentionCode) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET state = 'opening', attention_code = '', pending_action = '', updated_at = now()
        WHERE id = ?
          AND state = 'needs_attention'
          AND attention_code = ?
          AND pending_action = 'topic_creation'
          AND topic_thread_id IS NULL
        RETURNING *
        """, conversationId, expectedAttentionCode);
  }

  public Conversation reserveRegistrationRetry(
      String conversationId,
      String expectedAttentionCode
  ) {
    return transition("""
        UPDATE cms_web_live_chat_conversations
        SET state = 'opening', attention_code = '', updated_at = now()
        WHERE id = ?
          AND state = 'needs_attention'
          AND attention_code = ?
          AND pending_action = 'registration_delivery'
          AND topic_thread_id IS NOT NULL
        RETURNING *
        """, conversationId, expectedAttentionCode);
  }

  public CloseResult close(String conversationId, String systemBody) {
    return one(jdbc.query("""
        WITH closed AS (
          UPDATE cms_web_live_chat_conversations
          SET state = 'closed', pending_action = '', pending_message_id = NULL,
              pending_client_message_key = '', closed_at = now(),
              last_activity_at = now(), updated_at = now()
          WHERE id = ? AND state <> 'closed'
          RETURNING *
        ), event AS (
          INSERT INTO cms_web_live_chat_messages (
            conversation_id, direction, body, delivery_state, delivered_at
          )
          SELECT id, 'system', ?, 'delivered', now()
          FROM closed
          RETURNING *
        )
        SELECT c.*,
          e.id AS event_id,
          e.conversation_id AS event_conversation_id,
          e.direction AS event_direction,
          e.body AS event_body,
          e.delivery_state AS event_delivery_state,
          e.client_message_key AS event_client_message_key,
          e.telegram_message_id AS event_telegram_message_id,
          e.created_at AS event_created_at
        FROM closed c
        INNER JOIN event e ON e.conversation_id = c.id
        """, this::mapCloseResult, conversationId, systemBody));
  }

  public List<CloseResult> expireStale(Instant cutoff, int limit, String systemBody) {
    return jdbc.query("""
        WITH stale AS (
          SELECT id
          FROM cms_web_live_chat_conversations
          WHERE state <> 'closed' AND last_activity_at < ?
          ORDER BY last_activity_at ASC
          LIMIT ?
          FOR UPDATE SKIP LOCKED
        ), closed AS (
          UPDATE cms_web_live_chat_conversations c
          SET state = 'closed', pending_action = '', pending_message_id = NULL,
              pending_client_message_key = '', closed_at = now(),
              last_activity_at = now(), updated_at = now()
          FROM stale
          WHERE c.id = stale.id AND c.state <> 'closed'
          RETURNING c.*
        ), events AS (
          INSERT INTO cms_web_live_chat_messages (
            conversation_id, direction, body, delivery_state, delivered_at
          )
          SELECT id, 'system', ?, 'delivered', now()
          FROM closed
          RETURNING *
        )
        SELECT c.*,
          e.id AS event_id,
          e.conversation_id AS event_conversation_id,
          e.direction AS event_direction,
          e.body AS event_body,
          e.delivery_state AS event_delivery_state,
          e.client_message_key AS event_client_message_key,
          e.telegram_message_id AS event_telegram_message_id,
          e.created_at AS event_created_at
        FROM closed c
        INNER JOIN events e ON e.conversation_id = c.id
        ORDER BY c.last_activity_at ASC
        """, this::mapCloseResult, databaseTime(cutoff), limit, systemBody);
  }

  public VisitorMessageClaim claimVisitorMessage(
      String conversationId,
      String clientMessageKey,
      String body
  ) {
    return one(jdbc.query("""
        WITH stored AS (
          INSERT INTO cms_web_live_chat_messages (
            conversation_id, direction, body, delivery_state, client_message_key
          )
          SELECT id, 'visitor', ?, 'pending', ?
          FROM cms_web_live_chat_conversations
          WHERE id = ? AND state = 'active'
          ON CONFLICT (conversation_id, client_message_key) DO UPDATE
          SET client_message_key = excluded.client_message_key
          RETURNING *
        ), owned AS (
          UPDATE cms_web_live_chat_conversations c
          SET pending_action = 'visitor_delivery',
              pending_message_id = m.id,
              pending_client_message_key = m.client_message_key,
              last_activity_at = now(),
              updated_at = now()
          FROM stored m
          WHERE c.id = m.conversation_id
            AND c.state = 'active'
            AND c.pending_action = ''
            AND m.delivery_state = 'pending'
          RETURNING c.id
        )
        SELECT m.*,
          CASE
            WHEN m.delivery_state = 'delivered' THEN 'already_delivered'
            WHEN EXISTS (SELECT 1 FROM owned) THEN 'acquired'
            ELSE 'in_progress'
          END AS claim_status
        FROM stored m
        """, this::mapVisitorMessageClaim, body, clientMessageKey, conversationId));
  }

  public boolean markVisitorDelivered(long messageId, long telegramMessageId) {
    return !jdbc.query("""
        WITH delivered AS (
          UPDATE cms_web_live_chat_messages m
          SET delivery_state = 'delivered', telegram_message_id = ?, delivered_at = now()
          WHERE m.id = ?
            AND m.direction = 'visitor'
            AND m.delivery_state = 'pending'
            AND EXISTS (
              SELECT 1
              FROM cms_web_live_chat_conversations c
              WHERE c.id = m.conversation_id
                AND c.pending_action = 'visitor_delivery'
                AND c.pending_message_id = m.id
                AND c.pending_client_message_key = m.client_message_key
            )
          RETURNING m.id, m.conversation_id, m.client_message_key
        ), released AS (
          UPDATE cms_web_live_chat_conversations c
          SET pending_action = '', pending_message_id = NULL,
              pending_client_message_key = '', updated_at = now()
          FROM delivered m
          WHERE c.id = m.conversation_id
            AND c.pending_action = 'visitor_delivery'
            AND c.pending_message_id = m.id
            AND c.pending_client_message_key = m.client_message_key
          RETURNING m.id
        )
        SELECT id FROM released
        """, (rs, rowNum) -> rs.getLong("id"), telegramMessageId, messageId).isEmpty();
  }

  public boolean releaseVisitorMessage(long messageId) {
    return jdbc.update("""
        UPDATE cms_web_live_chat_conversations c
        SET pending_action = '', pending_message_id = NULL,
            pending_client_message_key = '', updated_at = now()
        WHERE c.pending_action = 'visitor_delivery'
          AND c.pending_message_id = ?
          AND EXISTS (
            SELECT 1
            FROM cms_web_live_chat_messages m
            WHERE m.id = ?
              AND m.conversation_id = c.id
              AND m.direction = 'visitor'
              AND m.delivery_state = 'pending'
              AND m.client_message_key = c.pending_client_message_key
          )
        """, messageId, messageId) == 1;
  }

  @Transactional
  public Message recordTeamMessage(String conversationId, long telegramMessageId, String body) {
    var inserted = one(jdbc.query("""
        INSERT INTO cms_web_live_chat_messages (
          conversation_id, direction, body, delivery_state, telegram_message_id, delivered_at
        )
        SELECT id, 'team', ?, 'delivered', ?, now()
        FROM cms_web_live_chat_conversations
        WHERE id = ? AND state <> 'closed'
        ON CONFLICT (conversation_id, telegram_message_id) DO NOTHING
        RETURNING *
        """, this::mapMessage, body, telegramMessageId, conversationId));
    if (inserted != null) {
      jdbc.update("""
          UPDATE cms_web_live_chat_conversations
          SET last_activity_at = now(), updated_at = now()
          WHERE id = ? AND state <> 'closed'
          """, conversationId);
    }
    return inserted;
  }

  public Message recordSystemMessage(String conversationId, String body) {
    return one(jdbc.query("""
        INSERT INTO cms_web_live_chat_messages (
          conversation_id, direction, body, delivery_state, delivered_at
        )
        SELECT id, 'system', ?, 'delivered', now()
        FROM cms_web_live_chat_conversations
        WHERE id = ?
        RETURNING *
        """, this::mapMessage, body, conversationId));
  }

  public List<Message> visibleMessagesAfter(String conversationId, long afterId, int limit) {
    return jdbc.query("""
        SELECT *
        FROM cms_web_live_chat_messages
        WHERE conversation_id = ?
          AND id > ?
          AND direction IN ('team', 'system')
        ORDER BY id ASC
        LIMIT ?
        """, this::mapMessage, conversationId, afterId, limit);
  }

  public List<Message> ownerMessagesAfter(String conversationId, long afterId, int limit) {
    return jdbc.query("""
        SELECT *
        FROM cms_web_live_chat_messages
        WHERE conversation_id = ?
          AND id > ?
          AND (direction <> 'visitor' OR delivery_state = 'delivered')
        ORDER BY id ASC
        LIMIT ?
        """, this::mapMessage, conversationId, afterId, limit);
  }

  public Conversation markRead(String conversationId, long teamMessageId) {
    return transition("""
        UPDATE cms_web_live_chat_conversations c
        SET last_read_team_message_id = GREATEST(
              COALESCE(c.last_read_team_message_id, 0),
              COALESCE((
                SELECT MAX(m.id)
                FROM cms_web_live_chat_messages m
                WHERE m.conversation_id = c.id
                  AND m.direction = 'team'
                  AND m.id <= ?
              ), COALESCE(c.last_read_team_message_id, 0))
            ),
            updated_at = now()
        WHERE c.id = ?
        RETURNING c.*
        """, teamMessageId, conversationId);
  }

  public long unreadCount(String conversationId) {
    var count = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM cms_web_live_chat_messages m
        INNER JOIN cms_web_live_chat_conversations c ON c.id = m.conversation_id
        WHERE m.conversation_id = ?
          AND m.direction = 'team'
          AND m.id > COALESCE(c.last_read_team_message_id, 0)
        """, Long.class, conversationId);
    return count == null ? 0 : count;
  }

  public boolean consumeRateBucket(String keyHash, String action, int limit, Duration window) {
    if (limit <= 0 || window == null || window.isZero() || window.isNegative()) {
      return false;
    }
    return !jdbc.query("""
        INSERT INTO cms_web_live_chat_rate_limits (
          key_hash, action, window_started_at, request_count, expires_at
        ) VALUES (?, ?, now(), 1, now() + (? * interval '1 millisecond'))
        ON CONFLICT (key_hash, action) DO UPDATE
        SET window_started_at = CASE
              WHEN cms_web_live_chat_rate_limits.expires_at <= now() THEN now()
              ELSE cms_web_live_chat_rate_limits.window_started_at
            END,
            request_count = CASE
              WHEN cms_web_live_chat_rate_limits.expires_at <= now() THEN 1
              ELSE cms_web_live_chat_rate_limits.request_count + 1
            END,
            expires_at = CASE
              WHEN cms_web_live_chat_rate_limits.expires_at <= now()
                THEN now() + (? * interval '1 millisecond')
              ELSE cms_web_live_chat_rate_limits.expires_at
            END
        WHERE cms_web_live_chat_rate_limits.expires_at <= now()
           OR cms_web_live_chat_rate_limits.request_count < ?
        RETURNING request_count
        """, (rs, rowNum) -> rs.getInt("request_count"),
        keyHash, action, millis(window), millis(window), limit).isEmpty();
  }

  public List<CmsConversationSummary> recentConversations(int limit) {
    return jdbc.query("""
        WITH current_generation AS (
          SELECT configuration_generation
          FROM cms_telegram_live_chat_settings
          WHERE id = 'default'
        ), visible_conversations AS (
          SELECT actionable.*
          FROM cms_web_live_chat_conversations actionable
          WHERE actionable.state <> 'closed'
          UNION ALL
          SELECT recent_closed.*
          FROM (
            SELECT closed.*
            FROM cms_web_live_chat_conversations closed
            WHERE closed.state = 'closed'
              AND closed.configuration_generation = (
                SELECT configuration_generation FROM current_generation
              )
            ORDER BY closed.updated_at DESC, closed.id DESC
            LIMIT ?
          ) recent_closed
        )
        SELECT c.*,
          (SELECT COUNT(*) FROM cms_web_live_chat_messages m
           WHERE m.conversation_id = c.id) AS message_count,
          (SELECT COUNT(*) FROM cms_web_live_chat_messages m
           WHERE m.conversation_id = c.id AND m.direction = 'team'
             AND m.id > COALESCE(c.last_read_team_message_id, 0)) AS unread_count
        FROM visible_conversations c
        ORDER BY c.updated_at DESC, c.id DESC
        """, this::mapCmsConversationSummary, Math.max(1, Math.min(limit, 100)));
  }

  private Conversation transition(String sql, Object... args) {
    return one(jdbc.query(sql, this::mapConversation, args));
  }

  private Visitor mapVisitor(ResultSet rs, int rowNum) throws SQLException {
    return new Visitor(
        rs.getString("id"), instant(rs, "expires_at"), instant(rs, "last_seen_at"),
        instant(rs, "created_at"), instant(rs, "updated_at")
    );
  }

  private Conversation mapConversation(ResultSet rs, int rowNum) throws SQLException {
    return new Conversation(
        rs.getString("id"), rs.getString("visitor_id"), rs.getLong("configuration_generation"),
        text(rs.getString("target_chat_id")), text(rs.getString("inquiry_id")),
        text(rs.getString("locale")), text(rs.getString("state")),
        text(rs.getString("customer_name")), text(rs.getString("customer_contact")),
        text(rs.getString("inquiry_content")), text(rs.getString("consent_version")),
        instant(rs, "consented_at"), text(rs.getString("attention_code")),
        text(rs.getString("pending_action")), nullableLong(rs, "pending_message_id"),
        text(rs.getString("pending_client_message_key")), nullableLong(rs, "topic_thread_id"),
        nullableLong(rs, "topic_root_message_id"), nullableLong(rs, "last_read_team_message_id"),
        instant(rs, "last_activity_at"), instant(rs, "created_at"), instant(rs, "updated_at"),
        nullableInstant(rs, "closed_at")
    );
  }

  private Message mapMessage(ResultSet rs, int rowNum) throws SQLException {
    return new Message(
        rs.getLong("id"), rs.getString("conversation_id"), text(rs.getString("direction")),
        text(rs.getString("body")), text(rs.getString("delivery_state")),
        text(rs.getString("client_message_key")), nullableLong(rs, "telegram_message_id"),
        instant(rs, "created_at")
    );
  }

  private VisitorMessageClaim mapVisitorMessageClaim(ResultSet rs, int rowNum) throws SQLException {
    return new VisitorMessageClaim(mapMessage(rs, rowNum), text(rs.getString("claim_status")));
  }

  private CloseResult mapCloseResult(ResultSet rs, int rowNum) throws SQLException {
    var event = new Message(
        rs.getLong("event_id"), rs.getString("event_conversation_id"),
        text(rs.getString("event_direction")), text(rs.getString("event_body")),
        text(rs.getString("event_delivery_state")),
        text(rs.getString("event_client_message_key")),
        nullableLong(rs, "event_telegram_message_id"), instant(rs, "event_created_at")
    );
    return new CloseResult(mapConversation(rs, rowNum), event);
  }

  private CmsConversationSummary mapCmsConversationSummary(ResultSet rs, int rowNum)
      throws SQLException {
    return new CmsConversationSummary(
        mapConversation(rs, rowNum), rs.getLong("message_count"), rs.getLong("unread_count")
    );
  }

  private static long nullableLong(ResultSet rs, String column) throws SQLException {
    return rs.getObject(column) == null ? 0 : rs.getLong(column);
  }

  private static Instant instant(ResultSet rs, String column) throws SQLException {
    var value = nullableInstant(rs, column);
    if (value == null) {
      throw new SQLException("Missing timestamp: " + column);
    }
    return value;
  }

  private static Instant nullableInstant(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? null : value.toInstant();
  }

  private static OffsetDateTime databaseTime(Instant value) {
    return value == null ? null : OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
  }

  private static long millis(Duration duration) {
    return duration.toMillis();
  }

  private static String text(String value) {
    return value == null ? "" : value.trim();
  }

  private static <T> T one(List<T> rows) {
    return rows.isEmpty() ? null : rows.get(0);
  }

  public record Visitor(
      String id,
      Instant expiresAt,
      Instant lastSeenAt,
      Instant createdAt,
      Instant updatedAt
  ) {}

  public record Conversation(
      String id,
      String visitorId,
      long configurationGeneration,
      String targetChatId,
      String inquiryId,
      String locale,
      String state,
      String customerName,
      String customerContact,
      String inquiryContent,
      String consentVersion,
      Instant consentedAt,
      String attentionCode,
      String pendingAction,
      long pendingMessageId,
      String pendingClientMessageKey,
      long topicThreadId,
      long topicRootMessageId,
      long lastReadTeamMessageId,
      Instant lastActivityAt,
      Instant createdAt,
      Instant updatedAt,
      Instant closedAt
  ) {}

  public record Message(
      long id,
      String conversationId,
      String direction,
      String body,
      String deliveryState,
      String clientMessageKey,
      long telegramMessageId,
      Instant createdAt
  ) {}

  public record VisitorMessageClaim(Message message, String status) {}

  public record CloseResult(Conversation conversation, Message event) {}

  public record CmsConversationSummary(
      Conversation conversation,
      long messageCount,
      long unreadCount
  ) {}

  public record SessionView(
      Conversation conversation,
      List<Message> messages,
      long unreadCount
  ) {
    public SessionView {
      messages = messages == null ? List.of() : List.copyOf(messages);
    }
  }
}
