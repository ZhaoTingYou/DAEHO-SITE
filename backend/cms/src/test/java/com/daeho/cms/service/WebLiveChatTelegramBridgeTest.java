package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.TelegramLiveChatProperties;
import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.CloseResult;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WebLiveChatTelegramBridgeTest {
  private static final Instant NOW = Instant.parse("2026-09-01T00:00:00Z");

  private WebLiveChatRepository repository;
  private WebLiveChatEventBroker broker;
  private TelegramLiveChatGateway gateway;
  private WebLiveChatTelegramBridge bridge;

  @BeforeEach
  void setUp() {
    repository = mock(WebLiveChatRepository.class);
    broker = mock(WebLiveChatEventBroker.class);
    gateway = mock(TelegramLiveChatGateway.class);
    bridge = new WebLiveChatTelegramBridge(
        repository,
        broker,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works")
    );
  }

  @Test
  void normalTopicTextBecomesOneTeamMessageAndOneBrowserEvent() {
    var persisted = teamMessage(51L, 900L, "확인했습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.recordTeamMessage("conversation-1", 900L, "확인했습니다."))
        .thenReturn(persisted);

    var result = bridge.handleTeamMessage(
        teamUpdate("확인했습니다.", 900L), credentials()
    );

    assertEquals("web_team_reply_recorded", result.orElseThrow().status());
    var order = inOrder(repository, broker);
    order.verify(repository).recordTeamMessage("conversation-1", 900L, "확인했습니다.");
    order.verify(broker).publish("conversation-1", persisted);
  }

  @Test
  void replayedTelegramMessageDoesNotCreateASecondBrowserEvent() {
    var persisted = teamMessage(51L, 900L, "확인했습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.recordTeamMessage("conversation-1", 900L, "확인했습니다."))
        .thenReturn(persisted, null);

    bridge.handleTeamMessage(teamUpdate("확인했습니다.", 900L), credentials());
    var replay = bridge.handleTeamMessage(
        teamUpdate("확인했습니다.", 900L), credentials()
    );

    assertEquals("web_team_reply_duplicate", replay.orElseThrow().status());
    verify(repository, times(2)).recordTeamMessage("conversation-1", 900L, "확인했습니다.");
    verify(broker).publish("conversation-1", persisted);
  }

  @Test
  void noteStaysInTelegramAndNeverCreatesACustomerMessage() {
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());

    var result = bridge.handleTeamMessage(
        teamUpdate("/note 견적 확인 필요", 901L), credentials()
    );

    assertEquals("web_internal_note_ignored", result.orElseThrow().status());
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
    verify(broker, never()).publish(anyString(), any());
  }

  @Test
  void noteAddressedToThisBotWithArgumentsStaysInternal() {
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());

    var result = bridge.handleTeamMessage(
        teamUpdate("/note@DAEHO_SERVICE_BOT 견적 확인 필요", 908L), credentials()
    );

    assertEquals("web_internal_note_ignored", result.orElseThrow().status());
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
  }

  @Test
  void closeCommandPublishesTheAtomicDurableCloseAndClosesTheTopic() {
    var event = systemMessage(52L, "상담이 종료되었습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new CloseResult(closed(), event));

    var result = bridge.handleTeamMessage(teamUpdate("/close", 902L), credentials());

    assertEquals("web_conversation_closed", result.orElseThrow().status());
    verify(broker).publish("conversation-1", event);
    verify(gateway).closeForumTopic("live-token", "-1003425727647", 701L);
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
  }

  @Test
  void closeCommandAddressedToThisBotIsHandledCaseInsensitively() {
    var event = systemMessage(52L, "상담이 종료되었습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new CloseResult(closed(), event));

    var result = bridge.handleTeamMessage(
        teamUpdate("/close@DAEHO_SERVICE_BOT", 903L), credentials()
    );

    assertEquals("web_conversation_closed", result.orElseThrow().status());
    verify(broker).publish("conversation-1", event);
  }

  @Test
  void closeCommandAllowsArgumentsAndReplayPublishesOnlyOnce() {
    var event = systemMessage(52L, "상담이 종료되었습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new CloseResult(closed(), event), null);

    var first = bridge.handleTeamMessage(
        teamUpdate("/close@daeho_service_bot resolved", 909L), credentials()
    );
    var replay = bridge.handleTeamMessage(
        teamUpdate("/close@daeho_service_bot resolved", 909L), credentials()
    );

    assertEquals("web_conversation_closed", first.orElseThrow().status());
    assertEquals("web_conversation_already_closed", replay.orElseThrow().status());
    verify(broker).publish("conversation-1", event);
    verify(gateway).closeForumTopic("live-token", "-1003425727647", 701L);
  }

  @Test
  void closeRemainsSuccessfulWhenTelegramTopicCloseFails() {
    var event = systemMessage(52L, "상담이 종료되었습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new CloseResult(closed(), event));
    doThrow(new TelegramLiveChatException("Topic close failed"))
        .when(gateway).closeForumTopic("live-token", "-1003425727647", 701L);

    var result = bridge.handleTeamMessage(teamUpdate("/close", 910L), credentials());

    assertEquals("web_conversation_closed", result.orElseThrow().status());
    verify(broker).publish("conversation-1", event);
  }

  @Test
  void nativeTopicClosePublishesOnceWithoutClosingTheTopicAgain() {
    var event = systemMessage(52L, "상담이 종료되었습니다.");
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.close("conversation-1", "상담이 종료되었습니다."))
        .thenReturn(new CloseResult(closed(), event));

    var result = bridge.handleTeamMessage(nativeCloseUpdate(904L), credentials());

    assertEquals("web_conversation_closed", result.orElseThrow().status());
    verify(broker).publish("conversation-1", event);
    verify(gateway, never()).closeForumTopic(anyString(), anyString(), anyLong());
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
  }

  @Test
  void newEnglishPrivateBotUserReceivesOneWebsiteLink() {
    var result = bridge.handlePrivateMessage(
        Map.of(
            "message_id", 905L,
            "chat", Map.of("id", 12345L, "type", "private"),
            "from", Map.of("id", 12345L, "is_bot", false),
            "text", "/start site_en"
        ),
        credentials()
    );

    assertEquals("web_private_redirect_sent", result.orElseThrow().status());
    verify(gateway).sendMessage(
        "live-token",
        "12345",
        "",
        "Live consultation is available on the DAEHO website:\nhttps://daeho.works",
        Map.of("remove_keyboard", true),
        null
    );
  }

  @Test
  void mediaCaptionInMappedTopicIsIgnored() {
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    var media = Map.<String, Object>of(
        "message_id", 906L,
        "message_thread_id", 701L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 999L, "is_bot", false),
        "photo", java.util.List.of(Map.of("file_id", "internal-file")),
        "caption", "고객에게 보이지 않음"
    );

    var result = bridge.handleTeamMessage(media, credentials());

    assertEquals("web_message_ignored", result.orElseThrow().status());
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
    verify(broker, never()).publish(anyString(), any());
  }

  @Test
  void failedTeamMessagePersistenceCannotCreateABrowserEvent() {
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    when(repository.recordTeamMessage("conversation-1", 907L, "저장 실패"))
        .thenThrow(new IllegalStateException("database unavailable"));

    assertThrows(
        IllegalStateException.class,
        () -> bridge.handleTeamMessage(teamUpdate("저장 실패", 907L), credentials())
    );

    verify(broker, never()).publish(anyString(), any());
  }

  @Test
  void generalTopicAndUnmappedTopicFallThroughWithoutPersistence() {
    var general = Map.<String, Object>of(
        "message_id", 911L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 999L, "is_bot", false),
        "text", "General"
    );
    var unmapped = Map.<String, Object>of(
        "message_id", 912L,
        "message_thread_id", 702L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 999L, "is_bot", false),
        "text", "Unmapped"
    );

    assertTrue(bridge.handleTeamMessage(general, credentials()).isEmpty());
    assertTrue(bridge.handleTeamMessage(unmapped, credentials()).isEmpty());
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
  }

  @Test
  void mappedBlankInvalidAndIrrelevantServiceShapesAreIgnored() {
    when(repository.conversationForTopic(3L, "-1003425727647", 701L))
        .thenReturn(active());
    var blank = teamUpdate("   ", 913L);
    var invalidId = teamUpdate("Missing valid ID", 0L);
    var irrelevantService = Map.<String, Object>of(
        "message_id", 914L,
        "message_thread_id", 701L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 999L, "is_bot", false),
        "forum_topic_reopened", Map.of()
    );

    assertEquals(
        "web_message_ignored",
        bridge.handleTeamMessage(blank, credentials()).orElseThrow().status()
    );
    assertEquals(
        "web_message_ignored",
        bridge.handleTeamMessage(invalidId, credentials()).orElseThrow().status()
    );
    assertEquals(
        "web_message_ignored",
        bridge.handleTeamMessage(irrelevantService, credentials()).orElseThrow().status()
    );
    verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
  }

  private Map<String, Object> teamUpdate(String text, long messageId) {
    return Map.of(
        "message_id", messageId,
        "message_thread_id", 701L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 999L, "is_bot", false),
        "text", text
    );
  }

  private Map<String, Object> nativeCloseUpdate(long messageId) {
    return Map.of(
        "message_id", messageId,
        "message_thread_id", 701L,
        "chat", Map.of("id", -1003425727647L, "type", "supergroup"),
        "from", Map.of("id", 777L, "is_bot", false),
        "forum_topic_closed", Map.of()
    );
  }

  private TelegramLiveChatCredentialService.Credentials credentials() {
    return new TelegramLiveChatCredentialService.Credentials(
        new TelegramLiveChatRepository.Settings(
            true, "ciphertext", "Daeho_Service_bot", "-1003425727647", "", "실시간 상담",
            "secret-hash", "idle", "", 3L,
            "2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"
        ),
        "live-token"
    );
  }

  private Conversation active() {
    return new Conversation(
        "conversation-1", "visitor-1", 3L, "-1003425727647", "inquiry-1", "ko",
        "active", "홍길동", "01012345678", "견적 문의", "2026-09", NOW, "", "", 0L,
        "", 701L, 700L, 0L, NOW, NOW, NOW, null
    );
  }

  private Conversation closed() {
    return new Conversation(
        "conversation-1", "visitor-1", 3L, "-1003425727647", "inquiry-1", "ko",
        "closed", "홍길동", "01012345678", "견적 문의", "2026-09", NOW, "", "", 0L,
        "", 701L, 700L, 0L, NOW, NOW, NOW, NOW
    );
  }

  private Message teamMessage(long id, long telegramMessageId, String body) {
    return new Message(
        id, "conversation-1", "team", body, "delivered", "", telegramMessageId, NOW
    );
  }

  private Message systemMessage(long id, String body) {
    return new Message(id, "conversation-1", "system", body, "delivered", "", 0L, NOW);
  }
}
