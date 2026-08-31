package com.daeho.cms.service;

import com.daeho.cms.repository.NotificationRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TelegramCredentialService {
  private final NotificationRepository repository;
  private final TelegramCredentialCipher cipher;

  public TelegramCredentialService(
      NotificationRepository repository,
      TelegramCredentialCipher cipher
  ) {
    this.repository = repository;
    this.cipher = cipher;
  }

  public PreparedUpdate prepareUpdate(Map<String, Object> input) {
    var current = repository.getTelegramCredentials();
    var tokenCiphertext = text(current.get("telegramBotTokenCiphertext"));
    var currentToken = cipher.decrypt(tokenCiphertext).orElse("");
    var tokenInput = text(input.get("telegramBotToken"));
    var clearToken = booleanValue(input.get("clearTelegramBotToken"));
    if (clearToken) {
      tokenCiphertext = "";
    } else if (!tokenInput.isBlank() && !tokenInput.equals(currentToken)) {
      tokenCiphertext = cipher.encrypt(tokenInput);
    }
    var chatId = text(input.get("telegramChatId"));
    var payload = new LinkedHashMap<String, Object>(input);
    payload.remove("telegramBotToken");
    payload.remove("clearTelegramBotToken");
    payload.put("telegramBotTokenCiphertext", tokenCiphertext);
    payload.put("telegramChatId", chatId);
    var candidate = new Credentials(cipher.decrypt(tokenCiphertext).orElse(""), chatId);
    var configured = candidate.configured();
    var verified = configured && repository.telegramTestVerified(fingerprint(candidate));
    return new PreparedUpdate(Map.copyOf(payload), configured, verified);
  }

  public Credentials current() {
    var stored = repository.getTelegramCredentials();
    var chatId = text(stored.get("telegramChatId"));
    var token = cipher.decrypt(text(stored.get("telegramBotTokenCiphertext"))).orElse("");
    return new Credentials(token, chatId);
  }

  public boolean encryptionConfigured() {
    return cipher.configured();
  }

  public boolean verified() {
    var credentials = current();
    return credentials.configured() && repository.telegramTestVerified(fingerprint(credentials));
  }

  public void markVerified(Credentials credentials) {
    if (credentials.configured()) {
      repository.markTelegramTestVerified(fingerprint(credentials));
    }
  }

  public boolean jobVerified(Map<String, Object> job) {
    var credentials = current();
    if (!credentials.configured()) {
      return false;
    }
    var fingerprint = fingerprint(credentials);
    return repository.telegramTestVerified(fingerprint)
        && repository.telegramJobCredentialsMatch(
            text(job.get("id")),
            fingerprint,
            text(credentials.chatId())
        );
  }

  String fingerprint(Credentials credentials) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      var value = text(credentials.botToken()) + "\u0000" + text(credentials.chatId());
      return Base64.getUrlEncoder().withoutPadding().encodeToString(
          digest.digest(value.getBytes(StandardCharsets.UTF_8))
      );
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("SHA-256 is unavailable.", error);
    }
  }

  private boolean booleanValue(Object value) {
    return value instanceof Boolean bool && bool;
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record PreparedUpdate(Map<String, Object> payload, boolean configured, boolean verified) {}

  public record Credentials(String botToken, String chatId) {
    public boolean configured() {
      return botToken != null && !botToken.isBlank() && chatId != null && !chatId.isBlank();
    }
  }
}
