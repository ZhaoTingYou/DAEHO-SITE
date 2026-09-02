package com.daeho.cms.controller;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.TelegramLiveChatCredentialService;
import com.daeho.cms.service.TelegramLiveChatService;
import com.daeho.cms.service.WebLiveChatService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/live-chat")
public class AdminTelegramLiveChatController {
  private static final int CLOSED_HISTORY_LIMIT = 50;
  private final AdminAuth auth;
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatService liveChat;
  private final TelegramLiveChatRepository repository;
  private final WebLiveChatService webLiveChat;
  private final WebLiveChatRepository webRepository;

  public AdminTelegramLiveChatController(
      AdminAuth auth,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatService liveChat,
      TelegramLiveChatRepository repository,
      WebLiveChatService webLiveChat,
      WebLiveChatRepository webRepository
  ) {
    this.auth = auth;
    this.credentials = credentials;
    this.liveChat = liveChat;
    this.repository = repository;
    this.webLiveChat = webLiveChat;
    this.webRepository = webRepository;
  }

  @GetMapping
  public Map<String, Object> settings(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of(
        "settings", credentials.adminView(),
        "sessions", recentSessions()
    );
  }

  private List<AdminSession> recentSessions() {
    var rows = new java.util.ArrayList<AdminRow>();
    webRepository.recentConversations(50).stream()
        .map(this::websiteRow)
        .forEach(rows::add);
    repository.recentSessions(50).stream()
        .map(this::legacyRow)
        .forEach(rows::add);
    rows.sort(Comparator.comparing(AdminRow::updatedAt).reversed()
        .thenComparing(row -> row.session().source())
        .thenComparing(row -> row.session().id()));
    var sessions = new java.util.ArrayList<AdminSession>();
    var closedCount = 0;
    for (var row : rows) {
      if (row.actionable()) {
        sessions.add(row.session());
      } else if (closedCount < CLOSED_HISTORY_LIMIT) {
        sessions.add(row.session());
        closedCount += 1;
      }
    }
    return List.copyOf(sessions);
  }

  private AdminRow websiteRow(WebLiveChatRepository.CmsConversationSummary summary) {
    var conversation = summary.conversation();
    return new AdminRow(
        websiteSession(summary), conversation.updatedAt(), !"closed".equals(conversation.state())
    );
  }

  private AdminRow legacyRow(TelegramLiveChatRepository.Session session) {
    return new AdminRow(
        legacySession(session), timestamp(session.updatedAt()),
        !"closed".equals(session.state()) || session.attentionCode().startsWith("topic_close_")
    );
  }

