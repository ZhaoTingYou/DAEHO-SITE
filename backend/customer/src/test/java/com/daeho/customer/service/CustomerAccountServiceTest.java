package com.daeho.customer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.repository.CustomerProfileStore;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CustomerAccountServiceTest {
  @Mock CustomerProfileStore profiles;
  @Mock RegistrationGrantService grants;

  @Test
  void verifiedPhoneRelinksAnExistingProfileToTheNewUsernamePoolSubject() {
    var phone = "+821012345678";
    var old = profile("old-pool-subject", "");
    var migrated = profile("new-pool-subject", "daeho.member");
    var verification = verification(phone);
    when(profiles.findBySubject("new-pool-subject")).thenReturn(null);
    when(grants.requireConsumedPhoneForProvisioning(phone)).thenReturn(verification);
    when(profiles.findByPhone(phone)).thenReturn(old);
    when(profiles.relinkVerifiedPhone(old.customerId(), "new-pool-subject", "daeho.member"))
        .thenReturn(migrated);

    var result = new CustomerAccountService(profiles, grants)
        .provisionFromAuthenticatedPhone("new-pool-subject", phone, "daeho.member");

    assertThat(result.loginName()).isEqualTo("daeho.member");
    verify(profiles, never()).createFromVerification("new-pool-subject", verification, "daeho.member");
    verify(grants).consumeProvisioningReceipt(verification.id());
  }

  @Test
  void verifiedPhoneCannotCreateASecondUsernameAccountAfterMigration() {
    var phone = "+821012345678";
    var migrated = profile("first-new-pool-subject", "daeho.member");
    var verification = verification(phone);
    when(profiles.findBySubject("second-new-pool-subject")).thenReturn(null);
    when(grants.requireConsumedPhoneForProvisioning(phone)).thenReturn(verification);
    when(profiles.findByPhone(phone)).thenReturn(migrated);

    var service = new CustomerAccountService(profiles, grants);

    assertThatThrownBy(() -> service.provisionFromAuthenticatedPhone(
        "second-new-pool-subject", phone, "another.member"))
        .isInstanceOf(RegistrationGrantException.class);
    verify(profiles, never()).createFromVerification("second-new-pool-subject", verification, "another.member");
    verify(profiles, never()).relinkVerifiedPhone(migrated.customerId(), "second-new-pool-subject", "another.member");
    verify(grants, never()).consumeProvisioningReceipt(verification.id());
  }

  private CustomerProfile profile(String subject, String loginName) {
    var now = Instant.parse("2026-09-02T00:00:00Z");
    return new CustomerProfile(
        UUID.randomUUID(), subject, loginName, "active", "", "", "+821012345678", "", "ko",
        "KR", "", "", "sms_declaration", now, true, 1, Instant.EPOCH, now, now
    );
  }

  private VerificationSession verification(String phone) {
    return new VerificationSession(
        UUID.randomUUID(), "sms_declaration", phone, "", phone, "fingerprint", true, "ko",
        "terms-2026-09", "privacy-2026-09", false, "verified", "hash",
        Instant.parse("2026-09-02T00:15:00Z"), Instant.parse("2026-09-02T00:15:00Z"),
        Instant.parse("2026-09-02T00:00:00Z")
    );
  }
}
