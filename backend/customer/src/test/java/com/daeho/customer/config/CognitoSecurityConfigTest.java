package com.daeho.customer.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CognitoSecurityConfigTest {
  @Test
  void publicEndpointsPermitVerificationAndInternalRequestsButNotCustomerProfiles() {
    var matcher = CognitoSecurityConfig.publicEndpoints();

    assertThat(matcher.matches(request("POST", "/v1/verifications/sms/start"))).isTrue();
    assertThat(matcher.matches(request("POST", "/v1/recovery/password/start"))).isTrue();
    assertThat(matcher.matches(request("POST", "/v1/recovery/password/00000000-0000-0000-0000-000000000000/complete"))).isTrue();
    assertThat(matcher.matches(request("POST", "/v1/internal/registration-grants/validate"))).isTrue();
    assertThat(matcher.matches(request("POST", "/v1/internal/recovery-grants/reserve"))).isTrue();
    assertThat(matcher.matches(request("GET", "/actuator/health"))).isTrue();
    assertThat(matcher.matches(request("GET", "/v1/me"))).isFalse();
  }

  @Test
  void errorDispatchesRemainPublicSoApiErrorsKeepTheirOriginalStatus() throws Exception {
    var source = Files.readString(Path.of(
        "src/main/java/com/daeho/customer/config/CognitoSecurityConfig.java"
    ));

    assertThat(source).contains(".dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()");
  }

  private MockHttpServletRequest request(String method, String path) {
    var request = new MockHttpServletRequest(method, path);
    request.setServletPath(path);
    return request;
  }
}
