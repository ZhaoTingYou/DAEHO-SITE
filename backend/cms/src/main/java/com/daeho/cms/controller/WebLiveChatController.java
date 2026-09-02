package com.daeho.cms.controller;

import com.daeho.cms.config.WebLiveChatProperties;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import com.daeho.cms.repository.WebLiveChatRepository.Visitor;
import com.daeho.cms.security.WebLiveChatTokenCodec;
import com.daeho.cms.service.WebLiveChatEventBroker;
import com.daeho.cms.service.WebLiveChatInputValidator;
import com.daeho.cms.service.WebLiveChatService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/live-chat")
public class WebLiveChatController {
  private static final String COOKIE_PATH = "/api/live-chat";
  private static final Duration COOKIE_AGE = Duration.ofDays(30);
  private static final Duration START_WINDOW = Duration.ofHours(1);
  private static final Duration MESSAGE_VISITOR_WINDOW = Duration.ofMinutes(1);
  private static final Duration MESSAGE_IP_WINDOW = Duration.ofHours(1);
  private static final int REPLAY_PAGE_SIZE = 100;

  private final WebLiveChatProperties properties;
  private final WebLiveChatTokenCodec codec;
  private final WebLiveChatRepository repository;
  private final WebLiveChatInputValidator validator;
  private final WebLiveChatService liveChat;
  private final WebLiveChatEventBroker broker;

  public WebLiveChatController(
      WebLiveChatProperties properties,
      WebLiveChatTokenCodec codec,
      WebLiveChatRepository repository,
      WebLiveChatInputValidator validator,
      WebLiveChatService liveChat,
      WebLiveChatEventBroker broker
  ) {
    this.properties = properties;
    this.codec = codec;
    this.repository = repository;
    this.validator = validator;
    this.liveChat = liveChat;
    this.broker = broker;
  }

  @GetMapping("/session")
  public Map<String, Object> session(HttpServletRequest request, HttpServletResponse response) {
    authorize(request);
    var identity = identity(request, response);
    return sessionResponse(liveChat.session(identity.visitor()));
  }

  @PostMapping("/conversations")
  public Map<String, Object> start(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    authorize(request);
    var identity = identity(request, response);
    if (!value(body, "companyWebsite").isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Spam submission rejected.");
    }
    enforceStartLimits(identity.visitor(), request);
    var input = validator.validateStart(body, formAge(body));
    var conversation = liveChat.start(identity.visitor(), input, Map.of());
    renewAfterCustomerWrite(identity, response);
    return Map.of("conversation", publicConversation(conversation));
  }

  @PostMapping("/conversations/current/messages")
  public Map<String, Object> send(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    authorize(request);
    var identity = identity(request, response);
    enforceMessageLimits(identity.visitor(), request);
    var result = liveChat.send(identity.visitor(), validator.validateMessage(body));
    renewAfterCustomerWrite(identity, response);
    return Map.of("messageId", result.messageId(), "status", result.status());
  }

  @GetMapping("/conversations/current/messages")
  public Map<String, Object> messages(
      @RequestParam(name = "after", defaultValue = "0") long after,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    authorize(request);
    var identity = identity(request, response);
    return Map.of("items", liveChat.messages(identity.visitor(), Math.max(0L, after)).stream()
        .filter(this::ownerVisible)
        .map(this::publicMessage)
        .toList());
  }

