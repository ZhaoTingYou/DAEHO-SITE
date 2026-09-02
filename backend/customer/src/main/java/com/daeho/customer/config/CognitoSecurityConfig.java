package com.daeho.customer.config;

import jakarta.servlet.DispatcherType;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import com.daeho.customer.security.CognitoAccessTokenValidator;

@Configuration
@ConditionalOnProperty(name = "customer.auth.mode", havingValue = "cognito")
public class CognitoSecurityConfig {
  @Bean
  JwtDecoder customerJwtDecoder(
      @Value("${customer.auth.issuer-uri}") String issuerUri,
      @Value("${customer.auth.client-id}") String clientId) {
    if (issuerUri == null || issuerUri.isBlank()) {
      throw new IllegalStateException("COGNITO_ISSUER_URI is required when CUSTOMER_AUTH_MODE=cognito");
    }
    if (clientId == null || clientId.isBlank()) {
      throw new IllegalStateException("COGNITO_CLIENT_ID is required when CUSTOMER_AUTH_MODE=cognito");
    }
    var decoder = (NimbusJwtDecoder) JwtDecoders.fromIssuerLocation(issuerUri);
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer(issuerUri),
        new CognitoAccessTokenValidator(clientId)
    ));
    return decoder;
  }

  @Bean
  SecurityFilterChain cognitoSecurity(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
            .requestMatchers(publicEndpoints()).permitAll()
            .anyRequest().authenticated())
        .oauth2ResourceServer(resource -> resource.jwt(Customizer.withDefaults()))
        .build();
  }

  static RequestMatcher publicEndpoints() {
    return new OrRequestMatcher(
        PathPatternRequestMatcher.pathPattern("/actuator/**"),
        PathPatternRequestMatcher.pathPattern("/v1/verifications/**"),
        PathPatternRequestMatcher.pathPattern("/v1/internal/**")
    );
  }
}
