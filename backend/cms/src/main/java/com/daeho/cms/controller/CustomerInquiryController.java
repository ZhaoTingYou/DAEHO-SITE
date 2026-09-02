package com.daeho.cms.controller;

import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.security.CustomerLinkAuth;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/customer/inquiries")
public class CustomerInquiryController {
  private final CmsRepository inquiries;
  private final CustomerLinkAuth auth;

  public CustomerInquiryController(CmsRepository inquiries, CustomerLinkAuth auth) {
    this.inquiries = inquiries;
    this.auth = auth;
  }

  @GetMapping
  public Map<String, List<Map<String, Object>>> list(
      HttpServletRequest request, @RequestParam UUID customerId) {
    auth.requireService(request);
    return Map.of("items", inquiries.listCustomerInquiries(customerId.toString()));
  }

  @GetMapping("/{id}")
  public Map<String, Object> detail(
      HttpServletRequest request, @RequestParam UUID customerId, @PathVariable String id) {
    auth.requireService(request);
    var inquiry = inquiries.getCustomerInquiry(customerId.toString(), id);
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return Map.of("inquiry", inquiry);
  }

  @PostMapping("/{id}/claim")
  public Map<String, Object> claim(
      HttpServletRequest request, @PathVariable String id, @RequestBody ClaimRequest input) {
    auth.requireService(request);
    return inquiries.claimInquiry(id, input.customerId().toString(), input.contact());
  }

  @PatchMapping("/{id}/link")
  public Map<String, Object> link(
      HttpServletRequest request, @PathVariable String id, @RequestBody AdminLinkRequest input) {
    auth.requireService(request);
    var inquiry = input.customerId() == null
        ? inquiries.unlinkInquiryByAdmin(id, input.actor(), input.reason())
        : inquiries.linkInquiryByAdmin(id, input.customerId().toString(), input.actor(), input.reason());
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return Map.of("inquiry", inquiry);
  }

  @PatchMapping("/customer/{customerId}/unlink")
  public Map<String, Object> unlinkDeletedCustomer(
      HttpServletRequest request, @PathVariable UUID customerId) {
    auth.requireService(request);
    return Map.of("unlinked", inquiries.unlinkInquiriesForDeletedCustomer(customerId.toString()));
  }

  public record ClaimRequest(UUID customerId, String contact) {}

  public record AdminLinkRequest(UUID customerId, String actor, String reason) {}
}
