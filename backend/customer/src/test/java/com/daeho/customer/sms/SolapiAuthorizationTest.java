package com.daeho.customer.sms;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SolapiAuthorizationTest {
  @Test
  void createsTheOfficialHmacSha256AuthorizationHeader() {
    var header = SolapiAuthorization.header(
        "api-key",
        "api-secret",
        Instant.parse("2026-09-02T01:02:03Z"),
        "0123456789abcdef"
    );

    assertThat(header).isEqualTo(
        "HMAC-SHA256 apiKey=api-key, date=2026-09-02T01:02:03Z, "
            + "salt=0123456789abcdef, "
            + "signature=e1f04d8e755510a38c9f01ea5401701c246869254f1f243096cf1588574e3168"
    );
  }
}
