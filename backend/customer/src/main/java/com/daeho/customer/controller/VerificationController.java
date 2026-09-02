package com.daeho.customer.controller;

import com.daeho.customer.service.EmailVerificationService;
import com.daeho.customer.service.SmsVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/verifications")
public class VerificationController {
  private final EmailVerificationService email;
  private final SmsVerificationService sms;

  public VerificationController(
      EmailVerificationService email,
      SmsVerificationService sms) {
    this.email = email;
    this.sms = sms;
  }

  @PostMapping("/email/start")
  @ResponseStatus(HttpStatus.CREATED)
  public EmailVerificationService.EmailStartResult startEmail(
      @RequestBody EmailVerificationService.EmailStartRequest request) {
    return email.start(request);
  }

  @PostMapping("/email/{id}/complete")
  public Object completeEmail(@PathVariable UUID id, @RequestBody CodeRequest request) {
    return email.complete(id, request.code());
  }

  @PostMapping("/sms/start")
  @ResponseStatus(HttpStatus.CREATED)
  public SmsVerificationService.SmsStartResult startSms(
      HttpServletRequest servletRequest,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @RequestBody SmsVerificationService.SmsStartRequest request) {
    return sms.start(request, clientIp(servletRequest), idempotencyKey);
  }

  @PostMapping("/sms/{id}/complete")
  public Object completeSms(@PathVariable UUID id, @RequestBody CodeRequest request) {
    return sms.complete(id, request.code());
  }

  public record CodeRequest(String code) {}

  private String clientIp(HttpServletRequest request) {
    var forwarded = request.getHeader("x-forwarded-for");
    return forwarded == null ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
  }
}
