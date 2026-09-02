package com.daeho.customer.sms;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class SolapiAuthorization {
  private SolapiAuthorization() {}

  public static String header(String apiKey, String apiSecret, Instant now, String salt) {
    var date = now.toString();
    return "HMAC-SHA256 apiKey=%s, date=%s, salt=%s, signature=%s"
        .formatted(apiKey, date, salt, signature(apiSecret, date, salt));
  }

  static String signature(String apiSecret, String date, String salt) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(
          mac.doFinal((date + salt).getBytes(StandardCharsets.UTF_8))
      );
    } catch (Exception error) {
      throw new IllegalStateException("Unable to sign SOLAPI request", error);
    }
  }
}
