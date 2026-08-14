package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.daeho.cms.config.NotificationProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class NotificationTemplateRendererTest {
  private final NotificationTemplateRenderer renderer = new NotificationTemplateRenderer(
      new NotificationProperties(
          true,
          1000,
          "https://daeho.works/admin",
          "",
          "",
          "",
          ""
      )
  );

  @Test
  void rendersOnlyWhitelistedVariablesAndSupportsWhitespace() {
    assertEquals(
        "Hello DAEHO, done",
        renderer.render("Hello {{ name }}, {{status}}", Map.of("name", "DAEHO", "status", "done"))
    );
  }

  @Test
  void rejectsUnknownTemplateVariables() {
    var error = assertThrows(
        IllegalArgumentException.class,
        () -> renderer.render("Hello {{customer_password}}", Map.of())
    );

    assertEquals(
        "Unsupported notification template variable: customer_password",
        error.getMessage()
    );
    assertEquals(
        java.util.List.of("customer_password"),
        renderer.validateVariables("{{customer_password}} {{ customer_password }}")
    );
  }

  @Test
  void rendersContactedAsAnAlreadyCompletedContactInBothLanguages() {
    assertEquals("연락 완료", renderer.variables(
        Map.of("id", "inquiry-1", "locale", "ko"),
        "new",
        "contacted"
    ).get("status_label"));
    assertEquals("Contacted", renderer.variables(
        Map.of("id", "inquiry-1", "locale", "en"),
        "new",
        "contacted"
    ).get("status_label"));
  }

  @Test
  void rendersCmsManagedStatusLabels() {
    var variables = renderer.variables(
        Map.of("id", "inquiry-1", "name", "Tester", "locale", "ko"),
        "new",
        "waiting_for_customer",
        "신규",
        "고객 회신 대기"
    );

    assertEquals("고객 회신 대기", variables.get("status_label"));
  }

  @Test
  void exposesTheCurrentInquiryBusinessFieldsToNotificationTemplates() {
    var inquiry = new LinkedHashMap<String, Object>();
    inquiry.put("id", "inquiry-1");
    inquiry.put("source", "golf");
    inquiry.put("locale", "ko");
    inquiry.put("name", "홍길동");
    inquiry.put("phone", "010-1234-5678");
    inquiry.put("email", "customer@example.com");
    inquiry.put("organization", "대호 스포츠");
    inquiry.put("inquiryType", "golf_bracelet");
    inquiry.put("team", "DAEHO TEAM");
    inquiry.put("quantity", 30);
    inquiry.put("dueDate", "2026-09-01");
    inquiry.put("useCase", "시상식");
    inquiry.put("message", "상담 요청");
    inquiry.put("configuration", Map.of(
        "selectedHead", "H-01",
        "selectedShaft", "S-02",
        "selectedStyle", "classic",
        "engravingSample", "DAEHO"
    ));
    inquiry.put("pagePath", "/ko/golf/inquiry");
    inquiry.put("createdAt", "2026-08-11T10:00:00Z");

    var values = renderer.variables(inquiry, "new", "contacted");

    assertEquals("golf", values.get("source"));
    assertEquals("ko", values.get("locale"));
    assertEquals("DAEHO TEAM", values.get("team"));
    assertEquals("30", values.get("quantity"));
    assertEquals("2026-09-01", values.get("due_date"));
    assertEquals("시상식", values.get("use_case"));
    assertEquals("H-01", values.get("selected_head"));
    assertEquals("S-02", values.get("selected_shaft"));
    assertEquals("classic", values.get("selected_style"));
    assertEquals("DAEHO", values.get("engraving_sample"));
    assertEquals("/ko/golf/inquiry", values.get("page_path"));
    assertEquals("2026-08-11T10:00:00Z", values.get("received_at"));
  }
}
