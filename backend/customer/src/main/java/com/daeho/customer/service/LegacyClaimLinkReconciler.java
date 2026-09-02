package com.daeho.customer.service;

import com.daeho.customer.repository.LegacyClaimRepository;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class LegacyClaimLinkReconciler {
  private final LegacyClaimRepository claims;
  private final CmsInquiryUnlinkClient cms;

  public LegacyClaimLinkReconciler(LegacyClaimRepository claims, CmsInquiryUnlinkClient cms) {
    this.claims = claims;
    this.cms = cms;
  }

  @Scheduled(fixedDelay = 60_000, initialDelay = 10_000)
  public void linkApprovedClaims() {
    for (var claim : claims.listApprovedAwaitingLink(50)) {
      var id = (UUID) claim.get("id");
      var customerId = (UUID) claim.get("customerId");
      var inquiryId = String.valueOf(claim.get("inquiryId"));
      if (cms.linkApprovedClaim(customerId, inquiryId)) {
        claims.markLinked(id);
      }
    }
  }
}
