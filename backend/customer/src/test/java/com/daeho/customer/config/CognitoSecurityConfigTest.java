package com.daeho.customer.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CognitoSecurityConfigTest {
  @Test
  void publicEndpointsPermitVerificationAndInternalRequestsButNotCustomerProfiles() {
    var matcher = CognitoSecurityConfig.publicEndpoints();

    assertThat(matcher.matches(request("POST", "/v1/verifications/sms/start"))).isTrue();
    assertThat(matcher.matches(request("POST", "/v1/internal/registration-grants/validate"))).isTrue();
    assertThat(matcher.matches(request("GET", "/actuator/health"))).isTrue();
    assertThat(matcher.matches(request("GET", "/v1/me"))).isFalse();
  }

  private MockHttpServletRequest request(String method, String path) {
    var request = new MockHttpServletRequest(method, path);
    request.setServletPath(path);
    return request;
  }
}
