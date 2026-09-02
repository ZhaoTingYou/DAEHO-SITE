package com.daeho.customer.controller;

import com.daeho.customer.repository.LegacyClaimRepository;
import com.daeho.customer.security.InternalApiKey;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/internal/admin/legacy-claims")
public class LegacyClaimAdminController {
  private final InternalApiKey auth;
  private final LegacyClaimRepository claims;

  public LegacyClaimAdminController(InternalApiKey auth, LegacyClaimRepository claims) {
    this.auth = auth;
    this.claims = claims;
  }

  @GetMapping
  public List<Map<String, Object>> pending(HttpServletRequest request) {
    auth.require(request);
    return claims.listPending();
  }

  @PatchMapping("/{id}")
  public Map<String, Object> review(
      HttpServletRequest request, @PathVariable UUID id, @RequestBody ReviewRequest input) {
    auth.require(request);
    return claims.review(id, input.status(), input.reviewer(), input.reason());
  }

  public record ReviewRequest(String status, String reviewer, String reason) {}
}
