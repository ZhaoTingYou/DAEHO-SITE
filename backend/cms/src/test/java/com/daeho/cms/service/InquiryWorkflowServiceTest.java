package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.repository.NotificationRepository;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class InquiryWorkflowServiceTest {
  private CmsRepository inquiries;
  private NotificationRepository notifications;
  private NotificationPlanner planner;
  private InquiryWorkflowService workflow;

  @BeforeEach
  void setUp() {
    inquiries = mock(CmsRepository.class);
    notifications = mock(NotificationRepository.class);
    planner = mock(NotificationPlanner.class);
    workflow = new InquiryWorkflowService(inquiries, notifications, planner);
  }

  @Test
  void persistsStatusHistoryAndOutboxAfterAtomicStatusUpdate() {
    var current = inquiry("new");
    var updated = inquiry("contacted");
    var event = Map.<String, Object>of(
        "id", "event-1",
        "previousStatus", "new",
        "nextStatus", "contacted"
    );
    when(inquiries.getInquiry("inquiry-1")).thenReturn(current);
    when(inquiries.updateInquiryStatusIfExpected("inquiry-1", "new", "contacted")).thenReturn(updated);
    when(notifications.createStatusEvent("inquiry-1", "new", "contacted")).thenReturn(event);
    when(notifications.listStatusEvents("inquiry-1")).thenReturn(java.util.List.of(event));
    when(notifications.listJobsForInquiry("inquiry-1")).thenReturn(java.util.List.of());
    when(notifications.listAttemptsForInquiry("inquiry-1")).thenReturn(java.util.List.of());

    var result = workflow.changeStatus("inquiry-1", "new", "contacted");

    assertEquals("contacted", ((Map<?, ?>) result.get("inquiry")).get("status"));
    verify(notifications).createStatusEvent("inquiry-1", "new", "contacted");
    verify(planner).queueStatusChange(updated, event);
  }

  @Test
  void duplicateSaveDoesNotCreateHistoryOrNotifications() {
    when(inquiries.getInquiry("inquiry-1")).thenReturn(inquiry("done"));
    when(notifications.listStatusEvents("inquiry-1")).thenReturn(java.util.List.of());
    when(notifications.listJobsForInquiry("inquiry-1")).thenReturn(java.util.List.of());
    when(notifications.listAttemptsForInquiry("inquiry-1")).thenReturn(java.util.List.of());

    workflow.changeStatus("inquiry-1", "done", "done");

    verify(inquiries, never()).updateInquiryStatusIfExpected("inquiry-1", "done", "done");
    verify(notifications, never()).createStatusEvent("inquiry-1", "done", "done");
    verify(planner, never()).queueStatusChange(anyMap(), anyMap());
  }

  @Test
  void staleExpectedStatusReturnsConflictBeforeWriting() {
    when(inquiries.getInquiry("inquiry-1")).thenReturn(inquiry("in_progress"));

    var error = assertThrows(
        ResponseStatusException.class,
        () -> workflow.changeStatus("inquiry-1", "contacted", "done")
    );

    assertEquals(409, error.getStatusCode().value());
    verify(inquiries, never()).updateInquiryStatusIfExpected("inquiry-1", "contacted", "done");
  }

  @Test
  void newInquiryIsStoredBeforeItsInternalNotificationIsPlanned() {
    var inquiry = inquiry("new");
    when(inquiries.createContactInquiry(anyMap(), anyMap())).thenReturn(inquiry);

    var created = workflow.createContact(Map.of("name", "Tester"), Map.of());

    assertEquals("inquiry-1", created.get("id"));
    verify(planner).queueNewInquiry(inquiry);
  }

  @Test
  void telegramLiveRegistrationDoesNotInvokeTheExistingNotificationBotWorkflow() {
    var inquiry = inquiry("new");
    when(inquiries.createTelegramInquiry(anyMap(), anyMap())).thenReturn(inquiry);

    var created = workflow.createTelegram(Map.of("name", "Tester"), Map.of());

    assertEquals("inquiry-1", created.get("id"));
    verify(planner, never()).queueNewInquiry(anyMap());
  }

  @Test
  void webLiveChatRegistrationDoesNotInvokeTheExistingNotificationBotWorkflow() {
    var inquiry = inquiry("new");
    when(inquiries.createWebLiveChatInquiry(anyMap(), anyMap())).thenReturn(inquiry);

    var created = workflow.createWebLiveChat(Map.of("conversationId", "conversation-1"), Map.of());

    assertEquals("inquiry-1", created.get("id"));
    verify(inquiries).createWebLiveChatInquiry(anyMap(), anyMap());
    verify(planner, never()).queueNewInquiry(anyMap());
  }

  @Test
  void changesToAnActiveCmsManagedStatus() {
    var current = inquiry("new");
    var updated = inquiry("waiting_for_customer");
    var event = Map.<String, Object>of(
        "id", "event-custom",
        "previousStatus", "new",
        "nextStatus", "waiting_for_customer"
    );
    when(inquiries.getInquiry("inquiry-1")).thenReturn(current);
    when(inquiries.getInquiryStatusForUpdate("waiting_for_customer")).thenReturn(Map.of("isActive", true));
    when(inquiries.updateInquiryStatusIfExpected("inquiry-1", "new", "waiting_for_customer")).thenReturn(updated);
    when(notifications.createStatusEvent("inquiry-1", "new", "waiting_for_customer")).thenReturn(event);
    when(notifications.listStatusEvents("inquiry-1")).thenReturn(java.util.List.of(event));
    when(notifications.listJobsForInquiry("inquiry-1")).thenReturn(java.util.List.of());
    when(notifications.listAttemptsForInquiry("inquiry-1")).thenReturn(java.util.List.of());

    var result = workflow.changeStatus("inquiry-1", "new", "waiting_for_customer");

    assertEquals("waiting_for_customer", ((Map<?, ?>) result.get("inquiry")).get("status"));
  }

  @Test
  void rejectsAnInactiveCmsManagedStatus() {
    when(inquiries.getInquiry("inquiry-1")).thenReturn(inquiry("new"));
    when(inquiries.getInquiryStatusForUpdate("paused")).thenReturn(Map.of("isActive", false));

    var error = assertThrows(
        ResponseStatusException.class,
        () -> workflow.changeStatus("inquiry-1", "new", "paused")
    );

    assertEquals(422, error.getStatusCode().value());
    verify(inquiries, never()).updateInquiryStatusIfExpected("inquiry-1", "new", "paused");
  }

  private Map<String, Object> inquiry(String status) {
    return Map.of(
        "id", "inquiry-1",
        "status", status,
        "name", "Tester",
        "email", "",
        "phone", "01012345678"
    );
  }
}
