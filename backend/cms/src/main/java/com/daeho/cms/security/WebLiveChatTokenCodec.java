package com.daeho.cms.security;

import com.daeho.cms.config.WebLiveChatProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class WebLiveChatTokenCodec {
  private static final int TOKEN_BYTES = 32;
  private static final int MINIMUM_SECRET_LENGTH = 32;
  private static final String HMAC_SHA_256 = "HmacSHA256";

  private final SecureRandom random = new SecureRandom();
  private final byte[] secret;

  public WebLiveChatTokenCodec(WebLiveChatProperties properties) {
    var configuredSecret = properties.normalizedSessionSecret();
    if (!configuredSecret.isBlank() && configuredSecret.length() < MINIMUM_SECRET_LENGTH) {
      throw new IllegalArgumentException("CMS_LIVE_CHAT_SESSION_SECRET must be at least 32 characters.");
    }
    secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
  }

  public boolean configured() {
    return secret.length > 0;
  }

  public IssuedToken issue() {
    if (!configured()) {
      throw new IllegalStateException("Embedded web live chat is not configured.");
    }
    var bytes = new byte[TOKEN_BYTES];
    random.nextBytes(bytes);
    var raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    return new IssuedToken(raw, hash(raw));
  }

  public String hash(String raw) {
    return hmac("token:", raw);
  }

  public String ipHash(String normalizedIp) {
    return hmac("ip:", normalizedIp);
  }

  public boolean matches(String raw, String expectedHash) {
    if (!configured() || raw == null || expectedHash == null) {
      return false;
    }
    return MessageDigest.isEqual(
        hash(raw).getBytes(StandardCharsets.US_ASCII),
        expectedHash.getBytes(StandardCharsets.US_ASCII)
    );
  }

  private String hmac(String namespace, String value) {
    if (!configured()) {
      throw new IllegalStateException("Embedded web live chat is not configured.");
    }
    try {
      var mac = Mac.getInstance(HMAC_SHA_256);
      mac.init(new SecretKeySpec(secret, HMAC_SHA_256));
      var bytes = mac.doFinal((namespace + (value == null ? "" : value)).getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    } catch (GeneralSecurityException error) {
      throw new IllegalStateException("Unable to hash web live chat credentials.", error);
    }
  }

  public record IssuedToken(String raw, String hash) {}
}
