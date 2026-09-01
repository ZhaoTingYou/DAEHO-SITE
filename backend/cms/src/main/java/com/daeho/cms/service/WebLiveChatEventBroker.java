package com.daeho.cms.service;

import com.daeho.cms.repository.WebLiveChatRepository.Message;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class WebLiveChatEventBroker {
  static final long EMITTER_TIMEOUT_MILLIS = 70_000L;
  static final long HEARTBEAT_SECONDS = 25L;

  private final Map<String, Set<Connection>> connections = new ConcurrentHashMap<>();
  private final ScheduledExecutorService scheduler;
  private final Supplier<SseEmitter> emitterFactory;
  private final boolean ownsScheduler;

  public WebLiveChatEventBroker() {
    this(
        Executors.newSingleThreadScheduledExecutor(task -> {
          var thread = new Thread(task, "web-live-chat-heartbeat");
          thread.setDaemon(true);
          return thread;
        }),
        () -> new SseEmitter(EMITTER_TIMEOUT_MILLIS),
        true
    );
  }

  WebLiveChatEventBroker(
      ScheduledExecutorService scheduler,
      Supplier<SseEmitter> emitterFactory
  ) {
    this(scheduler, emitterFactory, false);
  }

  private WebLiveChatEventBroker(
      ScheduledExecutorService scheduler,
      Supplier<SseEmitter> emitterFactory,
      boolean ownsScheduler
  ) {
    this.scheduler = scheduler;
    this.emitterFactory = emitterFactory;
    this.ownsScheduler = ownsScheduler;
  }

  /** Registers the live emitter before invoking the replay loader. */
  public SseEmitter open(String conversationId, Supplier<List<Message>> replayLoader) {
    var emitter = emitterFactory.get();
    var connection = new Connection(conversationId, emitter);
    connections.computeIfAbsent(conversationId, ignored -> ConcurrentHashMap.newKeySet())
        .add(connection);
    emitter.onCompletion(() -> remove(connection));
    emitter.onTimeout(() -> {
      remove(connection);
      emitter.complete();
    });
    emitter.onError(error -> {
      remove(connection);
      emitter.complete();
    });
    connection.heartbeat = scheduler.scheduleAtFixedRate(
        () -> heartbeat(connection), HEARTBEAT_SECONDS, HEARTBEAT_SECONDS, TimeUnit.SECONDS
    );

    try {
      var replay = replayLoader.get();
      connection.finishReplay(replay == null ? List.of() : replay);
    } catch (RuntimeException error) {
      remove(connection);
      emitter.completeWithError(error);
      throw error;
    }
    return emitter;
  }

  public void publish(String conversationId, Message event) {
    if (conversationId == null || !publicEvent(event)) {
      return;
    }
    var subscribers = connections.get(conversationId);
    if (subscribers == null) {
      return;
    }
    for (var connection : List.copyOf(subscribers)) {
      connection.publish(event);
    }
  }

  private void heartbeat(Connection connection) {
    try {
      connection.sendHeartbeat();
    } catch (IOException | IllegalStateException error) {
      remove(connection);
      connection.emitter.complete();
    }
  }

  private void remove(Connection connection) {
    connection.markClosed();
    var subscribers = connections.get(connection.conversationId);
    if (subscribers != null) {
      subscribers.remove(connection);
      if (subscribers.isEmpty()) {
        connections.remove(connection.conversationId, subscribers);
      }
    }
    var heartbeat = connection.heartbeat;
    if (heartbeat != null) {
      heartbeat.cancel(false);
    }
  }

  @PreDestroy
  void shutdown() {
    for (var subscribers : connections.values()) {
      for (var connection : subscribers) {
        connection.close();
      }
    }
    connections.clear();
    if (ownsScheduler) {
      scheduler.shutdownNow();
    }
  }

  private final class Connection {
    private final String conversationId;
    private final SseEmitter emitter;
    private final List<Message> pending = new ArrayList<>();
    private boolean replaying = true;
    private boolean closed;
    private ScheduledFuture<?> heartbeat;

    private Connection(String conversationId, SseEmitter emitter) {
      this.conversationId = conversationId;
      this.emitter = emitter;
    }

    synchronized void publish(Message event) {
      if (closed) {
        return;
      }
      if (replaying) {
        pending.add(event);
        return;
      }
      sendOrClose(event);
    }

    synchronized void finishReplay(List<Message> replay) {
      if (closed) {
        return;
      }
      var ordered = new ArrayList<>(replay);
      ordered.removeIf(event -> !publicEvent(event));
      ordered.sort(Comparator.comparingLong(Message::id));
      ordered.forEach(this::sendOrClose);
      replaying = false;
      pending.forEach(this::sendOrClose);
      pending.clear();
    }

    synchronized void sendHeartbeat() throws IOException {
      if (!closed) {
        emitter.send(SseEmitter.event()
            .name("heartbeat")
            .data(Map.of("at", Instant.now().toString())));
      }
    }

    private void sendOrClose(Message event) {
      if (closed) {
        return;
      }
      try {
        emitter.send(SseEmitter.event()
            .id(Long.toString(event.id()))
            .name("system".equals(event.direction()) ? "state" : "message")
            .data(payload(event)));
      } catch (IOException | IllegalStateException error) {
        close();
      }
    }

    private Map<String, Object> payload(Message event) {
      if ("system".equals(event.direction())) {
        return Map.of(
            "id", event.id(),
            "body", event.body(),
            "createdAt", event.createdAt().toString(),
            "state", "closed"
        );
      }
      return Map.of(
          "id", event.id(),
          "body", event.body(),
          "createdAt", event.createdAt().toString()
      );
    }

    synchronized boolean markClosed() {
      var changed = !closed;
      closed = true;
      return changed;
    }

    synchronized void close() {
      if (markClosed()) {
        emitter.complete();
        remove(this);
      }
    }
  }

  private boolean publicEvent(Message event) {
    return event != null
        && ("team".equals(event.direction()) || "system".equals(event.direction()));
  }
}
