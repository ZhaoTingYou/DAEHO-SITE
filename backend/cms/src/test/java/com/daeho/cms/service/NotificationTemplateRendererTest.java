package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.daeho.cms.config.NotificationProperties;
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
}
