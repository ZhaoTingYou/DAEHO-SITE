package com.daeho.cms.controller;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.TelegramLiveChatCredentialService;
import com.daeho.cms.service.TelegramLiveChatService;
import jakarta.servlet.http.HttpServletRequest;
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
  private final AdminAuth auth;
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatService liveChat;
  private final TelegramLiveChatRepository repository;

  public AdminTelegramLiveChatController(
      AdminAuth auth,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatService liveChat,
      TelegramLiveChatRepository repository
  ) {
    this.auth = auth;
    this.credentials = credentials;
    this.liveChat = liveChat;
    this.repository = repository;
  }

  @GetMapping
  public Map<String, Object> settings(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of(
        "settings", credentials.adminView(),
        "sessions", repository.recentSessions(50)
    );
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
    var session = repository.reconcile(sessionId);
    if (session == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Live-chat session not found");
    }
    return Map.of("session", session);
  }

  @PostMapping("/sessions/{sessionId}/retry-delivery")
  public Map<String, Object> retryDelivery(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    return Map.of("session", liveChat.retryUncertainDelivery(sessionId));
  }

  @PostMapping("/sessions/{sessionId}/reset-topic-creation")
  public Map<String, Object> resetTopicCreation(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var session = repository.confirmTopicMissingAndReset(sessionId);
    if (session == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This Topic creation no longer requires recovery."
      );
    }
    return Map.of("session", session);
  }

  @PostMapping("/sessions/{sessionId}/close")
  public Map<String, Object> close(
      @PathVariable String sessionId,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    return Map.of("session", liveChat.closeConversation(sessionId));
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

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
