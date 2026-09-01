package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import com.daeho.cms.repository.WebLiveChatRepository.VisitorMessageClaim;
import com.daeho.cms.service.WebLiveChatInputValidator.MessageInput;
import com.daeho.cms.service.WebLiveChatInputValidator.StartInput;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WebLiveChatServiceTest {
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  private WebLiveChatRepository repository;
  private TelegramLiveChatCredentialService credentials;
  private TelegramLiveChatGateway gateway;
  private InquiryWorkflowService inquiries;
  private WebLiveChatService service;

  @BeforeEach
  void setUp() {
    repository = mock(WebLiveChatRepository.class);
    credentials = mock(TelegramLiveChatCredentialService.class);
    gateway = mock(TelegramLiveChatGateway.class);
    inquiries = mock(InquiryWorkflowService.class);
    var settings = new TelegramLiveChatRepository.Settings(
        true, "ciphertext", "DAEHO_LIVE_BOT", "-1003425727647", "", "실시간 상담",
        "secret-hash", "idle", "", 3L, "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(credentials.current()).thenReturn(
        new TelegramLiveChatCredentialService.Credentials(settings, "token")
    );
    service = new WebLiveChatService(repository, credentials, gateway, inquiries);
  }

  @Test
  void startCreatesOneInquiryOneTopicAndOnePrivacySafeRegistrationCardInOrder() {
    var opening = conversation("opening", "", "", "", 0L, 0L);
    var withInquiry = conversation("opening", "inquiry-1", "", "", 0L, 0L);
    var creatingTopic = conversation(
        "opening", "inquiry-1", "topic_creation", "", 0L, 0L
    );
    var deliveringRegistration = conversation(
        "opening", "inquiry-1", "registration_delivery", "", 701L, 0L
    );
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    when(repository.claimOpen(any())).thenReturn(opening);
    when(inquiries.createWebLiveChat(anyMap(), anyMap()))
        .thenReturn(Map.of("id", "inquiry-1"));
    when(repository.attachInquiry("conversation-1", "inquiry-1")).thenReturn(withInquiry);
    when(repository.reserveTopicCreation("conversation-1")).thenReturn(creatingTopic);
    when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
        .thenReturn(701L);
    when(repository.recordTopic("conversation-1", 701L)).thenReturn(deliveringRegistration);
    when(gateway.sendMessage(
        eq("token"), eq("-1003425727647"), eq("701"), any(), eq(Map.of()), eq(null)
    )).thenReturn(702L);
    when(repository.activate("conversation-1", 702L)).thenReturn(active);

    var result = service.start(visitor(), validStart(), requestMeta());

    assertEquals("active", result.state());
    var card = ArgumentCaptor.forClass(String.class);
    verify(gateway).sendMessage(
        eq("token"), eq("-1003425727647"), eq("701"), card.capture(), eq(Map.of()), eq(null)
    );
    assertEquals("""
        🔔 새 실시간 상담

        이름: 홍길동
        연락처: 01012345678
        문의 내용:
        반지 제작 상담
        """.trim(), card.getValue());
    var order = inOrder(repository, inquiries, gateway);
    order.verify(repository).claimOpen(any());
    order.verify(inquiries).createWebLiveChat(anyMap(), anyMap());
    order.verify(repository).attachInquiry("conversation-1", "inquiry-1");
    order.verify(repository).reserveTopicCreation("conversation-1");
    order.verify(gateway).createForumTopic("token", "-1003425727647", "문의 · 홍길동");
    order.verify(repository).recordTopic("conversation-1", 701L);
    order.verify(gateway).sendMessage(
        eq("token"), eq("-1003425727647"), eq("701"), any(), eq(Map.of()), eq(null)
    );
    order.verify(repository).activate("conversation-1", 702L);
  }

  @Test
  void activeStartReusesTheClaimedConversationWithoutExternalWork() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    when(repository.claimOpen(any())).thenReturn(active);

    var result = service.start(visitor(), validStart(), requestMeta());

    assertEquals(active, result);
    verify(inquiries, never()).createWebLiveChat(anyMap(), anyMap());
    verify(gateway, never()).createForumTopic(anyString(), anyString(), anyString());
    verify(gateway, never()).sendMessage(anyString(), anyString(), anyString(), anyString(), anyMap(), any());
  }

  @Test
  void startAfterCloseClaimsANewConversationAndCreatesANewTopic() {
    var claimedIds = new java.util.ArrayList<String>();
    when(repository.claimOpen(any())).thenAnswer(invocation -> {
      Conversation candidate = invocation.getArgument(0);
      claimedIds.add(candidate.id());
      return candidate;
    });
    when(inquiries.createWebLiveChat(anyMap(), anyMap()))
        .thenAnswer(invocation -> Map.of(
            "id", ((Map<?, ?>) invocation.getArgument(0)).get("inquiryId")
        ));
    when(repository.attachInquiry(anyString(), anyString())).thenAnswer(invocation ->
        conversationWithId(invocation.getArgument(0), "opening", invocation.getArgument(1), "", "", 0L, 0L)
    );
    when(repository.reserveTopicCreation(anyString())).thenAnswer(invocation ->
        conversationWithId(invocation.getArgument(0), "opening", invocation.getArgument(0),
            "topic_creation", "", 0L, 0L)
    );
    when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
        .thenReturn(801L);
    when(repository.recordTopic(anyString(), eq(801L))).thenAnswer(invocation ->
        conversationWithId(invocation.getArgument(0), "opening", invocation.getArgument(0),
            "registration_delivery", "", 801L, 0L)
    );
    when(gateway.sendMessage(
        eq("token"), eq("-1003425727647"), eq("801"), anyString(), eq(Map.of()), eq(null)
    )).thenReturn(802L);
    when(repository.activate(anyString(), eq(802L))).thenAnswer(invocation ->
        conversationWithId(invocation.getArgument(0), "active", invocation.getArgument(0),
            "", "", 801L, 802L)
    );

    var result = service.start(visitor(), validStart(), requestMeta());

    assertEquals("active", result.state());
    assertEquals(claimedIds.get(0), result.id());
    assertTrue(!"closed-conversation".equals(result.id()));
    verify(gateway).createForumTopic("token", "-1003425727647", "문의 · 홍길동");
  }

  @Test
  void uncertainTopicCreationIsMarkedAndNeverAutomaticallyRetried() {
    var creatingTopic = conversation(
        "opening", "inquiry-1", "topic_creation", "", 0L, 0L
    );
    var needsAttention = conversation(
        "needs_attention", "inquiry-1", "topic_creation", "topic_creation_uncertain", 0L, 0L
    );
    when(repository.claimOpen(any())).thenReturn(
        conversation("opening", "inquiry-1", "", "", 0L, 0L), needsAttention
    );
    when(repository.reserveTopicCreation("conversation-1")).thenReturn(creatingTopic);
    when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
        .thenThrow(new TelegramLiveChatException("timeout", true));

    assertThrows(
        TelegramLiveChatException.class,
        () -> service.start(visitor(), validStart(), requestMeta())
    );
    assertEquals(needsAttention, service.start(visitor(), validStart(), requestMeta()));

    verify(repository).markNeedsAttention(
        "conversation-1", "topic_creation", "topic_creation_uncertain"
    );
    verify(gateway, times(1))
        .createForumTopic("token", "-1003425727647", "문의 · 홍길동");
  }

  @Test
  void topicMappingFailureIsTrackedAsUncertainAndCannotReplayCreation() {
    var creatingTopic = conversation(
        "opening", "inquiry-1", "topic_creation", "", 0L, 0L
    );
    when(repository.claimOpen(any())).thenReturn(
        conversation("opening", "inquiry-1", "", "", 0L, 0L)
    );
    when(repository.reserveTopicCreation("conversation-1")).thenReturn(creatingTopic);
    when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
        .thenReturn(701L);
    when(repository.recordTopic("conversation-1", 701L))
        .thenThrow(new IllegalStateException("database unavailable"));

    var error = assertThrows(
        TelegramLiveChatException.class,
        () -> service.start(visitor(), validStart(), requestMeta())
    );

    assertTrue(error.deliveryUncertain());
    assertTrue(error.recoveryPersisted());
    verify(repository).markNeedsAttention(
        "conversation-1", "topic_creation", "topic_creation_uncertain"
    );
  }

  @Test
  void registrationTimeoutIsMarkedAndRetryNeverSendsASecondCard() {
    var deliveringRegistration = conversation(
        "opening", "inquiry-1", "registration_delivery", "", 701L, 0L
    );
    var needsAttention = conversation(
        "needs_attention", "inquiry-1", "registration_delivery",
        "registration_delivery_uncertain", 701L, 0L
    );
    when(repository.claimOpen(any())).thenReturn(
        conversation("opening", "inquiry-1", "", "", 0L, 0L), needsAttention
    );
    when(repository.reserveTopicCreation("conversation-1")).thenReturn(
        conversation("opening", "inquiry-1", "topic_creation", "", 0L, 0L)
    );
    when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
        .thenReturn(701L);
    when(repository.recordTopic("conversation-1", 701L)).thenReturn(deliveringRegistration);
    when(gateway.sendMessage(
        eq("token"), eq("-1003425727647"), eq("701"), anyString(), eq(Map.of()), eq(null)
    )).thenThrow(new TelegramLiveChatException("timeout", true));

    assertThrows(
        TelegramLiveChatException.class,
        () -> service.start(visitor(), validStart(), requestMeta())
    );
    assertEquals(needsAttention, service.start(visitor(), validStart(), requestMeta()));

    verify(repository).markNeedsAttention(
        "conversation-1", "registration_delivery", "registration_delivery_uncertain"
    );
    verify(gateway, times(1)).sendMessage(
        eq("token"), eq("-1003425727647"), eq("701"), anyString(), eq(Map.of()), eq(null)
    );
  }

  @Test
  void followUpIsStoredOnceAndDeliveredWithTheCustomerPrefix() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var pending = visitorMessage(41L, "pending", 0L);
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    )).thenReturn(new VisitorMessageClaim(pending, "acquired"));
    when(gateway.sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    )).thenReturn(703L);
    when(repository.markVisitorDelivered(41L, 703L)).thenReturn(true);

    var result = service.send(visitor(), validMessage());

    assertEquals(new WebLiveChatService.SendResult(41L, "sent"), result);
    var order = inOrder(repository, gateway);
    order.verify(repository).claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    );
    order.verify(gateway).sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    );
    order.verify(repository).markVisitorDelivered(41L, 703L);
  }

  @Test
  void duplicateDeliveredFollowUpReturnsTheStoredResultWithoutSendingAgain() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var delivered = visitorMessage(41L, "delivered", 703L);
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    )).thenReturn(new VisitorMessageClaim(delivered, "already_delivered"));

    var result = service.send(visitor(), validMessage());

    assertEquals(new WebLiveChatService.SendResult(41L, "sent"), result);
    verify(gateway, never()).sendMessage(anyString(), anyString(), anyString(), anyString(), anyMap(), any());
  }

  @Test
  void definiteFollowUpFailureReleasesTheClaimForSafeRetry() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    )).thenReturn(new VisitorMessageClaim(visitorMessage(41L, "pending", 0L), "acquired"));
    when(gateway.sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    )).thenThrow(new TelegramLiveChatException("rejected", false));

    assertThrows(TelegramLiveChatException.class, () -> service.send(visitor(), validMessage()));

    verify(repository).releaseVisitorMessage(41L);
  }

  @Test
  void uncertainFollowUpFailureKeepsTheClaimAndRetryDoesNotDuplicateTheSend() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var message = visitorMessage(41L, "pending", 0L);
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    )).thenReturn(
        new VisitorMessageClaim(message, "acquired"),
        new VisitorMessageClaim(message, "in_progress")
    );
    when(gateway.sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    )).thenThrow(new TelegramLiveChatException("timeout", true));

    assertThrows(TelegramLiveChatException.class, () -> service.send(visitor(), validMessage()));
    assertEquals(
        new WebLiveChatService.SendResult(41L, "in_progress"),
        service.send(visitor(), validMessage())
    );

    verify(repository, never()).releaseVisitorMessage(41L);
    verify(gateway, times(1)).sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    );
  }

  @Test
  void deliveredFollowUpWithMappingFailureKeepsTheClaimForManualRecovery() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.claimVisitorMessage(
        "conversation-1", "client-key-0000000002", "추가 문의"
    )).thenReturn(new VisitorMessageClaim(visitorMessage(41L, "pending", 0L), "acquired"));
    when(gateway.sendMessage(
        "token", "-1003425727647", "701", "고객 추가 메시지\n\n추가 문의", Map.of(), null
    )).thenReturn(703L);
    when(repository.markVisitorDelivered(41L, 703L)).thenReturn(false);

    var error = assertThrows(
        TelegramLiveChatException.class,
        () -> service.send(visitor(), validMessage())
    );

    assertTrue(error.deliveryUncertain());
    verify(repository, never()).releaseVisitorMessage(41L);
  }

  @Test
  void sessionAndMessageHistoryUseOnlyTheRepositorysCustomerVisibleProjection() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var visible = List.of(
        new Message(51L, "conversation-1", "team", "확인했습니다.", "delivered", "", 901L, NOW)
    );
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.visibleMessagesAfter("conversation-1", 0L, 100)).thenReturn(visible);
    when(repository.visibleMessagesAfter("conversation-1", 50L, 100)).thenReturn(visible);
    when(repository.unreadCount("conversation-1")).thenReturn(1L);

    var session = service.session(visitor());
    var messages = service.messages(visitor(), 50L);

    assertEquals("", session.conversation().inquiryContent());
    assertEquals(visible, session.messages());
    assertEquals(1L, session.unreadCount());
    assertEquals(visible, messages);
    verify(repository).visibleMessagesAfter("conversation-1", 0L, 100);
    verify(repository).visibleMessagesAfter("conversation-1", 50L, 100);
  }

  @Test
  void markReadAndCmsCloseDelegateToAtomicRepositoryTransitions() {
    var active = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var read = conversation("active", "inquiry-1", "", "", 701L, 702L);
    var closed = conversation("closed", "inquiry-1", "", "", 701L, 702L);
    var closeEvent = new Message(
        52L, "conversation-1", "system", "상담이 종료되었습니다.", "delivered", "", 0L, NOW
    );
    when(repository.currentConversation("visitor-1", 3L)).thenReturn(active);
    when(repository.markRead("conversation-1", 51L)).thenReturn(read);
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new WebLiveChatRepository.CloseResult(closed, closeEvent));

    assertEquals(read, service.markRead(visitor(), 51L));
    assertEquals(closed, service.closeFromCms("conversation-1"));
  }

  private WebLiveChatRepository.Visitor visitor() {
    return new WebLiveChatRepository.Visitor("visitor-1", NOW.plusSeconds(3600), NOW, NOW, NOW);
  }

  private StartInput validStart() {
    return new StartInput(
        "ko", "홍길동", "01012345678", "반지 제작 상담", "2026-09", "client-key-0000000001"
    );
  }

  private MessageInput validMessage() {
    return new MessageInput("추가 문의", "client-key-0000000002");
  }

  private Map<String, String> requestMeta() {
    return Map.of("userAgent", "test-browser");
  }

  private Conversation conversation(
      String state,
      String inquiryId,
      String pendingAction,
      String attentionCode,
      long topicThreadId,
      long rootMessageId
  ) {
    return conversationWithId(
        "conversation-1", state, inquiryId, pendingAction, attentionCode,
        topicThreadId, rootMessageId
    );
  }

  private Conversation conversationWithId(
      String id,
      String state,
      String inquiryId,
      String pendingAction,
      String attentionCode,
      long topicThreadId,
      long rootMessageId
  ) {
    return new Conversation(
        id, "visitor-1", 3L, "-1003425727647", inquiryId, "ko", state,
        "홍길동", "01012345678", "반지 제작 상담", "2026-09", NOW, attentionCode,
        pendingAction, 0L, "", topicThreadId, rootMessageId, 0L, NOW, NOW, NOW, null
    );
  }

  private Message visitorMessage(long id, String state, long telegramMessageId) {
    return new Message(
        id, "conversation-1", "visitor", "추가 문의", state,
        "client-key-0000000002", telegramMessageId, NOW
    );
  }
}
