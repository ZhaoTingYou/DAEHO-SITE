package com.deaho.cms.controller;

import com.deaho.cms.error.ValidationFailedException;
import com.deaho.cms.repository.CmsRepository;
import com.deaho.cms.service.EmailNotificationService;
import com.deaho.cms.service.RequestValidation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inquiries")
public class PublicInquiryController {
  private final CmsRepository repository;
  private final RequestValidation validation;
  private final EmailNotificationService email;

  public PublicInquiryController(CmsRepository repository, RequestValidation validation, EmailNotificationService email) {
    this.repository = repository;
    this.validation = validation;
    this.email = email;
  }

  @PostMapping("/contact")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> contact(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    var parsed = validation.contactInquiry(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var inquiry = repository.createContactInquiry(parsed.data(), requestMeta(request));
    return Map.of("inquiry", inquiry, "email", email.notifyInquiry(inquiry));
  }

  @PostMapping("/golf")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> golf(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    var parsed = validation.golfInquiry(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var inquiry = repository.createGolfInquiry(parsed.data(), requestMeta(request));
    return Map.of("inquiry", inquiry, "email", email.notifyInquiry(inquiry));
  }

  private Map<String, String> requestMeta(HttpServletRequest request) {
    var forwardedFor = request.getHeader("x-forwarded-for");
    var realIp = request.getHeader("x-real-ip");
    return Map.of(
        "userAgent", text(request.getHeader("user-agent")),
        "ipAddress", text(forwardedFor != null ? forwardedFor.split(",")[0].trim() : realIp)
    );
  }

  private String text(String value) {
    return value == null ? "" : value;
  }
}
