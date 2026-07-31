package com.daeho.cms.controller;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.service.InquiryWorkflowService;
import com.daeho.cms.service.RequestValidation;
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
  private final InquiryWorkflowService workflow;
  private final RequestValidation validation;

  public PublicInquiryController(InquiryWorkflowService workflow, RequestValidation validation) {
    this.workflow = workflow;
    this.validation = validation;
  }

  @PostMapping("/contact")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> contact(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    var parsed = validation.contactInquiry(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return Map.of("inquiry", workflow.createContact(parsed.data(), requestMeta(request)));
  }

  @PostMapping("/golf")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> golf(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    var parsed = validation.golfInquiry(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return Map.of("inquiry", workflow.createGolf(parsed.data(), requestMeta(request)));
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
