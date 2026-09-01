package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.CloseResult;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WebLiveChatCleanupWorkerTest {
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  @Test
  void cleanupPersistsAndPublishesDurableClosedEventsInABoundedBatch() {
    var repository = mock(WebLiveChatRepository.class);
    var broker = mock(WebLiveChatEventBroker.class);
    var credentials = mock(TelegramLiveChatCredentialService.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var closed = closedConversation();
    var event = new Message(
        52L, closed.id(), "system", "상담이 종료되었습니다.", "delivered", "", 0L, NOW
    );
    when(repository.expireStale(any(Instant.class), eq(100), eq("상담이 종료되었습니다.")))
        .thenReturn(List.of(new CloseResult(closed, event)));
    when(credentials.current()).thenReturn(credentials());
    var worker = new WebLiveChatCleanupWorker(
        repository, broker, credentials, gateway, Clock.fixed(NOW, ZoneOffset.UTC)
    );

    worker.cleanup();

    var cutoff = ArgumentCaptor.forClass(Instant.class);
    verify(repository).expireStale(cutoff.capture(), eq(100), eq("상담이 종료되었습니다."));
    assertEquals(NOW.minusSeconds(30L * 24 * 60 * 60), cutoff.getValue());
    verify(broker).publish(closed.id(), event);
    verify(gateway).closeForumTopic("token", closed.targetChatId(), closed.topicThreadId());
  }

  @Test
  void topicCloseFailureIsBestEffortAfterTheDurableStateWasPublished() {
    var repository = mock(WebLiveChatRepository.class);
    var broker = mock(WebLiveChatEventBroker.class);
    var credentials = mock(TelegramLiveChatCredentialService.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var closed = closedConversation();
    var event = new Message(
        52L, closed.id(), "system", "상담이 종료되었습니다.", "delivered", "", 0L, NOW
    );
    when(repository.expireStale(any(Instant.class), eq(100), any(String.class)))
        .thenReturn(List.of(new CloseResult(closed, event)));
    when(credentials.current()).thenReturn(credentials());
    doThrow(new TelegramLiveChatException("Topic already closed", false))
        .when(gateway).closeForumTopic("token", closed.targetChatId(), closed.topicThreadId());
    var worker = new WebLiveChatCleanupWorker(
        repository, broker, credentials, gateway, Clock.fixed(NOW, ZoneOffset.UTC)
    );

    assertDoesNotThrow(worker::cleanup);

    verify(broker).publish(closed.id(), event);
  }

  private TelegramLiveChatCredentialService.Credentials credentials() {
    var settings = new TelegramLiveChatRepository.Settings(
        true, "ciphertext", "DAEHO_LIVE_BOT", "-1003425727647", "", "실시간 상담",
        "secret-hash", "idle", "", 3L, NOW.toString(), NOW.toString()
    );
    return new TelegramLiveChatCredentialService.Credentials(settings, "token");
  }

  private Conversation closedConversation() {
    return new Conversation(
        "conversation-1", "visitor-1", 3L, "-1003425727647", "inquiry-1", "ko",
        "closed", "홍길동", "01012345678", "견적 문의", "2026-09", NOW, "", "",
        0L, "", 701L, 702L, 0L, NOW, NOW, NOW, NOW
    );
  }
}
