package com.daeho.cms.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daeho.cms.config.WebLiveChatProperties;
import com.daeho.cms.error.ApiExceptionHandler;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.SessionView;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import com.daeho.cms.repository.WebLiveChatRepository.Visitor;
import com.daeho.cms.security.WebLiveChatTokenCodec;
import com.daeho.cms.service.WebLiveChatEventBroker;
import com.daeho.cms.service.WebLiveChatInputValidator;
import com.daeho.cms.service.WebLiveChatService;
import com.daeho.cms.service.TelegramLiveChatException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class WebLiveChatControllerTest {
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  private WebLiveChatRepository repository;
  private WebLiveChatService liveChat;
  private WebLiveChatEventBroker broker;
  private WebLiveChatTokenCodec codec;
  private WebLiveChatController controller;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    repository = mock(WebLiveChatRepository.class);
    liveChat = mock(WebLiveChatService.class);
    broker = mock(WebLiveChatEventBroker.class);
    var properties = new WebLiveChatProperties(
        "test-session-secret-with-at-least-32-characters", "daeho_live_chat", 30,
        "https://daeho.works"
    );
    codec = new WebLiveChatTokenCodec(properties);
    var visitor = visitor();
    when(repository.createVisitor(anyString(), eq(Duration.ofDays(30)))).thenReturn(visitor);
    when(repository.consumeRateBucket(anyString(), anyString(), anyInt(), any(Duration.class)))
        .thenReturn(true);
    when(liveChat.session(visitor)).thenReturn(new SessionView(null, List.of(), 0L));
    controller = new WebLiveChatController(
        properties, codec, repository, new WebLiveChatInputValidator(), liveChat, broker
    );
    mvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new ApiExceptionHandler())
        .build();
  }

  @Test
  void everyPublicEndpointFailsClosedWhenTheCodecIsBlank() throws Exception {
    var disabledProperties = new WebLiveChatProperties("", "daeho_live_chat", 30, "https://daeho.works");
    var disabled = MockMvcBuilders.standaloneSetup(new WebLiveChatController(
            disabledProperties, new WebLiveChatTokenCodec(disabledProperties), repository,
            new WebLiveChatInputValidator(), liveChat, broker
        ))
        .setControllerAdvice(new ApiExceptionHandler())
        .build();

    disabled.perform(get("/api/live-chat/session").header("Origin", "https://daeho.works"))
        .andExpect(status().isServiceUnavailable());
    disabled.perform(post("/api/live-chat/conversations")
            .header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isServiceUnavailable());
    disabled.perform(post("/api/live-chat/conversations/current/messages")
            .header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isServiceUnavailable());
    disabled.perform(get("/api/live-chat/conversations/current/messages")
            .header("Origin", "https://daeho.works"))
        .andExpect(status().isServiceUnavailable());
    disabled.perform(get("/api/live-chat/conversations/current/events")
            .header("Origin", "https://daeho.works"))
        .andExpect(status().isServiceUnavailable());
    disabled.perform(post("/api/live-chat/conversations/current/read")
            .header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isServiceUnavailable());
    verify(repository, never()).createVisitor(anyString(), any(Duration.class));
  }

  @Test
  void rejectsForeignAndPathBearingOriginsBeforeResolvingAVisitor() throws Exception {
    mvc.perform(get("/api/live-chat/session").header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/live-chat/session").header("Origin", "https://daeho.works/evil"))
        .andExpect(status().isForbidden());

    verify(repository, never()).createVisitor(anyString(), any(Duration.class));
  }

  @Test
  void rejectsRequestsWithoutOriginOrRefererBeforeResolvingAVisitor() throws Exception {
    mvc.perform(get("/api/live-chat/session"))
        .andExpect(status().isForbidden());

    verify(repository, never()).createVisitor(anyString(), any(Duration.class));
  }

  @Test
  void honeypotIsRejectedWith422BeforeConversationWork() throws Exception {
    mvc.perform(post("/api/live-chat/conversations")
            .header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON)
            .content(startJson("spam.example")))
        .andExpect(status().isUnprocessableEntity());

    verify(liveChat, never()).start(any(), any(), any());
  }

  @Test
  void startConsumesExactIpAndVisitorBucketsBeforeReusingAnActiveConversation() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.start(eq(visitor), any(), eq(Map.of()))).thenReturn(conversation("active"));
    when(repository.touchVisitor(visitor.id(), Duration.ofDays(30))).thenReturn(visitor);

    mvc.perform(post("/api/live-chat/conversations")
            .cookie(cookie())
            .header("Origin", "https://daeho.works")
            .header("X-Daeho-Client-IP", "203.0.113.8")
            .header("X-Forwarded-For", "198.51.100.4, 198.51.100.5")
            .contentType(MediaType.APPLICATION_JSON)
            .content(startJson("")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.conversation.state").value("active"))
        .andExpect(jsonPath("$.conversation.visitorId").doesNotExist())
        .andExpect(jsonPath("$.conversation.targetChatId").doesNotExist())
        .andExpect(header().string("Set-Cookie", containsString("daeho_live_chat=raw-token")));

    verify(repository).consumeRateBucket(
        codec.ipHash("203.0.113.8"), "start_ip_hour", 5, Duration.ofHours(1)
    );
    verify(repository).consumeRateBucket(
        codec.hash("rate:visitor:" + visitor.id()), "start_visitor_hour", 3, Duration.ofHours(1)
    );
    verify(repository).touchVisitor(visitor.id(), Duration.ofDays(30));
  }

  @Test
  void lostStartResponseReplayBypassesQuotaUsingTheOriginalLogicalKey() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.resolveExistingStart(eq(visitor), any())).thenReturn(conversation("active"));
    when(repository.consumeRateBucket(anyString(), anyString(), anyInt(), any(Duration.class)))
        .thenReturn(false);

    mvc.perform(post("/api/live-chat/conversations")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON).content(startJson("")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.conversation.state").value("active"));

    verify(repository, never()).consumeRateBucket(anyString(), anyString(), anyInt(), any());
    verify(liveChat, never()).start(any(), any(), any());
  }

  @Test
  void anyFullRateBucketReturns429BeforeServiceWrites() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(repository.consumeRateBucket(
        codec.hash("rate:visitor:" + visitor.id()), "message_visitor_minute", 20,
        Duration.ofMinutes(1)
    )).thenReturn(false);

    mvc.perform(post("/api/live-chat/conversations/current/messages")
            .cookie(cookie())
            .header("Origin", "https://daeho.works")
            .header("X-Forwarded-For", "198.51.100.4, 198.51.100.5")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"body\":\"추가 문의\",\"clientMessageKey\":\"client-message-key-0001\"}"))
        .andExpect(status().isTooManyRequests());

    verify(repository).consumeRateBucket(
        codec.hash("rate:visitor:" + visitor.id()), "message_visitor_minute", 20,
        Duration.ofMinutes(1)
    );
    verify(liveChat, never()).send(any(), any());
    verify(repository, never()).touchVisitor(anyString(), any(Duration.class));
  }

  @Test
  void messageWriteUsesFirstForwardedIpAndRenewsButReadsNeverRenew() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(repository.touchVisitor(visitor.id(), Duration.ofDays(30))).thenReturn(visitor);
    when(liveChat.send(eq(visitor), any())).thenReturn(new WebLiveChatService.SendResult(41L, "sent"));
    when(liveChat.messages(visitor, 0L)).thenReturn(List.of());
    when(liveChat.markRead(visitor, 41L)).thenReturn(conversation("active"));

    mvc.perform(post("/api/live-chat/conversations/current/messages")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .header("X-Forwarded-For", "198.51.100.4, 198.51.100.5")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"body\":\"추가 문의\",\"clientMessageKey\":\"client-message-key-0001\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"));
    mvc.perform(get("/api/live-chat/conversations/current/messages")
            .cookie(cookie()).header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(header().doesNotExist("Set-Cookie"));
    mvc.perform(post("/api/live-chat/conversations/current/read")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON).content("{\"messageId\":41}"))
        .andExpect(status().isOk())
        .andExpect(header().doesNotExist("Set-Cookie"));

    verify(repository).consumeRateBucket(
        codec.ipHash("198.51.100.4"), "message_ip_hour", 60, Duration.ofHours(1)
    );
    verify(repository, times(1)).touchVisitor(visitor.id(), Duration.ofDays(30));
  }

  @Test
  void ownerCookieHistoryIncludesVisitorMessagesAtTheHttpSeam() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.messages(visitor, 40L)).thenReturn(List.of(
        message(41L, "visitor"), message(42L, "team"), message(43L, "system")
    ));

    mvc.perform(get("/api/live-chat/conversations/current/messages?after=40")
            .cookie(cookie()).header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(3))
        .andExpect(jsonPath("$.items[0].id").value(41))
        .andExpect(jsonPath("$.items[0].direction").value("visitor"))
        .andExpect(jsonPath("$.items[1].id").value(42))
        .andExpect(jsonPath("$.items[2].id").value(43));
  }

  @Test
  void ssePinsOwnershipAndEveryReplayPageToTheConversationRegisteredBeforeANewStart()
      throws Exception {
    var visitor = visitor();
    var original = conversationWithId("conversation-original", "active");
    var replacement = conversationWithId("conversation-new", "active");
    existingCookie(visitor);
    when(liveChat.session(visitor)).thenReturn(new SessionView(original, List.of(), 0L));
    when(repository.conversationForVisitor(visitor.id(), original.id())).thenReturn(original);
    var firstPage = LongStream.rangeClosed(41L, 140L)
        .mapToObj(id -> message(id, original.id(), "team"))
        .toList();
    when(repository.visibleMessagesAfter(original.id(), 40L, 100)).thenAnswer(invocation -> {
      when(liveChat.session(visitor)).thenReturn(new SessionView(replacement, List.of(), 0L));
      return firstPage;
    });
    when(repository.visibleMessagesAfter(original.id(), 140L, 100))
        .thenReturn(List.of(message(141L, original.id(), "team")));
    when(repository.visibleMessagesAfter(eq(replacement.id()), anyLong(), eq(100)))
        .thenReturn(List.of(message(1_001L, replacement.id(), "team")));

    // The pre-fix implementation re-resolves latest on each page and mixes this replacement row.
    when(liveChat.messages(visitor, 40L)).thenReturn(firstPage);
    when(liveChat.messages(visitor, 140L)).thenReturn(
        List.of(message(1_001L, replacement.id(), "team"))
    );
    var emitter = new SseEmitter(70_000L);
    when(broker.open(eq(original.id()), any())).thenReturn(emitter);

    mvc.perform(get("/api/live-chat/conversations/current/events")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .header("Last-Event-ID", "40"))
        .andExpect(request().asyncStarted())
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", containsString("text/event-stream")));

    @SuppressWarnings("unchecked")
    var replay = ArgumentCaptor.forClass(Supplier.class);
    verify(broker).open(eq(original.id()), replay.capture());
    @SuppressWarnings("unchecked")
    var replayed = (List<Message>) replay.getValue().get();
    assertEquals(101, replayed.size());
    assertEquals(true, replayed.stream()
        .allMatch(message -> original.id().equals(message.conversationId())));
    verify(repository).conversationForVisitor(visitor.id(), original.id());
    verify(repository).visibleMessagesAfter(original.id(), 40L, 100);
    verify(repository).visibleMessagesAfter(original.id(), 140L, 100);
    verify(repository, never()).visibleMessagesAfter(eq(replacement.id()), anyLong(), eq(100));
    verify(liveChat).session(visitor);
    verify(liveChat, never()).messages(any(), anyLong());
    emitter.complete();
  }

  @Test
  void repeatedReadMarksAreIdempotentlyForwardedWithoutExpiryRenewal() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.markRead(visitor, 42L)).thenReturn(conversation("active"));

    for (var attempt = 0; attempt < 2; attempt++) {
      mvc.perform(post("/api/live-chat/conversations/current/read")
              .cookie(cookie()).header("Origin", "https://daeho.works")
              .contentType(MediaType.APPLICATION_JSON).content("{\"messageId\":42}"))
          .andExpect(status().isOk());
    }

    verify(liveChat, times(2)).markRead(visitor, 42L);
    verify(repository, never()).touchVisitor(anyString(), any(Duration.class));
  }

  @Test
  void cookieOwnershipSelectsOnlyThatVisitorAndAnExistingSessionGetDoesNotRenew() throws Exception {
    var other = new Visitor(
        "visitor-2", NOW.plus(Duration.ofDays(30)), NOW, NOW, NOW
    );
    when(liveChat.session(visitor())).thenReturn(new SessionView(
        conversation("active"), List.of(message(41L, "visitor")), 0L
    ));
    when(repository.visitorByTokenHash(codec.hash("other-token"))).thenReturn(other);
    when(liveChat.session(other)).thenReturn(new SessionView(null, List.of(), 0L));

    mvc.perform(get("/api/live-chat/session")
            .cookie(new MockCookie("daeho_live_chat", "other-token"))
            .header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.conversation").isEmpty())
        .andExpect(jsonPath("$.messages.length()").value(0))
        .andExpect(header().doesNotExist("Set-Cookie"));

    verify(liveChat).session(other);
    verify(liveChat, never()).session(visitor());
    verify(repository, never()).touchVisitor(anyString(), any(Duration.class));
  }

  @Test
  void sessionIssuesASecureAnonymousCookieWithoutExposingTheTokenInJson() throws Exception {
    mvc.perform(get("/api/live-chat/session?issue=true").header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(header().string("Set-Cookie", allOf(
            containsString("daeho_live_chat="), containsString("HttpOnly"),
            containsString("Secure"), containsString("SameSite=Lax"),
            containsString("Path=/api/live-chat"))))
        .andExpect(jsonPath("$.token").doesNotExist())
        .andExpect(jsonPath("$.unreadCount").value(0));

    verify(repository).createVisitor(anyString(), eq(Duration.ofDays(30)));
  }

  @Test
  void passiveSessionCheckWithoutCookieDoesNotCreateVisitorIdentity() throws Exception {
    mvc.perform(get("/api/live-chat/session").header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.conversation").isEmpty())
        .andExpect(jsonPath("$.messages.length()").value(0))
        .andExpect(header().doesNotExist("Set-Cookie"));

    verify(repository, never()).createVisitor(anyString(), any(Duration.class));
    verify(liveChat, never()).session(any());
  }

  @Test
  void maximumKoreanHistoryPageStaysBelowTheClientByteBudget() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    var koreanBody = "한".repeat(2_000);
    var history = LongStream.rangeClosed(1L, 24L)
        .mapToObj(id -> new Message(
            id, "conversation-1", "visitor", koreanBody, "delivered", "key-" + id, 0L, NOW
        ))
        .toList();
    when(liveChat.session(visitor)).thenReturn(new SessionView(
        conversation("active"), history, 0L
    ));

    var response = mvc.perform(get("/api/live-chat/session")
            .cookie(cookie()).header("Origin", "https://daeho.works"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.messages.length()").value(24))
        .andReturn().getResponse();

    assertTrue(response.getContentAsByteArray().length < 256 * 1024);
  }

  @Test
  void deliveredIdempotencyReplayBypassesFullQuotaAndDoesNotRenewIdentity() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    var input = new WebLiveChatInputValidator.MessageInput(
        "추가 문의", "client-message-key-0001"
    );
    when(liveChat.resolveExistingSend(visitor, input))
        .thenReturn(new WebLiveChatService.SendResult(41L, "sent"));
    when(repository.consumeRateBucket(anyString(), anyString(), anyInt(), any(Duration.class)))
        .thenReturn(false);

    mvc.perform(post("/api/live-chat/conversations/current/messages")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"body\":\"추가 문의\",\"clientMessageKey\":\"client-message-key-0001\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.messageId").value(41))
        .andExpect(jsonPath("$.status").value("sent"));

    verify(repository, never()).consumeRateBucket(anyString(), anyString(), anyInt(), any());
    verify(liveChat, never()).send(any(), any());
    verify(repository, never()).touchVisitor(anyString(), any());
  }

  @Test
  void newMessageConsumesIntervalAndSaltedDuplicateBucketsBeforeDelivery() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.resolveExistingSend(eq(visitor), any())).thenReturn(null);
    when(liveChat.send(eq(visitor), any()))
        .thenReturn(new WebLiveChatService.SendResult(41L, "sent"));
    when(repository.touchVisitor(visitor.id(), Duration.ofDays(30))).thenReturn(visitor);

    mvc.perform(post("/api/live-chat/conversations/current/messages")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"body\":\"추가 문의\",\"clientMessageKey\":\"client-message-key-0001\"}"))
        .andExpect(status().isOk());

    verify(repository).consumeRateBucket(
        codec.hash("rate:visitor:" + visitor.id()), "message_minimum_interval", 1,
        Duration.ofSeconds(2)
    );
    verify(repository).consumeRateBucket(
        codec.hash("duplicate:visitor:" + visitor.id() + ":추가 문의"),
        "message_duplicate", 1, Duration.ofSeconds(30)
    );
  }

  @Test
  void telegramFailuresReturnNeutralStructuredUpstreamErrors() throws Exception {
    var visitor = visitor();
    existingCookie(visitor);
    when(liveChat.resolveExistingSend(eq(visitor), any())).thenReturn(null);
    when(liveChat.send(eq(visitor), any()))
        .thenThrow(new TelegramLiveChatException("sensitive Telegram detail", true));

    mvc.perform(post("/api/live-chat/conversations/current/messages")
            .cookie(cookie()).header("Origin", "https://daeho.works")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"body\":\"추가 문의\",\"clientMessageKey\":\"client-message-key-0001\"}"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("Live-chat upstream is temporarily unavailable."))
        .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.not(
            org.hamcrest.Matchers.containsString("Telegram")
        )));
  }

  private Visitor visitor() {
    return new Visitor("visitor-1", NOW.plus(Duration.ofDays(30)), NOW, NOW, NOW);
  }

  private void existingCookie(Visitor visitor) {
    when(repository.visitorByTokenHash(codec.hash("raw-token"))).thenReturn(visitor);
  }

  private MockCookie cookie() {
    return new MockCookie("daeho_live_chat", "raw-token");
  }

  private String startJson(String honeypot) {
    return """
        {"locale":"ko","name":"홍길동","contact":"01012345678",
         "content":"반지 제작 상담","consent":true,"consentVersion":"2026-09-01",
         "clientMessageKey":"client-message-key-0001","companyWebsite":"%s",
         "formStartedAt":%d}
        """.formatted(honeypot, Instant.now().minusSeconds(2).toEpochMilli());
  }

  private Conversation conversation(String state) {
    return conversationWithId("conversation-1", state);
  }

  private Conversation conversationWithId(String id, String state) {
    return new Conversation(
        id, "visitor-1", 3L, "-1003425727647", "inquiry-1", "ko", state,
        "홍길동", "01012345678", "반지 제작 상담", "2026-09-01", NOW, "", "", 0L,
        "", 701L, 702L, 0L, NOW, NOW, NOW, "closed".equals(state) ? NOW : null
    );
  }

  private Message message(long id, String direction) {
    return message(id, "conversation-1", direction);
  }

  private Message message(long id, String conversationId, String direction) {
    return new Message(
        id, conversationId, direction, "message-" + id, "delivered", "", 0L, NOW
    );
  }
}
