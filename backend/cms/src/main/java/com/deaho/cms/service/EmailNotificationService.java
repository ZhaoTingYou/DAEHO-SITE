package com.deaho.cms.service;

import com.deaho.cms.config.CmsProperties;
import com.deaho.cms.repository.CmsRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {
  private final CmsProperties properties;
  private final Environment environment;
  private final ObjectProvider<JavaMailSender> mailSender;
  private final CmsRepository repository;

  public EmailNotificationService(
      CmsProperties properties,
      Environment environment,
      ObjectProvider<JavaMailSender> mailSender,
      CmsRepository repository
  ) {
    this.properties = properties;
    this.environment = environment;
    this.mailSender = mailSender;
    this.repository = repository;
  }

  public Map<String, Object> notifyInquiry(Map<String, Object> inquiry) {
    var subject = "[DEAHO] New " + ("golf".equals(inquiry.get("source")) ? "Golf" : "Contact") + " inquiry";
    var to = text(properties.notifyTo());
    var from = text(properties.smtpFrom());
    var host = text(environment.getProperty("spring.mail.host"));

    if (to.isBlank() || from.isBlank() || host.isBlank()) {
      repository.createEmailEvent(emailEvent(
          inquiry.get("id"),
          "",
          subject,
          "skipped",
          "",
          "SMTP is not configured."
      ));
      return Map.of("status", "skipped");
    }

    try {
      var sender = mailSender.getObject();
      var message = new SimpleMailMessage();
      message.setFrom(from);
      message.setTo(to);
      message.setSubject(subject);
      message.setText(renderInquiryText(inquiry));
      sender.send(message);
      repository.createEmailEvent(emailEvent(inquiry.get("id"), to, subject, "sent", "", ""));
      return Map.of("status", "sent");
    } catch (Exception error) {
      var message = error.getMessage() == null ? "Unknown email error." : error.getMessage();
      repository.createEmailEvent(emailEvent(inquiry.get("id"), to, subject, "failed", "", message));
      return Map.of("status", "failed", "error", message);
    }
  }

  private Map<String, Object> emailEvent(
      Object inquiryId,
      String recipient,
      String subject,
      String status,
      String providerMessageId,
      String errorMessage
  ) {
    var event = new LinkedHashMap<String, Object>();
    event.put("inquiryId", inquiryId);
    event.put("recipient", recipient);
    event.put("subject", subject);
    event.put("status", status);
    event.put("providerMessageId", providerMessageId);
    event.put("errorMessage", errorMessage);
    return event;
  }

  private String renderInquiryText(Map<String, Object> inquiry) {
    return String.join("\n",
        "Inquiry ID: " + inquiry.get("id"),
        "Source: " + inquiry.get("source"),
        "Locale: " + inquiry.get("locale"),
        "Name: " + inquiry.get("name"),
        "Contact: " + inquiry.get("contact"),
        "Organization: " + inquiry.get("organization"),
        "Type: " + inquiry.get("inquiryType"),
        "Team: " + inquiry.get("team"),
        "Quantity: " + inquiry.get("quantity"),
        "Due date: " + inquiry.get("dueDate"),
        "Use: " + inquiry.get("useCase"),
        "Page: " + inquiry.get("pagePath"),
        "Created: " + inquiry.get("createdAt"),
        "",
        "Configuration:",
        String.valueOf(inquiry.get("configuration")),
        "",
        "Message:",
        String.valueOf(inquiry.getOrDefault("message", ""))
    );
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
