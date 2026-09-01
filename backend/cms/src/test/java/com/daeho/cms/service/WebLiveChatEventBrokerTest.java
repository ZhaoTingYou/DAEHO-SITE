package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.repository.WebLiveChatRepository.Message;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class WebLiveChatEventBrokerTest {
  @Test
  void replayAndLivePublishMayOverlapWithoutLosingAnEvent() {
    var scheduler = mock(ScheduledExecutorService.class);
    when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
        .thenReturn(mock(ScheduledFuture.class));
    var emitter = new RecordingEmitter();
    var broker = new WebLiveChatEventBroker(scheduler, () -> emitter);

    var opened = broker.open("conversation-1", () -> {
      broker.publish("conversation-1", message(42L, "team"));
      broker.publish("conversation-new", message(1_001L, "team"));
      return List.of(message(41L, "team"));
    });

    assertEquals(emitter, opened);
    assertEquals(List.of("41", "42"), emitter.ids);
  }

  @Test
  void durableMessagesHaveIdsHeartbeatDoesNotAndTimeoutRemovesTheEmitter() {
    var scheduler = mock(ScheduledExecutorService.class);
    var future = mock(ScheduledFuture.class);
    var heartbeat = ArgumentCaptor.forClass(Runnable.class);
    when(scheduler.scheduleAtFixedRate(
        heartbeat.capture(), anyLong(), anyLong(), any(TimeUnit.class)
    )).thenReturn(future);
    var emitter = new RecordingEmitter();
    var broker = new WebLiveChatEventBroker(scheduler, () -> emitter);

    broker.open("conversation-1", () -> List.of(
        message(41L, "team"), message(42L, "system")
    ));
    heartbeat.getValue().run();

    assertEquals(List.of("41", "42"), emitter.ids);
    assertEquals(List.of("message", "state", "heartbeat"), emitter.names);
    verify(scheduler).scheduleAtFixedRate(
        any(Runnable.class), org.mockito.Mockito.eq(25L), org.mockito.Mockito.eq(25L),
        org.mockito.Mockito.eq(TimeUnit.SECONDS)
    );

    emitter.timeout.run();
    broker.publish("conversation-1", message(43L, "team"));
    assertEquals(List.of("41", "42"), emitter.ids);
    verify(future).cancel(false);
  }

  @Test
  void visitorRowsCanNeverBecomePublicSseEvents() {
    var scheduler = mock(ScheduledExecutorService.class);
    when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
        .thenReturn(mock(ScheduledFuture.class));
    var emitter = new RecordingEmitter();
    var broker = new WebLiveChatEventBroker(scheduler, () -> emitter);

    broker.open("conversation-1", () -> List.of(message(41L, "visitor")));
    broker.publish("conversation-1", message(42L, "visitor"));

    assertEquals(List.of(), emitter.ids);
    assertEquals(List.of(), emitter.names);
  }

  @Test
  void timeoutErrorAndCompletionAllRemoveTheirEmitterAndCancelHeartbeat() {
    var scheduler = mock(ScheduledExecutorService.class);
    var future = mock(ScheduledFuture.class);
    when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
        .thenReturn(future);
    var emitters = List.of(new RecordingEmitter(), new RecordingEmitter(), new RecordingEmitter());
    var next = new AtomicInteger();
    var broker = new WebLiveChatEventBroker(scheduler, () -> emitters.get(next.getAndIncrement()));
    emitters.forEach(ignored -> broker.open("conversation-1", List::of));

    emitters.get(0).timeout.run();
    emitters.get(1).error.accept(new IOException("closed"));
    emitters.get(2).completion.run();
    broker.publish("conversation-1", message(44L, "team"));

    emitters.forEach(emitter -> assertEquals(List.of(), emitter.ids));
    verify(future, org.mockito.Mockito.times(3)).cancel(false);
  }

  private Message message(long id, String direction) {
    return new Message(
        id, "conversation-1", direction, "reply-" + id, "delivered", "", 0L,
        Instant.parse("2026-09-01T08:00:00Z")
    );
  }

  private static final class RecordingEmitter extends SseEmitter {
    private final List<String> ids = new ArrayList<>();
    private final List<String> names = new ArrayList<>();
    private Runnable timeout = () -> {};
    private Runnable completion = () -> {};
    private Consumer<Throwable> error = ignored -> {};

    RecordingEmitter() {
      super(70_000L);
    }

    @Override
    public synchronized void send(SseEventBuilder builder) throws IOException {
      var text = builder.build().stream()
          .map(part -> part.getData().toString())
          .reduce("", String::concat);
      var marker = "id:";
      var start = text.indexOf(marker);
      if (start >= 0) {
        var end = text.indexOf('\n', start);
        ids.add(text.substring(start + marker.length(), end < 0 ? text.length() : end).trim());
      }
      var nameMarker = "event:";
      var nameStart = text.indexOf(nameMarker);
      if (nameStart >= 0) {
        var end = text.indexOf('\n', nameStart);
        names.add(text.substring(
            nameStart + nameMarker.length(), end < 0 ? text.length() : end
        ).trim());
      }
    }

    @Override
    public synchronized void onTimeout(Runnable callback) {
      timeout = callback;
    }

    @Override
    public synchronized void onCompletion(Runnable callback) {
      completion = callback;
    }

    @Override
    public synchronized void onError(Consumer<Throwable> callback) {
      error = callback;
    }
  }
}
