package com.daeho.customer.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CmsInquiryUnlinkClient {
  private final HttpClient http = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(5))
      .build();
  private final String cmsBaseUrl;
  private final String serviceKey;

  public CmsInquiryUnlinkClient(
      @Value("${customer.cms-base-url:}") String cmsBaseUrl,
      @Value("${customer.internal-api-key:}") String serviceKey) {
    this.cmsBaseUrl = cmsBaseUrl == null ? "" : cmsBaseUrl.replaceAll("/+$", "");
    this.serviceKey = serviceKey == null ? "" : serviceKey;
  }

  public boolean unlinkRetainedInquiries(UUID customerId) {
    return patch("/api/customer/inquiries/customer/" + customerId + "/unlink", "{}");
  }

  public boolean linkApprovedClaim(UUID customerId, String inquiryId) {
    var body = """
        {"customerId":"%s","actor":"claim-reconciler","reason":"approved legacy claim"}
        """.formatted(customerId);
    return patch(
        "/api/customer/inquiries/" + pathSegment(inquiryId) + "/claim-link",
        body
    );
  }

  private boolean patch(String path, String body) {
    if (cmsBaseUrl.isBlank() || serviceKey.length() < 24) {
      return false;
    }
    try {
      var request = HttpRequest.newBuilder(URI.create(cmsBaseUrl + path))
          .timeout(Duration.ofSeconds(8))
          .header("x-customer-service-key", serviceKey)
          .header("content-type", "application/json")
          .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
          .build();
      var response = http.send(request, HttpResponse.BodyHandlers.discarding());
      return response.statusCode() >= 200 && response.statusCode() < 300;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return false;
    } catch (Exception error) {
      return false;
    }
  }

  private String pathSegment(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8).replace("+", "%20");
  }
}
