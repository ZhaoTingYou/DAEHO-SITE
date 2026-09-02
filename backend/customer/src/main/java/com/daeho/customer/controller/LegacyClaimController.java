package com.daeho.customer.controller;

import com.daeho.customer.repository.LegacyClaimRepository;
import com.daeho.customer.security.AuthenticatedSubjectResolver;
import com.daeho.customer.service.CustomerAccountService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me/legacy-claims")
public class LegacyClaimController {
  private final CustomerAccountService accounts;
  private final AuthenticatedSubjectResolver subjects;
  private final LegacyClaimRepository claims;

  public LegacyClaimController(
      CustomerAccountService accounts,
      AuthenticatedSubjectResolver subjects,
      LegacyClaimRepository claims) {
    this.accounts = accounts;
    this.subjects = subjects;
    this.claims = claims;
  }

  @GetMapping
  public List<Map<String, Object>> list(Authentication authentication, HttpServletRequest request) {
    var profile = accounts.requireActive(subjects.require(authentication, request));
    return claims.listForCustomer(profile.customerId());
  }

  @PostMapping
  public Map<String, Object> create(
      Authentication authentication,
      HttpServletRequest request,
      @RequestBody ClaimRequest input) {
    var profile = accounts.requireActive(subjects.require(authentication, request));
    if (input.inquiryId() == null || input.inquiryId().isBlank()
        || input.contact() == null || input.contact().isBlank()) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Inquiry ID and prior contact are required");
    }
    return claims.create(profile.customerId(), input.inquiryId(), input.contact());
  }

  public record ClaimRequest(String inquiryId, String contact) {}
}
