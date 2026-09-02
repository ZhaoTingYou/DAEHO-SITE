package com.daeho.cms.service;

import com.daeho.cms.repository.WebLiveChatRepository;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class WebLiveChatCleanupWorker {
  static final int BATCH_SIZE = 100;
  private static final Duration STALE_AGE = Duration.ofDays(30);
  private static final Duration VISITOR_DELIVERY_LEASE = Duration.ofMinutes(2);
  private static final String CLOSED_MESSAGE = "상담이 종료되었습니다.";

  private final WebLiveChatRepository repository;
  private final WebLiveChatEventBroker broker;
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatGateway gateway;
  private final Clock clock;

  @Autowired
  public WebLiveChatCleanupWorker(
      WebLiveChatRepository repository,
      WebLiveChatEventBroker broker,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatGateway gateway
  ) {
    this(repository, broker, credentials, gateway, Clock.systemUTC());
  }

  WebLiveChatCleanupWorker(
      WebLiveChatRepository repository,
      WebLiveChatEventBroker broker,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatGateway gateway,
      Clock clock
  ) {
    this.repository = repository;
    this.broker = broker;
    this.credentials = credentials;
    this.gateway = gateway;
    this.clock = clock;
  }

  @Scheduled(fixedDelay = 3_600_000L, initialDelay = 3_600_000L)
  public void cleanup() {
    var closed = repository.expireStale(clock.instant().minus(STALE_AGE), BATCH_SIZE, CLOSED_MESSAGE);
    for (var result : closed) {
      broker.publish(result.conversation().id(), result.event());
      closeTopicBestEffort(result.conversation());
    }
    repository.reconcileStaleVisitorDeliveries(
        clock.instant().minus(VISITOR_DELIVERY_LEASE), BATCH_SIZE
    );
    repository.deleteExpiredRateBuckets(BATCH_SIZE);
    repository.deleteExpiredAnonymousConversations(BATCH_SIZE);
    repository.deleteExpiredOrphanVisitors(BATCH_SIZE);
  }

  private void closeTopicBestEffort(WebLiveChatRepository.Conversation conversation) {
    if (conversation.topicThreadId() <= 0) {
      return;
    }
    try {
      var current = credentials.current();
      if (current == null || !current.ready()
          || current.settings().configurationGeneration() != conversation.configurationGeneration()
          || !current.settings().targetChatId().equals(conversation.targetChatId())) {
        repository.markTopicCloseNeedsAttention(
            conversation.id(), "topic_close_configuration_unavailable"
        );
        return;
      }
      gateway.closeForumTopic(
          current.botToken(), conversation.targetChatId(), conversation.topicThreadId()
      );
      repository.completeTopicClose(conversation.id());
    } catch (TelegramLiveChatException error) {
      repository.markTopicCloseNeedsAttention(
          conversation.id(), error.deliveryUncertain() ? "topic_close_uncertain" : "topic_close_failed"
      );
    } catch (RuntimeException ignored) {
      repository.markTopicCloseNeedsAttention(conversation.id(), "topic_close_unavailable");
    }
  }
}
