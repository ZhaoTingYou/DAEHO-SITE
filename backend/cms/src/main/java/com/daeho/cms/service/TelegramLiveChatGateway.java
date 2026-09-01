package com.daeho.cms.service;

import java.util.Map;

public interface TelegramLiveChatGateway {
  BotIdentity getMe(String botToken);

  void verifyForumAccess(String botToken, String targetChatId, long botUserId);

  long createForumTopic(String botToken, String targetChatId, String topicName);

  void setWebhook(String botToken, String webhookUrl, String secretToken);

  long sendMessage(
      String botToken,
      String targetChatId,
      String messageThreadId,
      String text,
      Map<String, Object> replyMarkup,
      Long replyToMessageId
  );

  long copyMessage(
      String botToken,
      String targetChatId,
      String sourceChatId,
      long sourceMessageId,
      String messageThreadId,
      Long replyToMessageId
  );

  void answerCallback(String botToken, String callbackQueryId);

  void closeForumTopic(String botToken, String targetChatId, long messageThreadId);

  record BotIdentity(long id, String username, boolean canReadAllGroupMessages) {
    BotIdentity(String username) {
      this(1L, username, true);
    }
  }
}
