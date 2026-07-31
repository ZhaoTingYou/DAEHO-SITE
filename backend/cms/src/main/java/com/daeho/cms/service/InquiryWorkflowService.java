package com.daeho.cms.service;

import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.repository.NotificationRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InquiryWorkflowService {
  private final CmsRepository inquiries;
  private final NotificationRepository notifications;
  private final NotificationPlanner planner;

  public InquiryWorkflowService(
      CmsRepository inquiries,
      NotificationRepository notifications,
      NotificationPlanner planner
  ) {
    this.inquiries = inquiries;
    this.notifications = notifications;
    this.planner = planner;
  }

  @Transactional
  public Map<String, Object> createContact(
      Map<String, Object> payload,
      Map<String, String> requestMeta
  ) {
    var inquiry = inquiries.createContactInquiry(payload, requestMeta);
    planner.queueNewInquiry(inquiry);
    return inquiry;
  }

  @Transactional
  public Map<String, Object> createGolf(
      Map<String, Object> payload,
      Map<String, String> requestMeta
  ) {
    var inquiry = inquiries.createGolfInquiry(payload, requestMeta);
    planner.queueNewInquiry(inquiry);
    return inquiry;
  }

  public Map<String, Object> previewStatus(String id, String nextStatus) {
    var inquiry = requireInquiry(id);
    return planner.previewStatusChange(inquiry, nextStatus);
  }

  @Transactional
  public Map<String, Object> changeStatus(
      String id,
      String expectedStatus,
      String nextStatus
  ) {
    var current = requireInquiry(id);
    var actualStatus = text(current.get("status"));
    var expected = expectedStatus.isBlank() ? actualStatus : expectedStatus;

    if (!actualStatus.equals(expected)) {
      throw conflict(actualStatus);
    }
    if (actualStatus.equals(nextStatus)) {
      return detail(current);
    }

    var updated = inquiries.updateInquiryStatusIfExpected(id, expected, nextStatus);
    if (updated == null) {
      var latest = requireInquiry(id);
      throw conflict(text(latest.get("status")));
    }
    var event = notifications.createStatusEvent(id, actualStatus, nextStatus);
    planner.queueStatusChange(updated, event);
    return detail(updated);
  }

  public Map<String, Object> detail(Map<String, Object> inquiry) {
    var result = new LinkedHashMap<String, Object>();
    result.put("inquiry", inquiry);
    result.put("statusEvents", notifications.listStatusEvents(text(inquiry.get("id"))));
    result.put("notificationJobs", notifications.listJobsForInquiry(text(inquiry.get("id"))));
    result.put("notificationAttempts", notifications.listAttemptsForInquiry(text(inquiry.get("id"))));
    return result;
  }

  private Map<String, Object> requireInquiry(String id) {
    var inquiry = inquiries.getInquiry(id);
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return inquiry;
  }

  private ResponseStatusException conflict(String actualStatus) {
    return new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Inquiry status changed by another administrator. Current status: " + actualStatus
    );
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
