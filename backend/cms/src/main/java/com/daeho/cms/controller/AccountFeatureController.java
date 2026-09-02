package com.daeho.cms.controller;

import com.daeho.cms.repository.AccountFeatureRepository;
import com.daeho.cms.security.AdminAuth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AccountFeatureController {
  private final AdminAuth auth;
  private final AccountFeatureRepository repository;

  public AccountFeatureController(AdminAuth auth, AccountFeatureRepository repository) {
    this.auth = auth;
    this.repository = repository;
  }

  @GetMapping("/api/cms/account-features")
  public PublicSettings publicSettings() {
    var settings = repository.get();
    return new PublicSettings(
        settings.customerAccountsEnabled(), settings.inquiryAccountRequired()
    );
  }

  @GetMapping("/api/admin/account-features")
  public AccountFeatureRepository.Settings adminSettings(HttpServletRequest request) {
    auth.requireAdmin(request);
    return repository.get();
  }

  @PutMapping("/api/admin/account-features")
  public AccountFeatureRepository.Settings update(
      @RequestBody UpdateRequest body,
      @RequestHeader("x-admin-user-id") String actor,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var normalizedActor = actor == null ? "" : actor.trim();
    if (normalizedActor.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing CMS actor.");
    }
    if (body.inquiryAccountRequired() && !body.customerAccountsEnabled()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Inquiry authentication requires customer accounts to be enabled."
      );
    }
    return repository.update(
        body.customerAccountsEnabled(), body.inquiryAccountRequired(), normalizedActor
    );
  }

  public record UpdateRequest(
      boolean customerAccountsEnabled,
      boolean inquiryAccountRequired
  ) {}

  public record PublicSettings(
      boolean customerAccountsEnabled,
      boolean inquiryAccountRequired
  ) {}
}
