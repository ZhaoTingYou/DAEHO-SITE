package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.daeho.cms.config.NotificationProperties;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;

class NaverSensKakaoClientTest {
  @Test
  void signsRequestsWithNcpHmacSha256() {
    var client = client();
    assertEquals(
        "SN7saGg21qhL7WNykzFNlbHJ2XHqOv2JDRzeuUNfVqE=",
        client.signature("POST", "/alimtalk/v2/services/service-id/messages", "1722384000000")
    );
  }

  @Test
  void kakaoRequestHardDisablesSmsFallback() {
    var body = client().requestBody(Map.of(
        "providerTemplateCode", "template-code",
        "recipient", "01012345678",
        "renderedBody", "안녕하세요"
    ));

    assertFalse(body.contains("\"useSmsFailover\":true"));
    assertEquals(true, body.contains("\"useSmsFailover\":false"));
  }

  private NaverSensKakaoClient client() {
    var properties = new NotificationProperties(
        true,
        1000,
        "",
        "https://sens.apigw.ntruss.com",
        "access-key",
        "secret-key",
        "service-id",
        "@daeho"
    );
    return new NaverSensKakaoClient(
        properties,
        new JsonSupport(),
        HttpClient.newHttpClient(),
        Clock.fixed(Instant.ofEpochMilli(1722384000000L), ZoneOffset.UTC)
    );
  }
}
