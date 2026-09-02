package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class TelegramLiveChatServiceTest {
  private TelegramLiveChatRepository repository;
  private TelegramLiveChatCredentialService credentials;
  private TelegramLiveChatGateway gateway;
  private InquiryWorkflowService inquiries;
  private WebLiveChatTelegramBridge webBridge;
  private TelegramLiveChatService service;
  private TelegramLiveChatRepository.Settings settings;

  @BeforeEach
  void setUp() {
    repository = mock(TelegramLiveChatRepository.class);
    credentials = mock(TelegramLiveChatCredentialService.class);
    gateway = mock(TelegramLiveChatGateway.class);
    inquiries = mock(InquiryWorkflowService.class);
    webBridge = mock(WebLiveChatTelegramBridge.class);
    settings = new TelegramLiveChatRepository.Settings(
        true,
        "ciphertext",
        "DAEHO_LIVE_BOT",
        "-1001234567890",
        "777",
        "실시간 상담",
        "secret-hash",
        "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    var configured = new TelegramLiveChatCredentialService.Credentials(settings, "live-token");
    when(credentials.authenticatedWebhook("webhook-secret")).thenReturn(configured);
    when(credentials.current()).thenReturn(configured);
    when(repository.claimUpdate(anyLong(), eq(1L), anyString()))
        .thenReturn(TelegramLiveChatRepository.UpdateClaim.CLAIMED);
    when(webBridge.handleTeamMessage(anyMap(), any())).thenReturn(Optional.empty());
    when(webBridge.handlePrivateMessage(anyMap(), any())).thenReturn(Optional.empty());
    when(gateway.createForumTopic("live-token", "-1001234567890", "문의 · 홍길동"))
        .thenReturn(777L);
    when(repository.reserveTopicCreation("session-1", 1L)).thenReturn(
        new TelegramLiveChatRepository.Session(
            "session-1", 12345L, 12345L, "inquiry-live-1", "ko", "needs_attention",
            "홍길동", "01012345678", "반지 제작 상담", "topic_creation_in_flight",
            55L, 0L, "registration", 0L, 0L, Instant.EPOCH, Instant.EPOCH
        )
    );
    when(repository.recordTopicThread(12345L, 777L, 1L)).thenReturn(
        new TelegramLiveChatRepository.Session(
            "session-1", 12345L, 12345L, "inquiry-live-1", "ko", "needs_attention",
            "홍길동", "01012345678", "반지 제작 상담", "registration_delivery_pending",
            55L, 0L, "registration", 777L, 0L, Instant.EPOCH, Instant.EPOCH
        )
    );
    service = new TelegramLiveChatService(
        repository,
        credentials,
        gateway,
        inquiries,
        new TelegramLiveChatFlow(),
        webBridge
    );
  }

  @Test
  void completingContentCreatesACmsInquiryAndOpensTheTeamConversation() {
    var awaitingContact = session("awaiting_content", "홍길동", "01012345678", 0);
    var prepared = session("needs_attention", "홍길동", "01012345678", 0);
    var attached = sessionWithInquiry(
        "needs_attention",
        "홍길동",
        "01012345678",
        "inquiry-live-1",
        0
    );
    var active = session("active", "홍길동", "01012345678", 0);
    when(repository.session(12345L, 1L)).thenReturn(awaitingContact);
    when(repository.claimConversationOpen(
        12345L,
        12345L,
        "ko",
        "홍길동",
        "01012345678",
        "반지 제작 상담",
        55L,
        1L
    )).thenReturn(prepared);
    when(inquiries.createTelegram(anyMap(), anyMap())).thenReturn(Map.of("id", "inquiry-live-1"));
    when(repository.attachInquiry(12345L, "inquiry-live-1", 1L)).thenReturn(attached);
    when(gateway.sendMessage(
        eq("live-token"),
        eq("-1001234567890"),
        eq("777"),
        anyString(),
        anyMap(),
        any()
    )).thenReturn(900L);
    when(gateway.sendMessage(
        eq("live-token"),
        eq("12345"),
        eq(""),
        anyString(),
        anyMap(),
        any()
    )).thenReturn(901L);
    when(repository.activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L)).thenReturn(active);

    var result = service.handleWebhook(
        Map.of(
            "update_id", 101L,
            "message", Map.of(
                "message_id", 55L,
                "chat", Map.of("id", 12345L, "type", "private"),
                "from", Map.of("id", 12345L, "is_bot", false),
                "text", "반지 제작 상담"
            )
        ),
        "webhook-secret"
    );

    assertEquals("conversation_opened", result.status());
    verify(inquiries).createTelegram(anyMap(), anyMap());
    verify(repository).attachInquiry(12345L, "inquiry-live-1", 1L);
    verify(repository).reserveTopicCreation("session-1", 1L);
    verify(repository).activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L);
    verify(gateway).createForumTopic("live-token", "-1001234567890", "문의 · 홍길동");
    verify(gateway).sendMessage(
        "live-token",
        "-1001234567890",
        "777",
        "🔔 새 실시간 상담\n\n이름: 홍길동\n연락처: 01012345678\n문의 내용:\n반지 제작 상담",
        Map.of(),
        null
    );
  }

  @Test
  void retryingConversationOpenReusesTheAttachedInquiryInsteadOfCreatingADuplicate() {
    var awaitingContact = sessionWithInquiry(
        "awaiting_content",
        "홍길동",
        "01012345678",
        "inquiry-live-1",
        0
    );
    var prepared = sessionWithInquiry(
        "needs_attention",
        "홍길동",
        "01012345678",
        "inquiry-live-1",
        0
    );
    var active = sessionWithInquiry(
        "active",
        "홍길동",
        "01012345678",
        "inquiry-live-1",
        900L
    );
    when(repository.session(12345L, 1L)).thenReturn(awaitingContact);
    when(repository.claimConversationOpen(
        12345L,
        12345L,
        "ko",
        "홍길동",
        "01012345678",
        "반지 제작 상담",
        55L,
        1L
    )).thenReturn(prepared);
    when(gateway.sendMessage(
        eq("live-token"),
        eq("-1001234567890"),
        eq("777"),
        anyString(),
        anyMap(),
        any()
    )).thenReturn(900L);
    when(gateway.sendMessage(
        eq("live-token"),
        eq("12345"),
        eq(""),
        anyString(),
        anyMap(),
        any()
    )).thenReturn(901L);
    when(repository.activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L)).thenReturn(active);

    var result = service.handleWebhook(
        Map.of(
            "update_id", 104L,
            "message", Map.of(
                "message_id", 55L,
                "chat", Map.of("id", 12345L, "type", "private"),
                "from", Map.of("id", 12345L, "is_bot", false),
                "text", "반지 제작 상담"
            )
        ),
        "webhook-secret"
    );

    assertEquals("conversation_opened", result.status());
    verify(inquiries, never()).createTelegram(anyMap(), anyMap());
    verify(repository, never()).attachInquiry(anyLong(), anyString(), anyLong());
    verify(repository).activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L);
  }

  @Test
  void concurrentContentUpdateCannotOpenASecondTeamConversation() {
    var awaitingContact = session("awaiting_content", "홍길동", "01012345678", 0);
    when(repository.session(12345L, 1L)).thenReturn(awaitingContact);
    when(repository.claimConversationOpen(
        12345L,
        12345L,
        "ko",
        "홍길동",
        "01012345678",
        "반지 제작 상담",
        61L,
        1L
    )).thenReturn(null);

    var result = service.handleWebhook(
        privateTextUpdate(109L, 61L, "반지 제작 상담"),
        "webhook-secret"
    );

    assertEquals("conversation_open_in_progress", result.status());
    verify(inquiries, never()).createTelegram(anyMap(), anyMap());
    verify(gateway, never()).sendMessage(
        anyString(), anyString(), anyString(), anyString(), anyMap(), any()
    );
  }

  @Test
  void deliveredRegistrationWithFailedMappingIsVisibleForManualReview() {
    var awaitingContact = session("awaiting_content", "홍길동", "01012345678", 0);
    var prepared = session("needs_attention", "홍길동", "01012345678", 0);
    var attached = sessionWithInquiry(
        "needs_attention", "홍길동", "01012345678", "inquiry-live-1", 0
    );
    when(repository.session(12345L, 1L)).thenReturn(awaitingContact);
    when(repository.claimConversationOpen(
        12345L, 12345L, "ko", "홍길동", "01012345678", "반지 제작 상담", 62L, 1L
    )).thenReturn(prepared);
    when(inquiries.createTelegram(anyMap(), anyMap())).thenReturn(Map.of("id", "inquiry-live-1"));
    when(repository.attachInquiry(12345L, "inquiry-live-1", 1L)).thenReturn(attached);
    when(gateway.sendMessage(
        eq("live-token"), eq("-1001234567890"), eq("777"), anyString(), anyMap(), any()
    )).thenReturn(900L);
    when(repository.activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L))
        .thenThrow(new IllegalStateException("database unavailable"));

    var error = assertThrows(
        TelegramLiveChatException.class,
        () -> service.handleWebhook(
            privateTextUpdate(110L, 62L, "반지 제작 상담"),
            "webhook-secret"
        )
    );

    assertEquals(true, error.deliveryUncertain());
    verify(repository).markNeedsAttention(
        12345L,
        "registration_mapping_pending",
        900L,
        1L
    );
    verify(repository, never()).releaseUpdate(eq(110L), eq(1L), anyString());
  }

  @Test
  void aDatabaseFailureAfterTopicCreationLeavesADurableReservationBeforeWebhookReplay() {
    var awaitingContent = session("awaiting_content", "홍길동", "01012345678", 0);
    var prepared = session("needs_attention", "홍길동", "01012345678", 0);
    var attached = sessionWithInquiry(
        "needs_attention", "홍길동", "01012345678", "inquiry-live-1", 0
    );
    when(repository.session(12345L, 1L)).thenReturn(awaitingContent);
    when(repository.claimConversationOpen(
        12345L, 12345L, "ko", "홍길동", "01012345678", "반지 제작 상담", 65L, 1L
    )).thenReturn(prepared);
    when(inquiries.createTelegram(anyMap(), anyMap())).thenReturn(Map.of("id", "inquiry-live-1"));
    when(repository.attachInquiry(12345L, "inquiry-live-1", 1L)).thenReturn(attached);
    when(repository.recordTopicThread(12345L, 777L, 1L))
        .thenThrow(new IllegalStateException("database unavailable"));

    assertThrows(
        IllegalStateException.class,
        () -> service.handleWebhook(
            privateTextUpdate(127L, 65L, "반지 제작 상담"), "webhook-secret"
        )
    );

    verify(repository).reserveTopicCreation("session-1", 1L);
    verify(gateway).createForumTopic("live-token", "-1001234567890", "문의 · 홍길동");
    verify(repository).releaseUpdate(eq(127L), eq(1L), anyString());
  }

  @Test
  void aTeamReplyToAForwardedMessageReturnsToTheMatchingCustomer() {
    var active = session("active", "홍길동", "01012345678", 900L);
    when(repository.sessionForThread(777L, 1L, "-1001234567890")).thenReturn(active);
    when(repository.reserveDelivery(active.id(), "team_delivery_in_flight", 0L, 951L, 1L))
        .thenReturn(active);
    when(gateway.copyMessage(
        "live-token",
        "12345",
        "-1001234567890",
        951L,
        "",
        null
    )).thenReturn(81L);

    var result = service.handleWebhook(
        Map.of(
            "update_id", 102L,
            "message", Map.of(
                "message_id", 951L,
                "message_thread_id", 777L,
                "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
                "from", Map.of("id", 999L, "is_bot", false),
                "text", "상담 답변입니다.",
                "reply_to_message", Map.of("message_id", 950L)
            )
        ),
        "webhook-secret"
    );

    assertEquals("team_reply_forwarded", result.status());
    verify(repository).recordTeamMessage(active.id(), 951L, 81L);
  }

  @Test
  void mappedWebTopicIsRoutedBeforeLegacyThreadLookup() {
    when(webBridge.handleTeamMessage(anyMap(), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_team_reply_recorded")
    ));

    var result = service.handleWebhook(Map.of(
        "update_id", 129L,
        "message", Map.of(
            "message_id", 970L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "text", "확인했습니다."
        )
    ), "webhook-secret");

    assertEquals("web_team_reply_recorded", result.status());
    verify(repository, never()).sessionForThread(anyLong(), anyLong(), anyString());
  }

  @Test
  void newPrivateBotUserIsRedirectedWithoutCreatingALegacySession() {
    when(repository.session(12345L, 1L)).thenReturn(null);
    when(webBridge.handlePrivateMessage(anyMap(), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_private_redirect_sent")
    ));

    var result = service.handleWebhook(
        privateTextUpdate(130L, 971L, "/start site_en"), "webhook-secret"
    );

    assertEquals("web_private_redirect_sent", result.status());
    verify(repository, never()).saveSession(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong()
    );
    verify(repository, never()).claimConversationOpen(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong(), anyLong()
    );
  }

  @Test
  void userWithOnlyAClosedLegacySessionIsRedirectedWithoutReopeningIt() {
    when(repository.session(12345L, 1L))
        .thenReturn(session("closed", "홍길동", "01012345678", 900L));
    when(webBridge.handlePrivateMessage(anyMap(), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_private_redirect_sent")
    ));

    var result = service.handleWebhook(
        privateTextUpdate(134L, 975L, "/start"), "webhook-secret"
    );

    assertEquals("web_private_redirect_sent", result.status());
    verify(repository, never()).saveSession(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong()
    );
    verify(repository, never()).claimConversationOpen(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong(), anyLong()
    );
  }

  @Test
  void botAuthoredGroupMessageIsRejectedBeforeWebTopicRouting() {
    var result = service.handleWebhook(Map.of(
        "update_id", 131L,
        "message", Map.of(
            "message_id", 972L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 777L, "is_bot", true),
            "text", "Bot reply"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
  }

  @Test
  void senderLessGroupTextIsRejectedBeforeWebTopicRouting() {
    when(webBridge.handleTeamMessage(anyMap(), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_team_reply_recorded")
    ));

    var result = service.handleWebhook(Map.of(
        "update_id", 138L,
        "message", Map.of(
            "message_id", 976L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "text", "Sender missing"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
    verify(repository, never()).sessionForThread(anyLong(), anyLong(), anyString());
  }

  @Test
  void senderChatGroupTextIsRejectedBeforeWebTopicRouting() {
    var result = service.handleWebhook(Map.of(
        "update_id", 139L,
        "message", Map.of(
            "message_id", 977L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "sender_chat", Map.of("id", -1001234567890L),
            "text", "On behalf of group"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
  }

  @Test
  void automaticForwardGroupTextIsRejectedBeforeWebTopicRouting() {
    var result = service.handleWebhook(Map.of(
        "update_id", 140L,
        "message", Map.of(
            "message_id", 978L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "is_automatic_forward", true,
            "text", "Forwarded channel post"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
  }

  @Test
  void nativeTopicCloseWithoutFromStillReachesWebTopicBridge() {
    when(webBridge.handleTeamMessage(anyMap(), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_conversation_closed")
    ));

    var result = service.handleWebhook(Map.of(
        "update_id", 141L,
        "message", Map.of(
            "message_id", 979L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "forum_topic_closed", Map.of()
        )
    ), "webhook-secret");

    assertEquals("web_conversation_closed", result.status());
    verify(webBridge).handleTeamMessage(anyMap(), any());
  }

  @Test
  void wrongGroupMessageIsRejectedBeforeWebTopicRouting() {
    var result = service.handleWebhook(Map.of(
        "update_id", 132L,
        "message", Map.of(
            "message_id", 973L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1000000000001L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "text", "Wrong group"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
  }

  @Test
  void editedMessageIsIgnoredBeforeAnyConversationRouter() {
    var result = service.handleWebhook(Map.of(
        "update_id", 133L,
        "edited_message", Map.of(
            "message_id", 974L,
            "message_thread_id", 701L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "text", "Edited reply"
        )
    ), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(webBridge, never()).handleTeamMessage(anyMap(), any());
    verify(repository, never()).sessionForThread(anyLong(), anyLong(), anyString());
  }

  @Test
  void aTeamCloseCommandEndsOnlyTheConversationInThatTopic() {
    var active = session("active", "홍길동", "01012345678", 900L);
    var closed = session("closed", "홍길동", "01012345678", 900L);
    when(repository.sessionForThread(777L, 1L, "-1001234567890")).thenReturn(active);
    when(repository.closeSession(active.id(), 1L)).thenReturn(closed);

    var result = service.handleWebhook(Map.of(
        "update_id", 124L,
        "message", Map.of(
            "message_id", 960L,
            "message_thread_id", 777L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "text", "/close"
        )
    ), "webhook-secret");

    assertEquals("conversation_closed", result.status());
    verify(repository).closeSession(active.id(), 1L);
    verify(gateway).closeForumTopic("live-token", "-1001234567890", 777L);
    verify(repository).clearDeliveryIssue(active.id(), "topic_close_in_flight");
    verify(gateway, never()).copyMessage(
        anyString(), anyString(), anyString(), anyLong(), anyString(), any()
    );
  }

  @Test
  void aCloseCommandAddressedToAnotherBotDoesNotEndTheConversation() {
    var active = session("active", "홍길동", "01012345678", 900L);
    when(repository.sessionForThread(777L, 1L, "-1001234567890")).thenReturn(active);
    when(repository.reserveDelivery(active.id(), "team_delivery_in_flight", 0L, 961L, 1L))
        .thenReturn(active);
    when(gateway.copyMessage(
        "live-token", "12345", "-1001234567890", 961L, "", null
    )).thenReturn(82L);

    var result = service.handleWebhook(Map.of(
        "update_id", 128L,
        "message", Map.of(
            "message_id", 961L,
            "message_thread_id", 777L,
            "chat", Map.of("id", -1001234567890L, "type", "supergroup"),
            "from", Map.of("id", 999L, "is_bot", false),
            "text", "/close@OTHER_BOT"
        )
    ), "webhook-secret");

    assertEquals("team_reply_forwarded", result.status());
    verify(repository, never()).closeSession(active.id(), 1L);
  }

  @Test
  void cmsCanCloseAConversationEvenWhenTheBotIsNotConfigured() {
    var active = session("active", "홍길동", "01012345678", 900L);
    var closed = session("closed", "홍길동", "01012345678", 900L);
    var marked = new TelegramLiveChatRepository.Session(
        "session-1", 12345L, 12345L, "", "ko", "closed",
        "홍길동", "01012345678", "반지 제작 상담", "topic_close_failed",
        0L, 0L, "", 777L, 900L, Instant.EPOCH, Instant.EPOCH
    );
    var disconnectedSettings = new TelegramLiveChatRepository.Settings(
        false, "", "", "-1001234567890", "", "실시간 상담", "", "", ""
    );
    when(repository.closeSession(active.id())).thenReturn(closed);
    when(credentials.current()).thenReturn(
        new TelegramLiveChatCredentialService.Credentials(disconnectedSettings, "")
    );
    when(repository.markTopicCloseIssue(active.id(), "topic_close_failed")).thenReturn(marked);

    var result = service.closeConversation(active.id());

    assertEquals("closed", result.state());
    assertEquals("topic_close_failed", result.attentionCode());
    verify(repository).closeSession(active.id());
    verify(gateway, never()).closeForumTopic(anyString(), anyString(), anyLong());
  }

  @Test
  void replayedCustomerSourceMessageIsNotCopiedTwice() {
    var active = sessionWithInquiry(
        "active", "홍길동", "01012345678", "inquiry-live-1", 900L
    );
    when(repository.session(12345L, 1L)).thenReturn(active);
    when(repository.hasCustomerSourceMapping(active.id(), 63L)).thenReturn(true);

    var result = service.handleWebhook(
        privateTextUpdate(125L, 63L, "같은 메시지"), "webhook-secret"
    );

    assertEquals("customer_message_duplicate", result.status());
    verify(repository, never()).reserveDelivery(
        anyString(), anyString(), anyLong(), anyLong(), anyLong()
    );
  }

  @Test
  void retriedAcceptedConsentRepeatsTheNamePromptInsteadOfCancellingRegistration() {
    var awaitingName = session("awaiting_name", "", "", 0);
    when(repository.session(12345L, 1L)).thenReturn(awaitingName);
    when(repository.saveSession(12345L, 12345L, "awaiting_name", "ko", "", "", 1L))
        .thenReturn(awaitingName);
    when(gateway.sendMessage(
        eq("live-token"), eq("12345"), eq(""), anyString(), anyMap(), any()
    )).thenReturn(82L);

    var result = service.handleWebhook(Map.of(
        "update_id", 111L,
        "callback_query", Map.of(
            "id", "callback-1",
            "data", "live_consent_yes",
            "from", Map.of("id", 12345L),
            "message", Map.of(
                "chat", Map.of("id", 12345L, "type", "private")
            )
        )
    ), "webhook-secret");

    assertEquals("name_requested", result.status());
    verify(gateway).sendMessage(
        eq("live-token"), eq("12345"), eq(""), eq("성함을 입력해 주세요."), anyMap(), any()
    );
    verify(webBridge, never()).handlePrivateMessage(anyMap(), any());
  }

  @Test
  void staleEnglishConsentCallbackWithoutCurrentSessionRedirectsToWebsite() {
    when(repository.session(12345L, 1L)).thenReturn(null);
    var redirectMessage = Map.<String, Object>of(
        "chat", Map.of("id", 12345L, "type", "private"),
        "text", "/start site_en"
    );
    when(webBridge.handlePrivateMessage(eq(redirectMessage), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_private_redirect_sent")
    ));

    var result = service.handleWebhook(Map.of(
        "update_id", 135L,
        "callback_query", Map.of(
            "id", "callback-stale-en",
            "data", "live_consent_yes",
            "from", Map.of("id", 12345L),
            "message", Map.of(
                "text", "Before the live consultation, we need your name and contact details. "
                    + "They will be used only to manage your inquiry. Do you agree?",
                "chat", Map.of("id", 12345L, "type", "private")
            )
        )
    ), "webhook-secret");

    assertEquals("web_private_redirect_sent", result.status());
    verify(gateway).answerCallback("live-token", "callback-stale-en");
    verify(webBridge).handlePrivateMessage(eq(redirectMessage), any());
    verify(repository, never()).saveSession(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong()
    );
  }

  @Test
  void staleConsentCallbackForClosedSessionRedirectsWithoutRecoveryRejection() {
    when(repository.session(12345L, 1L))
        .thenReturn(session("closed", "홍길동", "01012345678", 900L));
    var redirectMessage = Map.<String, Object>of(
        "chat", Map.of("id", 12345L, "type", "private"),
        "text", "/start"
    );
    when(webBridge.handlePrivateMessage(eq(redirectMessage), any())).thenReturn(Optional.of(
        new TelegramLiveChatService.WebhookResult("web_private_redirect_sent")
    ));

    var result = service.handleWebhook(Map.of(
        "update_id", 136L,
        "callback_query", Map.of(
            "id", "callback-stale-closed",
            "data", "live_consent_no",
            "from", Map.of("id", 12345L),
            "message", Map.of("chat", Map.of("id", 12345L, "type", "private"))
        )
    ), "webhook-secret");

    assertEquals("web_private_redirect_sent", result.status());
    verify(gateway).answerCallback("live-token", "callback-stale-closed");
    verify(repository, never()).saveSession(
        anyLong(), anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong()
    );
  }

  @Test
  void staleConsentCallbackForActiveLegacySessionKeepsLegacyRestartBehavior() {
    var active = session("active", "홍길동", "01012345678", 900L);
    when(repository.session(12345L, 1L)).thenReturn(active);
    when(repository.saveSession(
        12345L, 12345L, "active", "ko", "홍길동", "01012345678", 1L
    )).thenReturn(active);

    var result = service.handleWebhook(Map.of(
        "update_id", 137L,
        "callback_query", Map.of(
            "id", "callback-active",
            "data", "live_consent_yes",
            "from", Map.of("id", 12345L),
            "message", Map.of("chat", Map.of("id", 12345L, "type", "private"))
        )
    ), "webhook-secret");

    assertEquals("restart_required", result.status());
    verify(webBridge, never()).handlePrivateMessage(anyMap(), any());
    verify(repository).saveSession(
        12345L, 12345L, "active", "ko", "홍길동", "01012345678", 1L
    );
  }

  @Test
  void rejectsWebhookRequestsBeforeReadingAnUpdateWhenTheSecretIsWrong() {
    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.handleWebhook(Map.of("update_id", 103L), "wrong-secret")
    );

    assertEquals(401, error.getStatusCode().value());
    verify(repository, never()).claimUpdate(eq(103L), eq(1L), anyString());
  }

  @Test
  void acceptsZeroAsAValidTelegramUpdateId() {
    var result = service.handleWebhook(Map.of("update_id", 0L), "webhook-secret");

    assertEquals("ignored", result.status());
    verify(repository).claimUpdate(eq(0L), eq(1L), anyString());
    verify(repository).completeUpdate(eq(0L), eq(1L), anyString());
  }

  @Test
  void completedTelegramUpdateIsAcknowledgedAsDuplicate() {
    when(repository.claimUpdate(eq(120L), eq(1L), anyString()))
        .thenReturn(TelegramLiveChatRepository.UpdateClaim.COMPLETED);

    var result = service.handleWebhook(Map.of("update_id", 120L), "webhook-secret");

    assertEquals("duplicate", result.status());
    verify(repository, never()).completeUpdate(eq(120L), eq(1L), anyString());
  }

  @Test
  void inProgressTelegramUpdateReturnsANonSuccessSoTelegramWillRetry() {
    when(repository.claimUpdate(eq(121L), eq(1L), anyString()))
        .thenReturn(TelegramLiveChatRepository.UpdateClaim.IN_PROGRESS);

    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.handleWebhook(Map.of("update_id", 121L), "webhook-secret")
    );

    assertEquals(503, error.getStatusCode().value());
    verify(repository, never()).completeUpdate(eq(121L), eq(1L), anyString());
  }

  @Test
  void rejectsANonNumericTelegramUpdateId() {
    var error = assertThrows(
        ResponseStatusException.class,
        () -> service.handleWebhook(Map.of("update_id", "invalid"), "webhook-secret")
    );

    assertEquals(400, error.getStatusCode().value());
    verify(repository, never()).claimUpdate(anyLong(), anyLong(), anyString());
  }

  @Test
  void anUncertainTelegramDeliveryIsClaimedWithoutAutomaticResend() {
    var active = sessionWithInquiry("active", "홍길동", "01012345678", "inquiry-live-1", 900L);
    when(repository.session(12345L, 1L)).thenReturn(active);
    when(repository.saveSession(
        12345L,
        12345L,
        "active",
        "ko",
        "홍길동",
        "01012345678",
        1L
    )).thenReturn(active);
    when(repository.reserveDelivery(active.id(), "customer_delivery_in_flight", 56L, 0L, 1L))
        .thenReturn(active);
    when(gateway.copyMessage(
        "live-token",
        "-1001234567890",
        "12345",
        56L,
        "777",
        null
    )).thenThrow(new TelegramLiveChatException("Delivery outcome is unknown.", true));

    assertThrows(
        TelegramLiveChatException.class,
        () -> service.handleWebhook(privateTextUpdate(105L, 56L, "Question"), "webhook-secret")
    );

    verify(repository, never()).releaseUpdate(eq(105L), eq(1L), anyString());
    verify(repository).completeUpdate(eq(105L), eq(1L), anyString());
    verify(repository).transitionDeliveryIssue(
        active.id(),
        "customer_delivery_in_flight",
        "customer_delivery_uncertain",
        56L,
        0L,
        ""
    );
  }

  @Test
  void aDefiniteTelegramRejectionReleasesTheUpdateForRetry() {
    var active = sessionWithInquiry("active", "홍길동", "01012345678", "inquiry-live-1", 900L);
    when(repository.session(12345L, 1L)).thenReturn(active);
    when(repository.saveSession(
        12345L,
        12345L,
        "active",
        "ko",
        "홍길동",
        "01012345678",
        1L
    )).thenReturn(active);
    when(repository.reserveDelivery(active.id(), "customer_delivery_in_flight", 57L, 0L, 1L))
        .thenReturn(active);
    when(gateway.copyMessage(
        "live-token",
        "-1001234567890",
        "12345",
        57L,
        "777",
        null
    )).thenThrow(new TelegramLiveChatException("Telegram rejected the request."));

    assertThrows(
        TelegramLiveChatException.class,
        () -> service.handleWebhook(privateTextUpdate(106L, 57L, "Question"), "webhook-secret")
    );

    verify(repository).releaseUpdate(eq(106L), eq(1L), anyString());
  }

  @Test
  void anUncertainOnboardingPromptIsReleasedBecauseNoRecoveryRecordExists() {
    var awaitingConsent = session("awaiting_consent", "", "", 0);
    when(repository.session(12345L, 1L)).thenReturn(null);
    when(repository.saveSession(
        12345L, 12345L, "awaiting_consent", "ko", "", "", 1L
    )).thenReturn(awaitingConsent);
    when(gateway.sendMessage(
        eq("live-token"), eq("12345"), eq(""), anyString(), anyMap(), any()
    )).thenThrow(new TelegramLiveChatException("Delivery outcome is unknown.", true));

    assertThrows(
        TelegramLiveChatException.class,
        () -> service.handleWebhook(privateTextUpdate(122L, 58L, "/start"), "webhook-secret")
    );

    verify(repository).releaseUpdate(eq(122L), eq(1L), anyString());
    verify(repository, never()).completeUpdate(eq(122L), eq(1L), anyString());
  }

  @Test
  void callbackAcknowledgementFailureDoesNotBlockTheConsentFlow() {
    var awaitingName = session("awaiting_name", "", "", 0);
    when(repository.session(12345L, 1L)).thenReturn(session("awaiting_consent", "", "", 0));
    when(repository.saveSession(12345L, 12345L, "awaiting_name", "ko", "", "", 1L))
        .thenReturn(awaitingName);
    org.mockito.Mockito.doThrow(new TelegramLiveChatException("ack failed", true))
        .when(gateway).answerCallback("live-token", "callback-2");

    var result = service.handleWebhook(Map.of(
        "update_id", 123L,
        "callback_query", Map.of(
            "id", "callback-2",
            "data", "live_consent_yes",
            "from", Map.of("id", 12345L),
            "message", Map.of("chat", Map.of("id", 12345L, "type", "private"))
        )
    ), "webhook-secret");

    assertEquals("name_requested", result.status());
    verify(repository).completeUpdate(eq(123L), eq(1L), anyString());
  }

  @Test
  void anAdministratorCanResendACustomerMessageAfterConfirmingItWasNotDelivered() {
    var uncertain = new TelegramLiveChatRepository.Session(
        "session-1", 12345L, 12345L, "inquiry-live-1", "ko", "active",
        "홍길동", "01012345678", "반지 제작 상담", "customer_delivery_retrying",
        56L, 0L, "", 777L, 900L, Instant.EPOCH, Instant.EPOCH
    );
    var recovered = sessionWithInquiry(
        "active", "홍길동", "01012345678", "inquiry-live-1", 900L
    );
    when(repository.claimDeliveryRetry("session-1")).thenReturn(uncertain);
    when(gateway.copyMessage(
        "live-token", "-1001234567890", "12345", 56L, "777", null
    )).thenReturn(952L);
    when(repository.clearDeliveryIssue(
        "session-1", "customer_delivery_retrying"
    )).thenReturn(recovered);

    var result = service.retryUncertainDelivery("session-1");

    assertEquals(recovered, result);
    verify(repository).recordCustomerMessage("session-1", 56L, 952L);
    verify(repository).clearDeliveryIssue("session-1", "customer_delivery_retrying");
  }

  @Test
  void anAdministratorCanReopenRegistrationAfterConfirmingTheRootWasNotDelivered() {
    var uncertain = new TelegramLiveChatRepository.Session(
        "session-1", 12345L, 12345L, "inquiry-live-1", "ko", "needs_attention",
        "홍길동", "01012345678", "반지 제작 상담", "registration_delivery_retrying",
        55L, 0L, "registration", 777L, 0L, Instant.EPOCH, Instant.EPOCH
    );
    var recovered = sessionWithInquiry(
        "active", "홍길동", "01012345678", "inquiry-live-1", 900L
    );
    when(repository.claimDeliveryRetry("session-1")).thenReturn(uncertain);
    when(gateway.sendMessage(
        eq("live-token"), eq("-1001234567890"), eq("777"), anyString(), anyMap(), eq(null)
    )).thenReturn(900L);
    when(repository.activateAndRecordRoot(
        12345L, "inquiry-live-1", 900L, 1L
    )).thenReturn(recovered);

    var result = service.retryUncertainDelivery("session-1");

    assertEquals(recovered, result);
    verify(repository).activateAndRecordRoot(12345L, "inquiry-live-1", 900L, 1L);
  }

  @Test
  void anAdministratorCanResendATeamReplyAfterConfirmingItWasNotDelivered() {
    var uncertain = new TelegramLiveChatRepository.Session(
        "session-1", 12345L, 12345L, "inquiry-live-1", "ko", "active",
        "홍길동", "01012345678", "반지 제작 상담", "team_delivery_retrying",
        0L, 951L, "", 777L, 900L, Instant.EPOCH, Instant.EPOCH
    );
    var recovered = sessionWithInquiry(
        "active", "홍길동", "01012345678", "inquiry-live-1", 900L
    );
    when(repository.claimDeliveryRetry("session-1")).thenReturn(uncertain);
    when(gateway.copyMessage(
        "live-token", "12345", "-1001234567890", 951L, "", null
    )).thenReturn(81L);
    when(repository.clearDeliveryIssue(
        "session-1", "team_delivery_retrying"
    )).thenReturn(recovered);

    var result = service.retryUncertainDelivery("session-1");

    assertEquals(recovered, result);
    verify(repository).recordTeamMessage("session-1", 951L, 81L);
    verify(repository).clearDeliveryIssue("session-1", "team_delivery_retrying");
  }

  private Map<String, Object> privateTextUpdate(long updateId, long messageId, String text) {
    return Map.of(
        "update_id", updateId,
        "message", Map.of(
            "message_id", messageId,
            "chat", Map.of("id", 12345L, "type", "private"),
            "from", Map.of("id", 12345L, "is_bot", false),
            "text", text
        )
    );
  }

  private TelegramLiveChatRepository.Session session(
      String state,
      String name,
      String contact,
      long rootMessageId
  ) {
    return sessionWithInquiry(state, name, contact, "", rootMessageId);
  }

  private TelegramLiveChatRepository.Session sessionWithInquiry(
      String state,
      String name,
      String contact,
      String inquiryId,
      long rootMessageId
  ) {
    return new TelegramLiveChatRepository.Session(
        "session-1",
        12345L,
        12345L,
        inquiryId,
        "ko",
        state,
        name,
        contact,
        "반지 제작 상담",
        "closed".equals(state) && rootMessageId > 0 ? "topic_close_in_flight" : "",
        0L,
        0L,
        "",
        rootMessageId > 0 ? 777L : 0L,
        rootMessageId,
        Instant.EPOCH,
        Instant.EPOCH
    );
  }

}
