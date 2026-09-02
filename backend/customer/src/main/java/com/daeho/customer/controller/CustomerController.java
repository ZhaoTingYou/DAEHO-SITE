package com.daeho.customer.controller;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.security.AuthenticatedSubjectResolver;
import com.daeho.customer.security.InternalApiKey;
import com.daeho.customer.service.CustomerAccountService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CustomerController {
  private final CustomerAccountService accounts;
  private final AuthenticatedSubjectResolver subjects;
  private final InternalApiKey internalApiKey;
  private final com.daeho.customer.service.RegistrationGrantService registrationGrants;

  public CustomerController(
      CustomerAccountService accounts,
      AuthenticatedSubjectResolver subjects,
      InternalApiKey internalApiKey,
      com.daeho.customer.service.RegistrationGrantService registrationGrants) {
    this.accounts = accounts;
    this.subjects = subjects;
    this.internalApiKey = internalApiKey;
    this.registrationGrants = registrationGrants;
  }

  @GetMapping("/v1/me")
  public CustomerProfile me(Authentication authentication, HttpServletRequest request) {
    return accounts.requireActive(subjects.require(authentication, request));
  }

  @PatchMapping("/v1/me")
  public CustomerProfile update(
      Authentication authentication, HttpServletRequest request, @RequestBody ProfileUpdate input) {
    return accounts.update(subjects.require(authentication, request), input.displayName(), input.email(),
        input.organization(), input.team(), input.locale());
  }

  @DeleteMapping("/v1/me")
  public CustomerProfile requestDeletion(Authentication authentication, HttpServletRequest request) {
    return accounts.requestDeletion(subjects.require(authentication, request));
  }

  @PostMapping("/v1/me/logout-all")
  public Map<String, Object> logoutEverywhere(Authentication authentication, HttpServletRequest request) {
    var profile = accounts.logoutEverywhere(subjects.require(authentication, request));
    return Map.of("sessionVersion", profile.sessionVersion());
  }

  @PostMapping("/v1/internal/profiles")
  public CustomerProfile provision(
      HttpServletRequest request, @RequestBody ProvisionRequest input) {
    internalApiKey.require(request);
    return accounts.provision(input.subject(), input.registrationGrant());
  }

  @PostMapping("/v1/internal/profiles/from-authenticated-phone")
  public CustomerProfile provisionFromAuthenticatedPhone(
      HttpServletRequest request, @RequestBody AuthenticatedPhoneProvisionRequest input) {
    internalApiKey.require(request);
    return accounts.provisionFromAuthenticatedPhone(input.subject(), input.phone());
  }

  @PostMapping("/v1/internal/registration-grants/validate")
  public Map<String, Object> validateRegistrationGrant(
      HttpServletRequest request, @RequestBody RegistrationGrantValidation input) {
    internalApiKey.require(request);
    var verification = registrationGrants.consumeForSignup(input.registrationGrant());
    accounts.requireRegistrationIdentifierAvailable(verification);
    return Map.of(
        "method", verification.method(),
        "identifier", verification.identifier(),
        "phone", verification.phone(),
        "adultVerified", verification.adultVerified(),
        "expiresAt", verification.grantExpiresAt().toString()
    );
  }

  @GetMapping("/v1/internal/subjects")
  public CustomerProfile resolveSubject(
      HttpServletRequest request, @RequestParam String subject) {
    internalApiKey.require(request);
    return accounts.requireActive(subject);
  }

  @GetMapping("/v1/internal/admin/customers")
  public List<CustomerProfile> search(
      HttpServletRequest request,
      @RequestParam(defaultValue = "") String query,
      @RequestParam(defaultValue = "50") int limit) {
    internalApiKey.require(request);
    return accounts.search(query, limit);
  }

  @PatchMapping("/v1/internal/admin/customers/{customerId}/status")
  public CustomerProfile updateStatus(
      HttpServletRequest request,
      @PathVariable UUID customerId,
      @RequestBody StatusUpdate input) {
    internalApiKey.require(request);
    return accounts.updateStatus(customerId, input.status(), input.actor());
  }

  public record ProfileUpdate(String displayName, String email, String organization, String team, String locale) {}

  public record ProvisionRequest(String subject, String registrationGrant) {}

  public record AuthenticatedPhoneProvisionRequest(String subject, String phone) {}

  public record RegistrationGrantValidation(String registrationGrant) {}

  public record StatusUpdate(String status, String actor) {}
}
