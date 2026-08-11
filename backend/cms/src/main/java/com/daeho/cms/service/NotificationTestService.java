package com.daeho.cms.service;

import com.daeho.cms.repository.NotificationRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationTestService {
  private final NotificationRepository repository;
  private final WorkspaceEmailSender email;
  private final SolapiKakaoClient kakao;
  private final NotificationTemplateRenderer renderer;

  public NotificationTestService(
      NotificationRepository repository,
      WorkspaceEmailSender email,
      SolapiKakaoClient kakao,
      NotificationTemplateRenderer renderer
  ) {
    this.repository = repository;
    this.email = email;
    this.kakao = kakao;
    this.renderer = renderer;
  }

  public Map<String, Object> send(String channel, String recipient, String templateKey) {
    var template = repository.getActiveTemplate(templateKey);
    if (template == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected template is not active.");
    }
    if (!channel.equals(text(template.get("channel")))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The template channel does not match the test channel.");
    }
    var sampleInquiry = Map.<String, Object>of(
        "id", "TEST-INQUIRY",
        "status", "new",
        "locale", text(template.get("locale")),
        "name", "DAEHO TEST",
        "phone", "01000000000",
        "email", "test@example.com",
        "organization", "DAEHO",
        "inquiryType", "test",
        "message", "Notification connection test"
    );
    var variables = renderer.variables(
        sampleInquiry,
        "new",
        firstNonBlank(template.get("inquiryStatus"), "contacted")
    );
    var job = new LinkedHashMap<String, Object>();
    job.put("recipient", recipient);
    job.put("subject", renderer.render(text(template.get("subject")), variables));
    job.put("renderedBody", renderer.render(text(template.get("body")), variables));
    job.put("providerTemplateCode", text(template.get("providerTemplateCode")));

    if ("email".equals(channel)) {
      var result = email.send(job);
      return Map.of(
          "success", result.success(),
          "providerMessageId", result.providerMessageId(),
          "errorMessage", result.errorMessage()
      );
    }

    if (!"approved".equals(text(template.get("approvalStatus")))
        || text(template.get("providerTemplateCode")).isBlank()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The Kakao template is not externally approved.");
    }
    var result = kakao.send(job);
    return Map.of(
        "success", result.accepted(),
        "providerMessageId", result.messageId(),
        "errorMessage", result.errorMessage()
    );
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  private String firstNonBlank(Object value, String fallback) {
    var text = text(value);
    return text.isBlank() ? fallback : text;
  }
}