  @GetMapping(path = "/conversations/current/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter events(
      @RequestHeader(name = "Last-Event-ID", required = false) String lastEventId,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    authorize(request);
    var identity = identity(request, response);
    var view = liveChat.session(identity.visitor());
    if (view.conversation() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "There is no current conversation.");
    }
    var selected = view.conversation();
    var owned = repository.conversationForVisitor(identity.visitor().id(), selected.id());
    if (owned == null
        || owned.configurationGeneration() != selected.configurationGeneration()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conversation access is denied.");
    }
    var after = eventId(lastEventId);
    return broker.open(
        owned.id(),
        () -> replay(owned.id(), after)
    );
  }

  @PostMapping("/conversations/current/read")
  public Map<String, Object> read(
      @RequestBody(required = false) Map<String, Object> body,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    authorize(request);
    var identity = identity(request, response);
    var conversation = liveChat.markRead(identity.visitor(), longValue(body, "messageId"));
    return Map.of("conversation", publicConversation(conversation));
  }

  private void authorize(HttpServletRequest request) {
    if (!codec.configured()) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Web live chat is temporarily unavailable."
      );
    }
    var supplied = text(request.getHeader("Origin"));
    if (supplied.isBlank()) {
      supplied = refererOrigin(request.getHeader("Referer"));
    }
    if (!properties.normalizedOrigins().contains(normalizedOrigin(supplied))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Origin is not allowed.");
    }
  }

  private Identity identity(HttpServletRequest request, HttpServletResponse response) {
    var raw = cookie(request, properties.cookieName());
    if (!raw.isBlank()) {
      var visitor = repository.visitorByTokenHash(codec.hash(raw));
      if (visitor != null) {
        return new Identity(visitor, raw, false);
      }
    }
    for (var attempt = 0; attempt < 3; attempt++) {
      var issued = codec.issue();
      var visitor = repository.createVisitor(issued.hash(), COOKIE_AGE);
      if (visitor != null) {
        setCookie(response, issued.raw());
        return new Identity(visitor, issued.raw(), true);
      }
    }
    throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE, "Web live chat is temporarily unavailable."
    );
  }

  private void renewAfterCustomerWrite(Identity identity, HttpServletResponse response) {
    if (!identity.newlyIssued()) {
      var renewed = repository.touchVisitor(identity.visitor().id(), COOKIE_AGE);
      if (renewed == null) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "The anonymous session expired.");
      }
      setCookie(response, identity.rawToken());
    }
  }

  private void setCookie(HttpServletResponse response, String rawToken) {
    response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie
        .from(properties.cookieName(), rawToken)
        .httpOnly(true)
        .secure(true)
        .sameSite("Lax")
        .path(COOKIE_PATH)
        .maxAge(COOKIE_AGE)
        .build()
        .toString());
  }

  private void enforceStartLimits(Visitor visitor, HttpServletRequest request) {
    var ipHash = clientIpHash(request);
    requireBucket(ipHash, "start_ip_hour", 5, START_WINDOW);
    requireBucket(visitorKey(visitor), "start_visitor_hour", 3, START_WINDOW);
  }

  private void enforceMessageLimits(Visitor visitor, HttpServletRequest request) {
    var ipHash = clientIpHash(request);
    requireBucket(visitorKey(visitor), "message_visitor_minute", 20, MESSAGE_VISITOR_WINDOW);
    requireBucket(ipHash, "message_ip_hour", 60, MESSAGE_IP_WINDOW);
  }

  private void requireBucket(String keyHash, String action, int limit, Duration window) {
    if (!repository.consumeRateBucket(keyHash, action, limit, window)) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests.");
    }
  }

  private String visitorKey(Visitor visitor) {
    return codec.hash("rate:visitor:" + visitor.id());
  }

  private String clientIpHash(HttpServletRequest request) {
    var source = text(request.getHeader("X-Daeho-Client-IP"));
    if (source.isBlank()) {
      var forwarded = text(request.getHeader("X-Forwarded-For"));
      source = forwarded.isBlank() ? text(request.getRemoteAddr()) : forwarded.split(",", 2)[0].trim();
    }
    return codec.ipHash(source);
  }

  private Map<String, Object> sessionResponse(WebLiveChatRepository.SessionView view) {
    var result = new LinkedHashMap<String, Object>();
    result.put("available", true);
    result.put("conversation", view.conversation() == null ? null : publicConversation(view.conversation()));
    result.put("messages", view.messages().stream()
        .filter(this::ownerVisible)
        .map(this::publicMessage)
        .toList());
    result.put("unreadCount", view.unreadCount());
    return result;
  }

  private Map<String, Object> publicConversation(Conversation conversation) {
    if (conversation == null) {
      return Map.of();
    }
    var result = new LinkedHashMap<String, Object>();
    result.put("state", conversation.state());
    result.put("locale", conversation.locale());
    result.put("createdAt", conversation.createdAt().toString());
    result.put("closedAt", conversation.closedAt() == null ? null : conversation.closedAt().toString());
    result.put("lastReadTeamMessageId", conversation.lastReadTeamMessageId());
    return result;
  }

  private Map<String, Object> publicMessage(Message message) {
    return Map.of(
        "id", message.id(),
        "body", message.body(),
        "direction", message.direction(),
        "createdAt", message.createdAt().toString()
    );
  }

  private boolean publiclyVisible(Message message) {
    return "team".equals(message.direction()) || "system".equals(message.direction());
  }

  private boolean ownerVisible(Message message) {
    return "visitor".equals(message.direction()) || publiclyVisible(message);
  }

  private List<Message> replay(String conversationId, long after) {
    var replay = new ArrayList<Message>();
    var cursor = after;
    while (true) {
      var page = repository.visibleMessagesAfter(conversationId, cursor, REPLAY_PAGE_SIZE);
      page.stream().filter(this::publiclyVisible).forEach(replay::add);
      var nextCursor = page.stream().mapToLong(Message::id).max().orElse(cursor);
      if (page.size() < REPLAY_PAGE_SIZE || nextCursor <= cursor) {
        return List.copyOf(replay);
      }
      cursor = nextCursor;
    }
  }

  private Duration formAge(Map<String, Object> body) {
    var value = body == null ? null : body.get("formStartedAt");
    if (value == null) {
      return null;
    }
    try {
      var started = value instanceof Number number
          ? Instant.ofEpochMilli(number.longValue())
          : parseInstant(value.toString());
      return Duration.between(started, Instant.now());
    } catch (RuntimeException error) {
      return null;
    }
  }

  private Instant parseInstant(String value) {
    try {
      return Instant.parse(value.trim());
    } catch (DateTimeParseException error) {
      return Instant.ofEpochMilli(Long.parseLong(value.trim()));
    }
  }

  private long eventId(String value) {
    try {
      return Math.max(0L, Long.parseLong(text(value)));
    } catch (NumberFormatException error) {
      return 0L;
    }
  }

  private long longValue(Map<String, Object> body, String key) {
    var value = body == null ? null : body.get(key);
    try {
      return Math.max(0L, value instanceof Number number
          ? number.longValue()
          : Long.parseLong(text(value == null ? null : value.toString())));
    } catch (NumberFormatException error) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message ID.");
    }
  }

  private String normalizedOrigin(String value) {
    try {
      var uri = URI.create(text(value)).normalize();
      var scheme = uri.getScheme();
      if (scheme == null || !List.of("http", "https").contains(scheme) || uri.getHost() == null
          || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
          || (uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath()))) {
        return "";
      }
      return scheme + "://" + uri.getAuthority();
    } catch (IllegalArgumentException error) {
      return "";
    }
  }

  private String refererOrigin(String value) {
    try {
      var uri = URI.create(text(value));
      return uri.getScheme() == null || uri.getAuthority() == null
          ? ""
          : uri.getScheme() + "://" + uri.getAuthority();
    } catch (IllegalArgumentException error) {
      return "";
    }
  }

  private String cookie(HttpServletRequest request, String name) {
    var cookies = request.getCookies();
    if (cookies == null) {
      return "";
    }
    for (Cookie cookie : cookies) {
      if (name.equals(cookie.getName())) {
        return text(cookie.getValue());
      }
    }
    return "";
  }

  private String value(Map<String, Object> body, String key) {
    var raw = body == null ? null : body.get(key);
    return raw == null ? "" : raw.toString().trim();
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }

  private record Identity(Visitor visitor, String rawToken, boolean newlyIssued) {}
}
