package com.daeho.cms.service;

import com.daeho.cms.repository.NotificationRepository;
import com.daeho.cms.repository.TelegramLiveChatRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class TelegramBotSeparationGuard {
  private final NotificationRepository notifications;
  private final TelegramLiveChatRepository liveChat;
  private final TelegramCredentialCipher cipher;

  public TelegramBotSeparationGuard(
      NotificationRepository notifications,
      TelegramLiveChatRepository liveChat,
      TelegramCredentialCipher cipher
  ) {
    this.notifications = notifications;
    this.liveChat = liveChat;
    this.cipher = cipher;
  }

  public void requireSeparateLiveChatToken(String candidate) {
    lockConfiguration();
    var stored = notifications.getTelegramCredentials();
    var notificationToken = decrypt(stored.get("telegramBotTokenCiphertext"));
    requireDifferent(candidate, notificationToken);
  }

  public void requireSeparateNotificationToken(String candidate) {
    lockConfiguration();
    var liveToken = decrypt(liveChat.settings().botTokenCiphertext());
    requireDifferent(candidate, liveToken);
  }

  public void lockConfiguration() {
    notifications.lockNotificationDispatch();
  }

  private String decrypt(Object ciphertext) {
    return cipher.decrypt(text(ciphertext)).orElse("");
  }

  private void requireDifferent(String first, String second) {
    if (text(first).isBlank() || text(second).isBlank()) {
      return;
    }
    if (MessageDigest.isEqual(
        text(first).getBytes(StandardCharsets.UTF_8),
        text(second).getBytes(StandardCharsets.UTF_8)
    )) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "The live-chat Bot and inquiry notification Bot must be different."
      );
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
