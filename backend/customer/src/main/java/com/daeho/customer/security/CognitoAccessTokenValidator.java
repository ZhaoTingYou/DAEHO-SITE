package com.daeho.customer.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class CognitoAccessTokenValidator implements OAuth2TokenValidator<Jwt> {
  private static final OAuth2Error INVALID_TOKEN = new OAuth2Error(
      "invalid_token", "Token is not a Cognito access token for this application", null
  );
  private final String clientId;

  public CognitoAccessTokenValidator(String clientId) {
    this.clientId = clientId == null ? "" : clientId;
  }

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    if ("access".equals(token.getClaimAsString("token_use"))
        && !clientId.isBlank()
        && clientId.equals(token.getClaimAsString("client_id"))) {
      return OAuth2TokenValidatorResult.success();
    }
    return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
  }
}
