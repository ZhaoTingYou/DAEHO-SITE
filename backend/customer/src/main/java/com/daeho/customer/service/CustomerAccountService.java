package com.daeho.customer.service;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.repository.CustomerProfileStore;
import com.daeho.customer.security.AuthenticatedCustomer;
import com.daeho.customer.security.SessionFreshness;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerAccountService {
  private final CustomerProfileStore profiles;
  private final RegistrationGrantService grants;

  public CustomerAccountService(CustomerProfileStore profiles, RegistrationGrantService grants) {
    this.profiles = profiles;
    this.grants = grants;
  }

  @Transactional
  public CustomerProfile provisionFromAuthenticatedPhone(String subject, String phone, String loginName) {
    var existing = profiles.findBySubject(subject);
    if (existing != null) {
      return existing;
    }
    var normalizedLoginName = LoginNamePolicy.normalize(loginName);
    var verification = grants.requireConsumedPhoneForProvisioning(phone);
    var profileForPhone = profiles.findByPhone(phone);
    CustomerProfile profile;
    if (profileForPhone == null) {
      profile = profiles.createFromVerification(subject, verification, normalizedLoginName);
    } else {
      requireLegacyMigrationCandidate(profileForPhone);
      profile = profiles.relinkVerifiedPhone(profileForPhone.customerId(), subject, normalizedLoginName);
    }
    grants.consumeProvisioningReceipt(verification.id());
    return profile;
  }

  public void requireRegistrationIdentifierAvailable(VerificationSession verification) {
    if (verification.phone().isBlank()) {
      return;
    }
    var existing = profiles.findByPhone(verification.phone());
    if (existing != null) {
      requireLegacyMigrationCandidate(existing);
    }
  }

  private void requireLegacyMigrationCandidate(CustomerProfile profile) {
    if (!"active".equals(profile.status()) || (profile.loginName() != null && !profile.loginName().isBlank())) {
      throw new RegistrationGrantException("An account already exists for this phone; use account recovery");
    }
  }

  public CustomerProfile requireActive(String subject) {
    var profile = profiles.findBySubject(subject);
    if (profile == null) {
      throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Customer profile is not provisioned");
    }
    if (!"active".equals(profile.status())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Customer account is not active");
    }
    return profile;
  }

  public CustomerProfile requireActive(AuthenticatedCustomer customer) {
    var profile = requireActive(customer.subject());
    SessionFreshness.requireCurrent(profile, customer);
    return profile;
  }

  public CustomerProfile update(
      AuthenticatedCustomer customer, String displayName, String email, String organization, String team, String locale) {
    requireActive(customer);
    return profiles.update(customer.subject(), clean(displayName, 120), clean(email, 254),
        clean(organization, 160), clean(team, 160), normalizeLocale(locale));
  }

  public CustomerProfile requestDeletion(AuthenticatedCustomer customer) {
    requireActive(customer);
    return profiles.markDeletionPending(customer.subject());
  }

  public CustomerProfile logoutEverywhere(AuthenticatedCustomer customer) {
    requireActive(customer);
    return profiles.incrementSessionVersion(customer.subject());
  }

  public List<CustomerProfile> search(String query, int limit) {
    return profiles.search(query, limit);
  }

  public CustomerProfile updateStatus(UUID customerId, String status, String actor) {
    if (!"active".equals(status) && !"suspended".equals(status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be active or suspended");
    }
    var profile = profiles.updateStatus(customerId, status, clean(actor, 160));
    if (profile == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found");
    }
    return profile;
  }

  private String clean(String value, int maxLength) {
    var text = value == null ? "" : value.trim();
    return text.length() > maxLength ? text.substring(0, maxLength) : text;
  }

  private String normalizeLocale(String locale) {
    return "en".equals(locale) ? "en" : "ko";
  }
}
