package com.daeho.cms.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.daeho.cms.config.WebLiveChatProperties;
import org.junit.jupiter.api.Test;

class WebLiveChatTokenCodecTest {
  @Test
  void issuesUnpredictableTokensAndStoresOnlyStableHmacHashes() {
    var codec = new WebLiveChatTokenCodec(properties("test-session-secret-with-32-bytes-minimum"));

    var first = codec.issue();
    var second = codec.issue();

    assertNotEquals(first.raw(), second.raw());
    assertEquals(first.hash(), codec.hash(first.raw()));
    assertFalse(first.hash().contains(first.raw()));
  }

  @Test
  void rejectsNonblankSecretsShorterThanThirtyTwoCharactersButAllowsDisabledCodec() {
    assertThrows(IllegalArgumentException.class,
        () -> new WebLiveChatTokenCodec(properties("too-short-secret")));
    assertDoesNotThrow(() -> new WebLiveChatTokenCodec(properties("   ")));
    assertFalse(new WebLiveChatTokenCodec(properties("")).configured());
  }

  @Test
  void hashesIpWithoutRetainingItsSourceValue() {
    var codec = new WebLiveChatTokenCodec(properties("test-session-secret-with-32-bytes-minimum"));
    var sourceIp = "203.0.113.42";

    var hash = codec.ipHash(sourceIp);

    assertEquals(hash, codec.ipHash(sourceIp));
    assertFalse(hash.contains(sourceIp));
  }

  private static WebLiveChatProperties properties(String sessionSecret) {
    return new WebLiveChatProperties(sessionSecret, "daeho_live_chat", 30, "https://daeho.works");
  }
}
