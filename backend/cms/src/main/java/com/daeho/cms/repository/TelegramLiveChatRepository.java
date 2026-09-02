package com.daeho.cms.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class TelegramLiveChatRepository {
  private final JdbcTemplate jdbc;

  public TelegramLiveChatRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Settings settings() {
    return jdbc.query(
        "SELECT * FROM cms_telegram_live_chat_settings WHERE id = 'default'",
        this::mapSettings
    ).stream().findFirst().orElse(Settings.empty());
  }

  public Settings settingsForUpdate() {
    return jdbc.query(
        "SELECT * FROM cms_telegram_live_chat_settings WHERE id = 'default' FOR UPDATE",
        this::mapSettings
    ).stream().findFirst().orElse(Settings.empty());
  }

  @Transactional
  public Settings saveDraft(
      String tokenCiphertext,
      String targetChatId,
      String topicName,
      boolean enabled,
      boolean connectionChanged
  ) {
    jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          enabled = CASE WHEN ? THEN false ELSE ? END,
          bot_token_ciphertext = ?,
          target_chat_id = ?,
          topic_name = ?,
          bot_username = CASE WHEN ? THEN '' ELSE bot_username END,
          message_thread_id = CASE WHEN ? THEN '' ELSE message_thread_id END,
          webhook_secret_hash = CASE WHEN ? THEN '' ELSE webhook_secret_hash END,
          setup_state = CASE WHEN ? THEN 'idle' ELSE setup_state END,
          setup_error_code = CASE WHEN ? THEN '' ELSE setup_error_code END,
          setup_attempt_id = CASE WHEN ? THEN '' ELSE setup_attempt_id END,
          configuration_generation = CASE
            WHEN ? THEN configuration_generation + 1
            ELSE configuration_generation
          END,
          verified_at = CASE WHEN ? THEN NULL ELSE verified_at END,
          updated_at = now()
        WHERE id = 'default'
        """,
        connectionChanged,
        enabled,
        text(tokenCiphertext),
        text(targetChatId),
        firstNonBlank(topicName, "실시간 상담"),
        connectionChanged,
        connectionChanged,
        connectionChanged,
        connectionChanged,
        connectionChanged,
        connectionChanged,
        connectionChanged,
        connectionChanged
    );
    return settings();
  }

  @Transactional
  public Settings markConnected(
      String botUsername,
      String messageThreadId,
      String secretHash,
      String expectedTokenCiphertext,
      String expectedTargetChatId,
      String expectedAttemptId
  ) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          bot_username = ?,
          message_thread_id = ?,
          webhook_secret_hash = ?,
          setup_state = 'idle',
          setup_error_code = '',
          setup_attempt_id = '',
          verified_at = now(),
          updated_at = now()
        WHERE id = 'default'
          AND setup_state = 'connecting'
          AND bot_token_ciphertext = ?
          AND target_chat_id = ?
          AND setup_attempt_id = ?
        """,
        text(botUsername),
        text(messageThreadId),
        text(secretHash),
        text(expectedTokenCiphertext),
        text(expectedTargetChatId),
        text(expectedAttemptId)
    );
    if (updated != 1) {
      throw new IllegalStateException("Live-chat settings changed during connection setup.");
    }
    return settings();
  }

  @Transactional
  public Settings saveMessageThreadId(
      String messageThreadId,
      String expectedTokenCiphertext,
      String expectedTargetChatId,
      String expectedAttemptId
  ) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          message_thread_id = ?,
          updated_at = now()
        WHERE id = 'default'
          AND setup_state = 'connecting'
          AND bot_token_ciphertext = ?
          AND target_chat_id = ?
          AND setup_attempt_id = ?
          AND (message_thread_id = '' OR message_thread_id = ?)
        """,
        text(messageThreadId),
        text(expectedTokenCiphertext),
        text(expectedTargetChatId),
        text(expectedAttemptId),
        text(messageThreadId)
    );
    if (updated != 1) {
      throw new IllegalStateException("Live-chat settings changed during Topic creation.");
    }
    return settings();
  }

  @Transactional
  public Settings beginConnect(String attemptId) {
    var claimed = jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          setup_state = 'connecting',
          setup_error_code = '',
          setup_attempt_id = ?,
          updated_at = now()
        WHERE id = 'default'
          AND setup_state = 'idle'
        """, text(attemptId));
    return claimed == 1 ? settings() : null;
  }

  @Transactional
  public Settings finishConnectFailure(String errorCode, String expectedAttemptId) {
    var code = text(errorCode);
    jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          setup_state = ?,
          setup_error_code = ?,
          setup_attempt_id = CASE WHEN ? = '' THEN '' ELSE setup_attempt_id END,
          updated_at = now()
        WHERE id = 'default'
          AND setup_state = 'connecting'
          AND setup_attempt_id = ?
        """,
        code.isBlank() ? "idle" : "needs_attention",
        code,
        code,
        text(expectedAttemptId)
    );
    return settings();
  }

  @Transactional
  public Settings resetConnectSetup() {
    var reset = jdbc.update("""
        UPDATE cms_telegram_live_chat_settings SET
          enabled = false,
          bot_username = '',
          webhook_secret_hash = '',
          setup_state = 'idle',
          setup_error_code = '',
          setup_attempt_id = '',
          verified_at = NULL,
          updated_at = now()
        WHERE id = 'default'
          AND (
            setup_state = 'needs_attention'
            OR (setup_state = 'connecting' AND updated_at < now() - interval '2 minutes')
          )
        """);
    return reset == 1 ? settings() : null;
  }

  @Transactional
  public Settings setEnabled(boolean enabled) {
    jdbc.update(
        "UPDATE cms_telegram_live_chat_settings SET enabled = ?, updated_at = now() WHERE id = 'default'",
        enabled
    );
    return settings();
  }

  public UpdateClaim claimUpdate(long updateId, long expectedGeneration, String claimToken) {
    var claimed = jdbc.update("""
        INSERT INTO cms_telegram_live_chat_updates (
          configuration_generation, update_id, status, claim_token, created_at, updated_at
        )
        SELECT ?, ?, 'processing', ?, now(), now()
        FROM cms_telegram_live_chat_settings
        WHERE id = 'default'
          AND configuration_generation = ?
        ON CONFLICT (configuration_generation, update_id) DO UPDATE SET
          status = 'processing',
          claim_token = excluded.claim_token,
          updated_at = now()
        WHERE cms_telegram_live_chat_updates.status = 'processing'
          AND cms_telegram_live_chat_updates.updated_at < now() - interval '10 minutes'
        """, expectedGeneration, updateId, text(claimToken), expectedGeneration);
    if (claimed == 0 && !isCurrentGeneration(expectedGeneration)) {
      throw new IllegalStateException("The live-chat configuration changed during webhook handling.");
    }
    if (claimed == 1) {
      return UpdateClaim.CLAIMED;
    }
    var status = jdbc.queryForObject("""
        SELECT status
        FROM cms_telegram_live_chat_updates
        WHERE configuration_generation = ?
          AND update_id = ?
        """, String.class, expectedGeneration, updateId);
    return "completed".equals(status) ? UpdateClaim.COMPLETED : UpdateClaim.IN_PROGRESS;
  }

  public void completeUpdate(long updateId, long expectedGeneration, String claimToken) {
    var completed = jdbc.update("""
        UPDATE cms_telegram_live_chat_updates SET
          status = 'completed',
          updated_at = now()
        WHERE configuration_generation = ?
          AND update_id = ?
          AND status = 'processing'
          AND claim_token = ?
        """, expectedGeneration, updateId, text(claimToken));
    if (completed != 1) {
      throw new IllegalStateException("The Telegram update claim changed during processing.");
    }
  }

  public void releaseUpdate(long updateId, long expectedGeneration, String claimToken) {
    jdbc.update("""
        DELETE FROM cms_telegram_live_chat_updates
        WHERE configuration_generation = ?
          AND update_id = ?
          AND status = 'processing'
          AND claim_token = ?
        """, expectedGeneration, updateId, text(claimToken));
  }

  public Session session(long telegramChatId, long expectedGeneration) {
    return jdbc.query("""
        SELECT s.*
        FROM cms_telegram_live_chat_sessions s
        WHERE s.configuration_generation = ?
          AND s.telegram_chat_id = ?
          AND s.state <> 'closed'
        ORDER BY s.updated_at DESC
        LIMIT 1
        """, this::mapSession, expectedGeneration, telegramChatId).stream().findFirst().orElse(null);
  }

  @Transactional
  public Session saveSession(
      long telegramChatId,
      long telegramUserId,
      String state,
      String locale,
      String customerName,
      String customerContact,
      long expectedGeneration
  ) {
    if ("closed".equals(text(state))) {
      var closed = jdbc.update("""
          UPDATE cms_telegram_live_chat_sessions SET
            telegram_user_id = ?,
            state = 'closed',
            locale = ?,
            customer_name = ?,
            customer_contact = ?,
            attention_code = '',
            updated_at = now()
          WHERE configuration_generation = ?
            AND telegram_chat_id = ?
            AND state <> 'closed'
          """,
          telegramUserId,
          "en".equals(locale) ? "en" : "ko",
          text(customerName),
          text(customerContact),
          expectedGeneration,
          telegramChatId
      );
      if (closed != 1) {
        throw new IllegalStateException("The live-chat registration could not be closed.");
      }
      return latestSession(telegramChatId, expectedGeneration);
    }
    jdbc.update("""
        INSERT INTO cms_telegram_live_chat_sessions (
          id, configuration_generation, target_chat_id,
          telegram_chat_id, telegram_user_id, state, locale,
          customer_name, customer_contact, created_at, updated_at
        )
        SELECT ?, configuration_generation, target_chat_id, ?, ?, ?, ?, ?, ?, now(), now()
        FROM cms_telegram_live_chat_settings
        WHERE id = 'default'
          AND configuration_generation = ?
        ON CONFLICT (configuration_generation, telegram_chat_id) WHERE state <> 'closed' DO UPDATE SET
          telegram_user_id = excluded.telegram_user_id,
          state = excluded.state,
          locale = excluded.locale,
          customer_name = excluded.customer_name,
          customer_contact = excluded.customer_contact,
          updated_at = now()
        """,
        UUID.randomUUID().toString(),
        telegramChatId,
        telegramUserId,
        text(state),
        "en".equals(locale) ? "en" : "ko",
        text(customerName),
        text(customerContact),
        expectedGeneration
    );
    if (!isCurrentGeneration(expectedGeneration)) {
      throw new IllegalStateException("The live-chat configuration changed during session update.");
    }
    return session(telegramChatId, expectedGeneration);
  }

  @Transactional
  public Session attachInquiry(long telegramChatId, String inquiryId, long expectedGeneration) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          inquiry_id = ?,
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND EXISTS (
            SELECT 1 FROM cms_telegram_live_chat_settings
            WHERE id = 'default' AND configuration_generation = ?
          )
          AND (inquiry_id IS NULL OR inquiry_id = '' OR inquiry_id = ?)
        """,
        text(inquiryId), telegramChatId, expectedGeneration, expectedGeneration, text(inquiryId)
    );
    var current = session(telegramChatId, expectedGeneration);
    if (updated != 1 && (current == null || !text(inquiryId).equals(current.inquiryId()))) {
      throw new IllegalStateException("The live-chat configuration changed during inquiry creation.");
    }
    return current;
  }

  @Transactional
  public Session claimConversationOpen(
      long telegramChatId,
      long telegramUserId,
      String locale,
      String customerName,
      String customerContact,
      String inquiryContent,
      long sourceMessageId,
      long expectedGeneration
  ) {
    var claimed = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          telegram_user_id = ?,
          locale = ?,
          customer_name = ?,
          customer_contact = ?,
          inquiry_content = ?,
          state = 'needs_attention',
          attention_code = 'registration_delivery_pending',
          pending_customer_message_id = ?,
          pending_direction = 'registration',
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND EXISTS (
            SELECT 1 FROM cms_telegram_live_chat_settings
            WHERE id = 'default' AND configuration_generation = ?
          )
          AND state = 'awaiting_content'
        """,
        telegramUserId,
        "en".equals(locale) ? "en" : "ko",
        text(customerName),
        text(customerContact),
        text(inquiryContent),
        sourceMessageId,
        telegramChatId,
        expectedGeneration,
        expectedGeneration
    );
    if (claimed == 0 && !isCurrentGeneration(expectedGeneration)) {
      throw new IllegalStateException("The live-chat configuration changed during registration.");
    }
    return claimed == 1 ? session(telegramChatId, expectedGeneration) : null;
  }

  @Transactional
  public Session resetConversationOpen(long telegramChatId, long expectedGeneration) {
    jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = 'awaiting_content',
          attention_code = '',
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND state = 'needs_attention'
          AND topic_root_message_id IS NULL
        """, telegramChatId, expectedGeneration);
    return session(telegramChatId, expectedGeneration);
  }

  @Transactional
  public Session markNeedsAttention(
      long telegramChatId,
      String attentionCode,
      long pendingGroupMessageId,
      long expectedGeneration
  ) {
    jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = 'needs_attention',
          attention_code = ?,
          pending_group_message_id = CASE WHEN ? > 0 THEN ? ELSE NULL END,
          pending_direction = CASE WHEN ? > 0 THEN 'registration' ELSE '' END,
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND state <> 'active'
        """,
        text(attentionCode),
        pendingGroupMessageId,
        pendingGroupMessageId,
        pendingGroupMessageId,
        telegramChatId,
        expectedGeneration
    );
    return session(telegramChatId, expectedGeneration);
  }

  @Transactional
  public Session recordTopicThread(
      long telegramChatId,
      long topicThreadId,
      long expectedGeneration
  ) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          topic_thread_id = ?,
          attention_code = 'registration_delivery_pending',
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND state = 'needs_attention'
          AND attention_code = 'topic_creation_in_flight'
          AND (topic_thread_id IS NULL OR topic_thread_id = ?)
        """, topicThreadId, telegramChatId, expectedGeneration, topicThreadId);
    if (updated != 1) {
      throw new IllegalStateException("The Telegram conversation Topic could not be recorded.");
    }
    return session(telegramChatId, expectedGeneration);
  }

  @Transactional
  public Session reserveTopicCreation(String sessionId, long expectedGeneration) {
    var reserved = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = 'topic_creation_in_flight',
          updated_at = now()
        WHERE id = ?
          AND configuration_generation = ?
          AND state = 'needs_attention'
          AND attention_code = 'registration_delivery_pending'
          AND (topic_thread_id IS NULL OR topic_thread_id = 0)
        """, text(sessionId), expectedGeneration);
    return reserved == 1 ? sessionById(sessionId) : null;
  }

  @Transactional
  public Session reserveDelivery(
      String sessionId,
      String attentionCode,
      long customerMessageId,
      long groupMessageId,
      long expectedGeneration
  ) {
    var reserved = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = ?,
          pending_customer_message_id = CASE WHEN ? > 0 THEN ? ELSE NULL END,
          pending_group_message_id = CASE WHEN ? > 0 THEN ? ELSE NULL END,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
          AND configuration_generation = ?
          AND EXISTS (
            SELECT 1 FROM cms_telegram_live_chat_settings
            WHERE id = 'default' AND configuration_generation = ?
          )
          AND attention_code = ''
        """,
        text(attentionCode),
        customerMessageId, customerMessageId,
        groupMessageId, groupMessageId,
        text(sessionId),
        expectedGeneration,
        expectedGeneration
    );
    return reserved == 1 ? sessionById(sessionId) : null;
  }

  @Transactional
  public Session transitionDeliveryIssue(
      String sessionId,
      String expectedAttentionCode,
      String nextAttentionCode,
      long customerMessageId,
      long groupMessageId,
      String direction
  ) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = ?,
          pending_customer_message_id = CASE WHEN ? > 0 THEN ? ELSE NULL END,
          pending_group_message_id = CASE WHEN ? > 0 THEN ? ELSE NULL END,
          pending_direction = ?,
          updated_at = now()
        WHERE id = ?
          AND attention_code = ?
        """,
        text(nextAttentionCode),
        customerMessageId, customerMessageId,
        groupMessageId, groupMessageId,
        text(direction),
        text(sessionId),
        text(expectedAttentionCode)
    );
    if (updated != 1) {
      throw new IllegalStateException("The live-chat delivery state changed concurrently.");
    }
    return sessionById(sessionId);
  }

  @Transactional
  public Session claimDeliveryRetry(String sessionId) {
    var claimed = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = CASE attention_code
            WHEN 'registration_delivery_uncertain' THEN 'registration_delivery_retrying'
            WHEN 'registration_delivery_in_flight' THEN 'registration_delivery_retrying'
            WHEN 'customer_delivery_uncertain' THEN 'customer_delivery_retrying'
            WHEN 'customer_delivery_in_flight' THEN 'customer_delivery_retrying'
            WHEN 'team_delivery_uncertain' THEN 'team_delivery_retrying'
            WHEN 'team_delivery_in_flight' THEN 'team_delivery_retrying'
            ELSE attention_code
          END,
          updated_at = now()
        WHERE id = ?
          AND configuration_generation = (
            SELECT configuration_generation
            FROM cms_telegram_live_chat_settings
            WHERE id = 'default'
          )
          AND (
            attention_code IN (
              'registration_delivery_uncertain',
              'customer_delivery_uncertain',
              'team_delivery_uncertain'
            )
            OR (
              attention_code IN (
                'registration_delivery_in_flight',
                'customer_delivery_in_flight',
                'team_delivery_in_flight',
                'registration_delivery_retrying',
                'customer_delivery_retrying',
                'team_delivery_retrying'
              )
              AND updated_at < now() - interval '2 minutes'
            )
          )
        """, text(sessionId));
    return claimed == 1 ? sessionById(sessionId) : null;
  }

  public boolean hasCustomerSourceMapping(String sessionId, long customerMessageId) {
    var count = jdbc.queryForObject("""
        SELECT count(*)
        FROM cms_telegram_live_chat_messages
        WHERE session_id = ?
          AND direction IN ('registration', 'customer_to_team')
          AND customer_message_id = ?
        """, Integer.class, text(sessionId), customerMessageId);
    return count != null && count > 0;
  }

  public boolean hasGroupSourceMapping(String sessionId, long groupMessageId) {
    var count = jdbc.queryForObject("""
        SELECT count(*)
        FROM cms_telegram_live_chat_messages
        WHERE session_id = ?
          AND direction = 'team_to_customer'
          AND group_message_id = ?
        """, Integer.class, text(sessionId), groupMessageId);
    return count != null && count > 0;
  }

  @Transactional
  public Session clearDeliveryIssue(String sessionId, String expectedAttentionCode) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = '',
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
          AND attention_code = ?
        """, text(sessionId), text(expectedAttentionCode));
    if (updated != 1) {
      throw new IllegalStateException("The live-chat delivery warning changed during recovery.");
    }
    return sessionById(sessionId);
  }

  @Transactional
  public Session activateAndRecordRoot(
      long telegramChatId,
      String inquiryId,
      long rootMessageId,
      long expectedGeneration
  ) {
    var opening = session(telegramChatId, expectedGeneration);
    if (opening == null
        || !"needs_attention".equals(opening.state())
        || opening.topicThreadId() <= 0
        || opening.pendingCustomerMessageId() <= 0) {
      throw new IllegalStateException("The live-chat registration source is unavailable.");
    }
    jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          inquiry_id = ?,
          topic_root_message_id = ?,
          state = 'active',
          attention_code = '',
          updated_at = now()
        WHERE telegram_chat_id = ?
          AND configuration_generation = ?
          AND state = 'needs_attention'
          AND (inquiry_id IS NULL OR inquiry_id = '' OR inquiry_id = ?)
        """, text(inquiryId), rootMessageId, telegramChatId, expectedGeneration, text(inquiryId));
    var active = session(telegramChatId, expectedGeneration);
    if (active == null || !"active".equals(active.state()) || active.topicRootMessageId() != rootMessageId) {
      throw new IllegalStateException("The live-chat session could not be activated.");
    }
    ensureMessageMapping(
        active.id(), "registration", opening.pendingCustomerMessageId(), rootMessageId
    );
    jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
        """, active.id());
    return session(telegramChatId, expectedGeneration);
  }

  @Transactional
  public Session reconcile(String sessionId) {
    var current = jdbc.query(
        "SELECT * FROM cms_telegram_live_chat_sessions WHERE id = ? FOR UPDATE",
        this::mapSession,
        text(sessionId)
    ).stream().findFirst().orElse(null);
    if (current == null || current.attentionCode().isBlank()) {
      return current;
    }
    if (current.attentionCode().endsWith("_delivery_uncertain")
        || current.attentionCode().endsWith("_delivery_in_flight")
        || current.attentionCode().endsWith("_delivery_retrying")) {
      throw new IllegalStateException(
          "Uncertain Telegram delivery must be verified and retried explicitly."
      );
    }
    if (current.attentionCode().startsWith("topic_creation_")) {
      throw new IllegalStateException(
          "A possible Telegram Topic must be checked before this session can be reset."
      );
    }
    if ("registration".equals(current.pendingDirection())
        && current.pendingGroupMessageId() > 0
        && !current.inquiryId().isBlank()) {
      return activateAndRecordRoot(
          current.telegramChatId(),
          current.inquiryId(),
          current.pendingGroupMessageId(),
          currentConfigurationGeneration()
      );
    }
    if (("customer_to_team".equals(current.pendingDirection())
        || "team_to_customer".equals(current.pendingDirection()))
        && current.pendingGroupMessageId() > 0) {
      ensureMessageMapping(
          current.id(),
          current.pendingDirection(),
          current.pendingCustomerMessageId(),
          current.pendingGroupMessageId()
      );
    }
    var nextState = "needs_attention".equals(current.state()) ? "awaiting_content" : current.state();
    jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = ?,
          attention_code = '',
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
        """, nextState, current.id());
    return sessionById(sessionId);
  }

  @Transactional
  public Session confirmTopicMissingAndReset(String sessionId) {
    var reset = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = 'awaiting_content',
          attention_code = '',
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
          AND state = 'needs_attention'
          AND topic_thread_id IS NULL
          AND attention_code IN (
            'topic_creation_in_flight',
            'topic_creation_uncertain',
            'topic_creation_failed'
          )
        """, text(sessionId));
    return reset == 1 ? sessionById(sessionId) : null;
  }

  public Session sessionById(String sessionId) {
    return jdbc.query(
        "SELECT * FROM cms_telegram_live_chat_sessions WHERE id = ?",
        this::mapSession,
        text(sessionId)
    ).stream().findFirst().orElse(null);
  }

  private Session latestSession(long telegramChatId, long expectedGeneration) {
    return jdbc.query("""
        SELECT *
        FROM cms_telegram_live_chat_sessions
        WHERE configuration_generation = ?
          AND telegram_chat_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        """, this::mapSession, expectedGeneration, telegramChatId)
        .stream().findFirst().orElse(null);
  }

  @Transactional
  public void recordCustomerMessage(
      String sessionId,
      long customerMessageId,
      long groupMessageId
  ) {
    ensureMessageMapping(
        text(sessionId), "customer_to_team", customerMessageId, groupMessageId
    );
  }

  public Session sessionForGroupMessage(
      long groupMessageId,
      long expectedGeneration,
      String expectedGroupChatId
  ) {
    return jdbc.query("""
        SELECT s.*
        FROM cms_telegram_live_chat_messages m
        JOIN cms_telegram_live_chat_sessions s ON s.id = m.session_id
        WHERE m.configuration_generation = ?
          AND m.group_chat_id = ?
          AND m.group_message_id = ?
        """,
        this::mapSession,
        expectedGeneration,
        text(expectedGroupChatId),
        groupMessageId
    ).stream().findFirst().orElse(null);
  }

  public Session sessionForThread(
      long topicThreadId,
      long expectedGeneration,
      String expectedGroupChatId
  ) {
    return jdbc.query("""
        SELECT s.*
        FROM cms_telegram_live_chat_sessions s
        WHERE s.configuration_generation = ?
          AND s.target_chat_id = ?
          AND s.topic_thread_id = ?
          AND s.state = 'active'
        """, this::mapSession, expectedGeneration, text(expectedGroupChatId), topicThreadId)
        .stream().findFirst().orElse(null);
  }

  @Transactional
  public Session closeSession(String sessionId, long expectedGeneration) {
    var closed = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = 'closed',
          attention_code = CASE
            WHEN topic_thread_id IS NOT NULL AND topic_thread_id > 0
              THEN 'topic_close_in_flight'
            ELSE ''
          END,
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
          AND configuration_generation = ?
          AND state = 'active'
        """, text(sessionId), expectedGeneration);
    return closed == 1 ? sessionById(sessionId) : null;
  }

  @Transactional
  public Session closeSession(String sessionId) {
    var closed = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          state = 'closed',
          attention_code = CASE
            WHEN topic_thread_id IS NOT NULL AND topic_thread_id > 0
              THEN 'topic_close_in_flight'
            ELSE ''
          END,
          pending_customer_message_id = NULL,
          pending_group_message_id = NULL,
          pending_direction = '',
          updated_at = now()
        WHERE id = ?
          AND state = 'active'
        """, text(sessionId));
    return closed == 1 ? sessionById(sessionId) : null;
  }

  public boolean sessionUsesGeneration(String sessionId, long expectedGeneration) {
    var count = jdbc.queryForObject("""
        SELECT count(*)
        FROM cms_telegram_live_chat_sessions
        WHERE id = ?
          AND configuration_generation = ?
        """, Integer.class, text(sessionId), expectedGeneration);
    return count != null && count == 1;
  }

  @Transactional
  public Session markTopicCloseIssue(String sessionId, String attentionCode) {
    var updated = jdbc.update("""
        UPDATE cms_telegram_live_chat_sessions SET
          attention_code = ?,
          updated_at = now()
        WHERE id = ?
          AND state = 'closed'
          AND attention_code = 'topic_close_in_flight'
          AND topic_thread_id IS NOT NULL
          AND topic_thread_id > 0
        """, text(attentionCode), text(sessionId));
    return updated == 1 ? sessionById(sessionId) : null;
  }

  @Transactional
  public void recordTeamMessage(String sessionId, long groupMessageId, long customerMessageId) {
    ensureMessageMapping(
        text(sessionId), "team_to_customer", customerMessageId, groupMessageId
    );
  }

  private void ensureMessageMapping(
      String sessionId,
      String direction,
      long customerMessageId,
      long groupMessageId
  ) {
    jdbc.update("""
        INSERT INTO cms_telegram_live_chat_messages (
          id, session_id, direction, customer_message_id, group_message_id,
          configuration_generation, group_chat_id
        )
        SELECT ?, s.id, ?, ?, ?, s.configuration_generation, s.target_chat_id
        FROM cms_telegram_live_chat_sessions s
        WHERE s.id = ?
        ON CONFLICT DO NOTHING
        """,
        UUID.randomUUID().toString(), text(direction),
        customerMessageId, groupMessageId, text(sessionId)
    );
    var matching = jdbc.queryForObject("""
        SELECT count(*)
        FROM cms_telegram_live_chat_messages
        WHERE session_id = ?
          AND direction = ?
          AND customer_message_id = ?
          AND group_message_id = ?
        """,
        Integer.class,
        text(sessionId), text(direction), customerMessageId, groupMessageId
    );
    if (matching == null || matching != 1) {
      throw new IllegalStateException("The Telegram message is mapped to another conversation.");
    }
  }

  public List<Session> recentSessions(int limit) {
    return jdbc.query("""
        WITH current_generation AS (
          SELECT configuration_generation
          FROM cms_telegram_live_chat_settings
          WHERE id = 'default'
        ), visible_sessions AS (
          SELECT active_or_registering.*
          FROM cms_telegram_live_chat_sessions active_or_registering
          WHERE active_or_registering.state <> 'closed'
             OR active_or_registering.attention_code LIKE 'topic_close_%'
          UNION ALL
          SELECT recent_closed.*
          FROM (
            SELECT closed.*
            FROM cms_telegram_live_chat_sessions closed
            WHERE closed.state = 'closed'
              AND closed.attention_code NOT LIKE 'topic_close_%'
              AND closed.configuration_generation = (
                SELECT configuration_generation FROM current_generation
              )
            ORDER BY closed.updated_at DESC, closed.id DESC
            LIMIT ?
          ) recent_closed
        )
        SELECT *
        FROM visible_sessions
        ORDER BY updated_at DESC, id DESC
        """, this::mapSession, Math.max(1, Math.min(limit, 100)));
  }

  private Settings mapSettings(ResultSet rs, int rowNum) throws SQLException {
    return new Settings(
        rs.getBoolean("enabled"),
        text(rs.getString("bot_token_ciphertext")),
        text(rs.getString("bot_username")),
        text(rs.getString("target_chat_id")),
        text(rs.getString("message_thread_id")),
        firstNonBlank(rs.getString("topic_name"), "실시간 상담"),
        text(rs.getString("webhook_secret_hash")),
        text(rs.getString("setup_state")),
        text(rs.getString("setup_error_code")),
        rs.getLong("configuration_generation"),
        rs.getObject("verified_at") == null ? "" : rs.getObject("verified_at").toString(),
        rs.getObject("updated_at") == null ? "" : rs.getObject("updated_at").toString()
    );
  }

  private Session mapSession(ResultSet rs, int rowNum) throws SQLException {
    return new Session(
        rs.getString("id"),
        rs.getLong("telegram_chat_id"),
        rs.getLong("telegram_user_id"),
        text(rs.getString("inquiry_id")),
        text(rs.getString("locale")),
        text(rs.getString("state")),
        text(rs.getString("customer_name")),
        text(rs.getString("customer_contact")),
        text(rs.getString("inquiry_content")),
        text(rs.getString("attention_code")),
        rs.getObject("pending_customer_message_id") == null
            ? 0 : rs.getLong("pending_customer_message_id"),
        rs.getObject("pending_group_message_id") == null ? 0 : rs.getLong("pending_group_message_id"),
        text(rs.getString("pending_direction")),
        rs.getObject("topic_thread_id") == null ? 0 : rs.getLong("topic_thread_id"),
        rs.getObject("topic_root_message_id") == null ? 0 : rs.getLong("topic_root_message_id"),
        instant(rs, "created_at"),
        instant(rs, "updated_at")
    );
  }

  private Instant instant(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? null : value.toInstant();
  }

  private String firstNonBlank(String value, String fallback) {
    var normalized = text(value);
    return normalized.isBlank() ? fallback : normalized;
  }

  private boolean isCurrentGeneration(long expectedGeneration) {
    return currentConfigurationGeneration() == expectedGeneration;
  }

  private long currentConfigurationGeneration() {
    var generation = jdbc.queryForObject("""
        SELECT configuration_generation
        FROM cms_telegram_live_chat_settings
        WHERE id = 'default'
        """, Long.class);
    return generation == null ? -1 : generation;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }

  public record Settings(
      boolean enabled,
      String botTokenCiphertext,
      String botUsername,
      String targetChatId,
      String messageThreadId,
      String topicName,
      String webhookSecretHash,
      String setupState,
      String setupErrorCode,
      long configurationGeneration,
      String verifiedAt,
      String updatedAt
  ) {
    public static Settings empty() {
      return new Settings(false, "", "", "", "", "실시간 상담", "", "idle", "", 1, "", "");
    }

    public Settings(
        boolean enabled,
        String botTokenCiphertext,
        String botUsername,
        String targetChatId,
        String messageThreadId,
        String topicName,
        String webhookSecretHash,
        String setupState,
        String setupErrorCode,
        String verifiedAt,
        String updatedAt
    ) {
      this(
          enabled, botTokenCiphertext, botUsername, targetChatId, messageThreadId, topicName,
          webhookSecretHash, setupState, setupErrorCode, 1, verifiedAt, updatedAt
      );
    }

    public Settings(
        boolean enabled,
        String botTokenCiphertext,
        String botUsername,
        String targetChatId,
        String messageThreadId,
        String topicName,
        String webhookSecretHash,
        String verifiedAt,
        String updatedAt
    ) {
      this(
          enabled, botTokenCiphertext, botUsername, targetChatId, messageThreadId, topicName,
          webhookSecretHash, "idle", "", 1, verifiedAt, updatedAt
      );
    }

    public boolean connected() {
      return !botUsername.isBlank()
          && !targetChatId.isBlank()
          && !webhookSecretHash.isBlank()
          && !verifiedAt.isBlank();
    }
  }

  public record Session(
      String id,
      long telegramChatId,
      long telegramUserId,
      String inquiryId,
      String locale,
      String state,
      String customerName,
      String customerContact,
      String inquiryContent,
      String attentionCode,
      long pendingCustomerMessageId,
      long pendingGroupMessageId,
      String pendingDirection,
      long topicThreadId,
      long topicRootMessageId,
      Instant createdAt,
      Instant updatedAt
  ) {
    public Session(
        String id,
        long telegramChatId,
        long telegramUserId,
        String inquiryId,
        String locale,
        String state,
        String customerName,
        String customerContact,
        String attentionCode,
        long topicRootMessageId,
        Instant createdAt,
        Instant updatedAt
    ) {
      this(
          id, telegramChatId, telegramUserId, inquiryId, locale, state, customerName,
          customerContact, "", attentionCode, 0, 0, "", 0, topicRootMessageId, createdAt, updatedAt
      );
    }

    public Session(
        String id,
        long telegramChatId,
        long telegramUserId,
        String inquiryId,
        String locale,
        String state,
        String customerName,
        String customerContact,
        String attentionCode,
        long pendingCustomerMessageId,
        long pendingGroupMessageId,
        String pendingDirection,
        long topicRootMessageId,
        Instant createdAt,
        Instant updatedAt
    ) {
      this(
          id, telegramChatId, telegramUserId, inquiryId, locale, state, customerName,
          customerContact, "", attentionCode, pendingCustomerMessageId, pendingGroupMessageId,
          pendingDirection, 0, topicRootMessageId, createdAt, updatedAt
      );
    }
  }

  public enum UpdateClaim {
    CLAIMED,
    COMPLETED,
    IN_PROGRESS
  }
}
