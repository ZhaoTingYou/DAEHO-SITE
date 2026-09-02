package com.daeho.customer.config;

import com.daeho.customer.sms.SmsSender;
import com.daeho.customer.sms.SolapiSmsSender;
import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomerBeans {
  @Bean
  SmsSender smsSender(
      ObjectMapper objectMapper,
      Clock clock,
      @Value("${customer.sms.base-url:https://api.solapi.com}") String baseUrl,
      @Value("${customer.sms.api-key:}") String apiKey,
      @Value("${customer.sms.api-secret:}") String apiSecret,
      @Value("${customer.sms.sender-number:}") String senderNumber) {
    var random = new SecureRandom();
    return new SolapiSmsSender(
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
        objectMapper,
        baseUrl,
        apiKey,
        apiSecret,
        senderNumber,
        clock,
        () -> {
          var bytes = new byte[16];
          random.nextBytes(bytes);
          return HexFormat.of().formatHex(bytes);
        }
    );
  }
}
