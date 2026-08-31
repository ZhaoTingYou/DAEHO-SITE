package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class TelegramCredentialCipher {
  private static final String VERSION = "v1:";
  private static final int KEY_BYTES = 32;
  private static final int IV_BYTES = 12;
  private static final int TAG_BITS = 128;

  private final SecretKeySpec key;
  private final SecureRandom random = new SecureRandom();

  public TelegramCredentialCipher(NotificationProperties properties) {
    this.key = parseKey(properties.telegramEncryptionKey());
  }

  public boolean configured() {
    return key != null;
  }

  public String encrypt(String plaintext) {
    if (!configured()) {
      throw new IllegalStateException("Telegram credential encryption is not configured.");
    }
    try {
      var iv = new byte[IV_BYTES];
      random.nextBytes(iv);
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      var encrypted = cipher.doFinal(text(plaintext).getBytes(StandardCharsets.UTF_8));
      var payload = new byte[iv.length + encrypted.length];
      System.arraycopy(iv, 0, payload, 0, iv.length);
      System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
      return VERSION + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
    } catch (GeneralSecurityException error) {
      throw new IllegalStateException("Unable to encrypt Telegram credentials.", error);
    }
  }

  public Optional<String> decrypt(String ciphertext) {
    if (!configured() || !text(ciphertext).startsWith(VERSION)) {
      return Optional.empty();
    }
    try {
      var payload = Base64.getUrlDecoder().decode(text(ciphertext).substring(VERSION.length()));
      if (payload.length <= IV_BYTES) {
        return Optional.empty();
      }
      var iv = Arrays.copyOfRange(payload, 0, IV_BYTES);
      var encrypted = Arrays.copyOfRange(payload, IV_BYTES, payload.length);
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      return Optional.of(new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8));
    } catch (GeneralSecurityException | IllegalArgumentException error) {
      return Optional.empty();
    }
  }

  private SecretKeySpec parseKey(String encoded) {
    try {
      var decoded = Base64.getDecoder().decode(text(encoded));
      return decoded.length == KEY_BYTES ? new SecretKeySpec(decoded, "AES") : null;
    } catch (IllegalArgumentException error) {
      return null;
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
