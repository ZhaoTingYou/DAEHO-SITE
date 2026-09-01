package com.daeho.cms.service;

import com.daeho.cms.config.TelegramLiveChatProperties;
import com.daeho.cms.repository.TelegramLiveChatRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TelegramLiveChatCredentialService {
  public static final String LIVE_TOPIC_NAME = "실시간 상담";
  private final TelegramLiveChatRepository repository;
  private final TelegramCredentialCipher cipher;
  private final TelegramLiveChatGateway gateway;
  private final TelegramLiveChatProperties properties;
  private final TelegramBotSeparationGuard separationGuard;
  private final SecureRandom random = new SecureRandom();

  public TelegramLiveChatCredentialService(
      TelegramLiveChatRepository repository,
      TelegramCredentialCipher cipher,
      TelegramLiveChatGateway gateway,
      TelegramLiveChatProperties properties,
      TelegramBotSeparationGuard separationGuard
  ) {
    this.repository = repository;
    this.cipher = cipher;
    this.gateway = gateway;
    this.properties = properties;
    this.separationGuard = separationGuard;
  }

  public synchronized TelegramLiveChatRepository.Settings connect() {
    var attemptId = UUID.randomUUID().toString();
    var settings = repository.beginConnect(attemptId);
    if (settings == null) {
      throw conflict("Telegram live-chat setup already needs review or is in progress.");
    }
    var botToken = decrypt(settings.botTokenCiphertext());
    try {
      if (botToken.isBlank()) {
        throw conflict("Enter and save the separate live-chat Bot token first.");
      }
      if (settings.targetChatId().isBlank()) {
        throw conflict("Enter the Telegram group Chat ID first.");
      }
      if (properties.normalizedPublicSiteUrl().isBlank()) {
        throw conflict("The public site URL is not configured on the server.");
      }
      separationGuard.requireSeparateLiveChatToken(botToken);
      var identity = gateway.getMe(botToken);
      if (!identity.canReadAllGroupMessages()) {
        throw conflict(
            "Disable Group Privacy for the live-chat Bot with BotFather /setprivacy first."
        );
      }
      gateway.verifyForumAccess(botToken, settings.targetChatId(), identity.id());
      var secret = randomSecret();
      try {
        gateway.setWebhook(
            botToken,
            properties.normalizedPublicSiteUrl() + "/api/telegram/live-chat/webhook",
            secret
        );
      } catch (TelegramLiveChatException error) {
        repository.finishConnectFailure(
            error.deliveryUncertain() ? "webhook_setup_uncertain" : "",
            attemptId
        );
        throw error;
      }
      return repository.markConnected(
          identity.username(),
          "",
          sha256(secret),
          settings.botTokenCiphertext(),
          settings.targetChatId(),
          attemptId
      );
    } catch (TelegramLiveChatException | ResponseStatusException error) {
      repository.finishConnectFailure("", attemptId);
      throw error;
    } catch (RuntimeException error) {
      repository.finishConnectFailure("connection_setup_uncertain", attemptId);
      throw error;
    }
  }

  public synchronized TelegramLiveChatRepository.Settings resetConnectSetup() {
    var settings = repository.resetConnectSetup();
    if (settings == null) {
      throw conflict("Telegram live-chat setup is still running. Try again in two minutes.");
    }
    return settings;
  }

  @Transactional
  public synchronized TelegramLiveChatRepository.Settings update(Map<String, Object> input) {
    separationGuard.lockConfiguration();
    var current = repository.settingsForUpdate();
    var suppliedToken = text(input.get("botToken"));
    var clearToken = booleanValue(input.get("clearBotToken"));
    var currentToken = decrypt(current.botTokenCiphertext());
    var tokenChanged = clearToken
        || (!suppliedToken.isBlank() && !secretsEqual(suppliedToken, currentToken));
    if (!suppliedToken.isBlank() && !cipher.configured()) {
      throw conflict("Telegram credential encryption is not configured on the server.");
    }
    var tokenCiphertext = clearToken
        ? ""
        : suppliedToken.isBlank() || !tokenChanged
            ? current.botTokenCiphertext()
            : cipher.encrypt(suppliedToken);
    separationGuard.requireSeparateLiveChatToken(decrypt(tokenCiphertext));
    var targetChatId = text(input.get("targetChatId"));
    var topicName = LIVE_TOPIC_NAME;
    var requestedEnabled = booleanValue(input.get("enabled"));
    var connectionChanged = tokenChanged
        || !current.targetChatId().equals(targetChatId)
        || !current.topicName().equals(topicName);
    if (requestedEnabled && (connectionChanged
        || !current.connected()
        || !"idle".equals(current.setupState()))) {
      throw conflict("Connect and verify the live-chat Bot before enabling it.");
    }
    return repository.saveDraft(
        tokenCiphertext,
        targetChatId,
        topicName,
        requestedEnabled,
        connectionChanged
    );
  }

  @Transactional
  public synchronized TelegramLiveChatRepository.Settings setEnabled(boolean enabled) {
    separationGuard.lockConfiguration();
    var settings = repository.settingsForUpdate();
    var botToken = decrypt(settings.botTokenCiphertext());
    if (enabled && (!settings.connected()
        || botToken.isBlank()
        || !"idle".equals(settings.setupState()))) {
      throw conflict("Connect and verify the live-chat Bot before enabling it.");
    }
    if (enabled) {
      separationGuard.requireSeparateLiveChatToken(botToken);
    }
    return repository.setEnabled(enabled);
  }

  public Credentials current() {
    var settings = repository.settings();
    return new Credentials(settings, decrypt(settings.botTokenCiphertext()));
  }

  public boolean acceptsWebhookSecret(String provided) {
    return authenticatedWebhook(provided) != null;
  }

  public Credentials authenticatedWebhook(String provided) {
    var credentials = current();
    if (!credentials.ready() || text(provided).isBlank()) {
      return null;
    }
    return MessageDigest.isEqual(
        credentials.settings().webhookSecretHash().getBytes(StandardCharsets.UTF_8),
        sha256(provided).getBytes(StandardCharsets.UTF_8)
    ) ? credentials : null;
  }

  public Map<String, Object> adminView() {
    var settings = repository.settings();
    var result = new LinkedHashMap<String, Object>();
    result.put("enabled", settings.enabled());
    result.put("botTokenConfigured", !settings.botTokenCiphertext().isBlank());
    result.put("botUsername", settings.botUsername());
    result.put("targetChatId", settings.targetChatId());
    result.put("messageThreadId", settings.messageThreadId());
    result.put("topicName", settings.topicName());
    result.put("connected", settings.connected());
    result.put("setupState", settings.setupState());
    result.put("setupErrorCode", settings.setupErrorCode());
    result.put("setupNeedsAttention", "needs_attention".equals(settings.setupState()));
    result.put("encryptionConfigured", cipher.configured());
    result.put("verifiedAt", settings.verifiedAt());
    result.put("updatedAt", settings.updatedAt());
    return result;
  }

  public Map<String, Object> publicView(boolean webSessionCodecConfigured) {
    return Map.of("enabled", current().ready() && webSessionCodecConfigured);
  }

  private String decrypt(String ciphertext) {
    return cipher.decrypt(text(ciphertext)).orElse("");
  }

  private String randomSecret() {
    var bytes = new byte[32];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String sha256(String value) {
    try {
      var digest = MessageDigest.getInstance("SHA-256")
          .digest(text(value).getBytes(StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("SHA-256 is unavailable.", error);
    }
  }

  private boolean secretsEqual(String first, String second) {
    return MessageDigest.isEqual(
        text(first).getBytes(StandardCharsets.UTF_8),
        text(second).getBytes(StandardCharsets.UTF_8)
    );
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private boolean booleanValue(Object value) {
    return value instanceof Boolean bool && bool;
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record Credentials(
      TelegramLiveChatRepository.Settings settings,
      String botToken
  ) {
    public boolean configured() {
      return settings.connected()
          && "idle".equals(settings.setupState())
          && !botToken.isBlank();
    }

    public boolean ready() {
      return settings.enabled() && configured();
    }
  }
}