  private Instant timestamp(String value) {
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException ignored) {
      return OffsetDateTime.parse(value).toInstant();
    }
  }

  private AdminSession websiteSession(WebLiveChatRepository.CmsConversationSummary summary) {
    var conversation = summary.conversation();
    return new AdminSession(
        conversation.id(), "website", conversation.state(), conversation.customerName(),
        conversation.customerContact(), conversation.inquiryContent(), conversation.inquiryId(),
        positiveOrNull(conversation.topicThreadId()), conversation.attentionCode(),
        summary.unreadCount(), conversation.createdAt().toString(),
        conversation.updatedAt().toString()
    );
  }

  private AdminSession websiteSession(WebLiveChatRepository.Conversation conversation) {
    return new AdminSession(
        conversation.id(), "website", conversation.state(), conversation.customerName(),
        conversation.customerContact(), conversation.inquiryContent(), conversation.inquiryId(),
        positiveOrNull(conversation.topicThreadId()), conversation.attentionCode(),
        webRepository.unreadCount(conversation.id()), conversation.createdAt().toString(),
        conversation.updatedAt().toString()
    );
  }

  private AdminSession legacySession(TelegramLiveChatRepository.Session session) {
    return new AdminSession(
        session.id(), "telegram_legacy", legacyState(session.state()), session.customerName(),
        session.customerContact(), session.inquiryContent(), session.inquiryId(),
        positiveOrNull(session.topicThreadId()), session.attentionCode(), 0L,
        session.createdAt(), session.updatedAt()
    );
  }

  private String legacyState(String state) {
    return switch (state) {
      case "active", "needs_attention", "closed" -> state;
      default -> "opening";
    };
  }

  private Long positiveOrNull(long value) {
    return value > 0 ? value : null;
  }

  private ResolvedSession resolve(String sessionId) {
    var website = webRepository.conversationById(sessionId);
    var legacy = repository.sessionById(sessionId);
    if (website != null && legacy != null) {
      throw conflict("The live-chat session ID is ambiguous.");
    }
    if (website == null && legacy == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Live-chat session not found.");
    }
    return new ResolvedSession(website, legacy);
  }

  @PutMapping
  public Map<String, Object> update(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    validate(body);
    return Map.of("settings", safe(credentials.update(body)));
  }

  @PostMapping("/connect")
  public Map<String, Object> connect(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("settings", safe(credentials.connect()));
  }

  @PostMapping("/connect/reset")
  public Map<String, Object> resetConnect(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("settings", safe(credentials.resetConnectSetup()));
  }

  @PostMapping("/enable")
  public Map<String, Object> enable(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var enabled = body.get("enabled") instanceof Boolean value && value;
    return Map.of("settings", safe(credentials.setEnabled(enabled)));
  }

  @PostMapping("/sessions/{sessionId}/reconcile")
  public Map<String, Object> reconcile(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var source = resolve(sessionId);
    if (source.website() != null) {
      invalid("Reconcile is only available for legacy sessions.");
    }
    var session = repository.reconcile(sessionId);
    if (session == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Live-chat session not found");
    }
    return Map.of("session", legacySession(session));
  }

  @PostMapping("/sessions/{sessionId}/retry-delivery")
  public Map<String, Object> retryDelivery(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var source = resolve(sessionId);
    if (source.website() != null) {
      var attentionCode = source.website().attentionCode();
      if (!List.of(
          "registration_delivery_failed", "registration_delivery_uncertain"
      ).contains(attentionCode)) {
        invalid("Registration delivery cannot be retried in this state.");
      }
      return Map.of(
          "session",
          websiteSession(webLiveChat.retryRegistrationFromCms(sessionId, attentionCode))
      );
    }
    return Map.of("session", legacySession(liveChat.retryUncertainDelivery(sessionId)));
  }

  @PostMapping("/sessions/{sessionId}/reset-topic-creation")
  public Map<String, Object> resetTopicCreation(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var source = resolve(sessionId);
    if (source.website() != null) {
      var attentionCode = source.website().attentionCode();
      if (!List.of("topic_creation_failed", "topic_creation_uncertain").contains(attentionCode)) {
        invalid("Topic creation cannot be reset in this state.");
      }
      return Map.of(
          "session",
          websiteSession(webLiveChat.resetTopicCreationFromCms(sessionId, attentionCode))
      );
    }
    var session = repository.confirmTopicMissingAndReset(sessionId);
    if (session == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This Topic creation no longer requires recovery."
      );
    }
    return Map.of("session", legacySession(session));
  }

  @PostMapping("/sessions/{sessionId}/close")
  public Map<String, Object> close(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var source = resolve(sessionId);
    if (source.website() != null) {
      var closed = webLiveChat.closeFromCms(sessionId);
      if (closed == null) {
        throw conflict("This website conversation is already closed or cannot be closed.");
      }
      return Map.of("session", websiteSession(closed));
    }
    return Map.of("session", legacySession(liveChat.closeConversation(sessionId)));
  }

  private Map<String, Object> safe(TelegramLiveChatRepository.Settings settings) {
    return Map.ofEntries(
        Map.entry("enabled", settings.enabled()),
        Map.entry("botTokenConfigured", !settings.botTokenCiphertext().isBlank()),
        Map.entry("botUsername", settings.botUsername()),
        Map.entry("targetChatId", settings.targetChatId()),
        Map.entry("messageThreadId", settings.messageThreadId()),
        Map.entry("topicName", settings.topicName()),
        Map.entry("connected", settings.connected()),
        Map.entry("setupState", settings.setupState()),
        Map.entry("setupErrorCode", settings.setupErrorCode()),
        Map.entry("setupNeedsAttention", "needs_attention".equals(settings.setupState())),
        Map.entry("verifiedAt", settings.verifiedAt()),
        Map.entry("updatedAt", settings.updatedAt())
    );
  }

  private void validate(Map<String, Object> body) {
    var token = text(body.get("botToken"));
    var chatId = text(body.get("targetChatId"));
    if (token.length() > 512 || (!token.isBlank() && !validBotToken(token))) {
      invalid("Telegram Bot token is invalid.");
    }
    if (chatId.length() > 80 || (!chatId.isBlank() && !chatId.matches("^-?\\d+$"))) {
      invalid("Telegram group Chat ID is invalid.");
    }
  }

  private boolean validBotToken(String token) {
    return token.matches("^[0-9]{5,20}:[A-Za-z0-9_-]{20,128}$");
  }

  private void invalid(String message) {
    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record AdminSession(
      String id,
      String source,
      String state,
      String customerName,
      String customerContact,
      String inquiryContent,
      String inquiryId,
      Long topicThreadId,
      String attentionCode,
      long unreadCount,
      String createdAt,
      String updatedAt
  ) {}

  private record ResolvedSession(
      WebLiveChatRepository.Conversation website,
      TelegramLiveChatRepository.Session legacy
  ) {}

  private record AdminRow(AdminSession session, Instant updatedAt, boolean actionable) {}
}
