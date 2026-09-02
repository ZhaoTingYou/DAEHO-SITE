package com.daeho.customer.service;

import com.daeho.customer.repository.CustomerProfileStore;
import java.time.Clock;
import java.time.Duration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class DeletionCleanupService {
  private final CustomerProfileStore profiles;
  private final CmsInquiryUnlinkClient cms;
  private final Clock clock;

  public DeletionCleanupService(CustomerProfileStore profiles, CmsInquiryUnlinkClient cms, Clock clock) {
    this.profiles = profiles;
    this.cms = cms;
    this.clock = clock;
  }

  @Scheduled(cron = "0 20 3 * * *", zone = "UTC")
  public void deleteExpiredPersonalData() {
    profiles.anonymizeDeletionPendingBefore(clock.instant().minus(Duration.ofDays(30)));
    for (var customerId : profiles.findCustomersAwaitingInquiryUnlink(100)) {
      if (cms.unlinkRetainedInquiries(customerId)) {
        profiles.markInquiriesUnlinked(customerId);
      }
    }
  }
}
