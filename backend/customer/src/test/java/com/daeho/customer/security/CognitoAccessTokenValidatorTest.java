package com.daeho.customer.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class CognitoAccessTokenValidatorTest {
  private final CognitoAccessTokenValidator validator = new CognitoAccessTokenValidator("website-client");

  @Test
  void acceptsOnlyAccessTokensForTheConfiguredAppClient() {
    assertThat(validator.validate(jwt("access", "website-client")).hasErrors()).isFalse();
    assertThat(validator.validate(jwt("id", "website-client")).hasErrors()).isTrue();
    assertThat(validator.validate(jwt("access", "another-client")).hasErrors()).isTrue();
  }

  private Jwt jwt(String tokenUse, String clientId) {
    return new Jwt(
        "token",
        Instant.parse("2026-09-02T00:00:00Z"),
        Instant.parse("2026-09-02T01:00:00Z"),
        Map.of("alg", "RS256"),
        Map.of("sub", "subject", "token_use", tokenUse, "client_id", clientId)
    );
  }
}
