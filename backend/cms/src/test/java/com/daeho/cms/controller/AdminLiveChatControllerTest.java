package com.daeho.cms.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ApiExceptionHandler;
import com.daeho.cms.repository.TelegramLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.TelegramLiveChatCredentialService;
import com.daeho.cms.service.TelegramLiveChatService;
import com.daeho.cms.service.WebLiveChatService;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class AdminLiveChatControllerTest {
  private static final String ADMIN_KEY = "test-key";
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  private TelegramLiveChatCredentialService credentials;
  private TelegramLiveChatService legacyService;
  private TelegramLiveChatRepository legacyRepository;
  private WebLiveChatService websiteService;
  private WebLiveChatRepository websiteRepository;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    credentials = mock(TelegramLiveChatCredentialService.class);
    legacyService = mock(TelegramLiveChatService.class);
    legacyRepository = mock(TelegramLiveChatRepository.class);
    websiteService = mock(WebLiveChatService.class);
    websiteRepository = mock(WebLiveChatRepository.class);
    var auth = new AdminAuth(new CmsProperties(
        ADMIN_KEY, "", "", false, Path.of("/tmp/uploads"), "/uploads",
        "", "", "local", "", "", "", "", "", ""
    ));
    mvc = MockMvcBuilders.standaloneSetup(new AdminTelegramLiveChatController(
            auth, credentials, legacyService, legacyRepository, websiteService, websiteRepository
        ))
        .setControllerAdvice(new ApiExceptionHandler())
        .build();
    when(credentials.adminView()).thenReturn(Map.of("enabled", true));
  }

  @Test
  void adminListDistinguishesWebsiteAndLegacySessionsWithoutCredentialsOrAuditBodies()
      throws Exception {
    when(websiteRepository.recentConversations(50)).thenReturn(List.of(
        new WebLiveChatRepository.CmsConversationSummary(
            websiteConversation("shared-id", "active", "", 701L, NOW.plusSeconds(20)), 4L, 2L
        )
    ));
    when(legacyRepository.recentSessions(50)).thenReturn(List.of(
        new TelegramLiveChatRepository.Session(
            "legacy-id", 101L, 202L, "inquiry-legacy", "ko", "awaiting_content",
            "Legacy Customer", "legacy@example.com", "Legacy inquiry", "", 0L, 0L,
            "", 702L, 703L, NOW, NOW.plusSeconds(10)
        )
    ));

    mvc.perform(get("/api/admin/live-chat").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions[0].source").value("website"))
        .andExpect(jsonPath("$.sessions[0].state").value("active"))
        .andExpect(jsonPath("$.sessions[0].unreadCount").value(2))
        .andExpect(jsonPath("$.sessions[0].customerName").value("Website Customer"))
        .andExpect(jsonPath("$.sessions[0].tokenHash").doesNotExist())
        .andExpect(jsonPath("$.sessions[0].visitorId").doesNotExist())
        .andExpect(jsonPath("$.sessions[0].targetChatId").doesNotExist())
        .andExpect(jsonPath("$.sessions[0].messageCount").doesNotExist())
        .andExpect(jsonPath("$.sessions[1].source").value("telegram_legacy"))
        .andExpect(jsonPath("$.sessions[1].state").value("opening"))
        .andExpect(jsonPath("$.sessions[1].unreadCount").value(0))
        .andExpect(jsonPath("$.settings.botTokenCiphertext").doesNotExist())
        .andExpect(jsonPath("$.settings.webhookSecretHash").doesNotExist());
  }

  @Test
  void adminListKeepsEveryActionableSessionAndBoundsOnlyDeterministicClosedHistory()
      throws Exception {
    var website = new ArrayList<WebLiveChatRepository.CmsConversationSummary>();
    var legacy = new ArrayList<TelegramLiveChatRepository.Session>();
    var tiedNewest = NOW.plusSeconds(1_000);
    website.add(summary(websiteConversation("web-closed-a", "closed", "", 701L, tiedNewest)));
    legacy.add(legacySession(
        "legacy-closed-a", "closed", "", tiedNewest
    ));
    for (var index = 0; index < 25; index += 1) {
      var updatedAt = NOW.plusSeconds(900L - index);
      website.add(summary(websiteConversation(
          "web-closed-%02d".formatted(index), "closed", "", 701L, updatedAt
      )));
      legacy.add(legacySession(
          "legacy-closed-%02d".formatted(index), "closed", "", updatedAt
      ));
    }
    var actionableTime = NOW.minusSeconds(100);
    website.add(summary(websiteConversation(
        "web-active", "active", "", 701L, actionableTime
    )));
    website.add(summary(websiteConversation(
        "web-attention", "needs_attention", "registration_delivery_failed", 701L,
        actionableTime
    )));
    legacy.add(legacySession(
        "legacy-active", "active", "", actionableTime
    ));
    legacy.add(legacySession(
        "legacy-attention", "needs_attention", "registration_delivery_uncertain",
        actionableTime
    ));
    when(websiteRepository.recentConversations(50)).thenReturn(website);
    when(legacyRepository.recentSessions(50)).thenReturn(legacy);

    mvc.perform(get("/api/admin/live-chat").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(54))
        .andExpect(jsonPath("$.sessions[0].id").value("legacy-closed-a"))
        .andExpect(jsonPath("$.sessions[1].id").value("web-closed-a"))
        .andExpect(jsonPath("$.sessions[50].id").value("legacy-active"))
        .andExpect(jsonPath("$.sessions[51].id").value("legacy-attention"))
        .andExpect(jsonPath("$.sessions[52].id").value("web-active"))
        .andExpect(jsonPath("$.sessions[53].id").value("web-attention"));
  }

  @Test
  void oldGenerationTopicCloseRemainsActionableBehindMoreThanFiftyNewerClosedRows()
      throws Exception {
    var website = new ArrayList<WebLiveChatRepository.CmsConversationSummary>();
    for (var index = 0; index < 51; index += 1) {
      website.add(summary(websiteConversation(
          "newer-closed-%02d".formatted(index), "closed", "", 701L,
          NOW.plusSeconds(1_000L - index)
      )));
    }
    var oldTopicClose = new WebLiveChatRepository.Conversation(
        "old-topic-close", "visitor-secret-id", 1L, "-1003425727647", "inquiry-web",
        "ko", "closed", "Website Customer", "website@example.com", "Website inquiry",
        "2026-09", NOW, "", "topic_close", 0L, "", 701L, 704L, 0L,
        NOW.minusSeconds(90_000), NOW.minusSeconds(90_000), NOW.minusSeconds(80_000), NOW
    );
    website.add(summary(oldTopicClose));
    when(websiteRepository.recentConversations(50)).thenReturn(website);
    when(legacyRepository.recentSessions(50)).thenReturn(List.of());

    mvc.perform(get("/api/admin/live-chat").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(51))
        .andExpect(jsonPath("$.sessions[50].id").value("old-topic-close"))
        .andExpect(jsonPath("$.sessions[50].source").value("website"));
  }

  @Test
  void websiteCloseIsResolvedFromTheStoredIdAndNeverTrustsAClientSource() throws Exception {
    var active = websiteConversation("website-id", "active", "", 701L, NOW);
    var closed = websiteConversation("website-id", "closed", "", 701L, NOW.plusSeconds(1));
    when(websiteRepository.conversationById("website-id")).thenReturn(active);
    when(legacyRepository.sessionById("website-id")).thenReturn(null);
    when(websiteService.closeFromCms("website-id")).thenReturn(closed);

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/close")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType("application/json")
            .content("{\"source\":\"telegram_legacy\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.source").value("website"))
        .andExpect(jsonPath("$.session.state").value("closed"));

    verify(websiteService).closeFromCms("website-id");
    verify(legacyService, never()).closeConversation("website-id");
  }

  @Test
  void websiteRegistrationRetryUsesTheStoredAttentionCodeAsTheCasGuard() throws Exception {
    var needsAttention = websiteConversation(
        "website-id", "needs_attention", "registration_delivery_failed", 701L, NOW
    );
    var active = websiteConversation("website-id", "active", "", 701L, NOW.plusSeconds(1));
    when(websiteRepository.conversationById("website-id")).thenReturn(needsAttention);
    when(legacyRepository.sessionById("website-id")).thenReturn(null);
    when(websiteService.retryRegistrationFromCms(
        "website-id", "registration_delivery_failed"
    )).thenReturn(active);

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/retry-delivery")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.source").value("website"))
        .andExpect(jsonPath("$.session.state").value("active"));

    verify(websiteService).retryRegistrationFromCms(
        "website-id", "registration_delivery_failed"
    );
    verify(legacyService, never()).retryUncertainDelivery("website-id");
  }

  @Test
  void websiteVisitorRecoveryTargetsTheExactStoredMessageAndTopicCloseCanRetry() throws Exception {
    var attention = new WebLiveChatRepository.Conversation(
        "website-id", "visitor-secret-id", 3L, "-1003425727647", "inquiry-web", "ko",
        "needs_attention", "Website Customer", "website@example.com", "Website inquiry",
        "2026-09", NOW, "visitor_delivery_uncertain", "visitor_delivery", 41L,
        "client-secret-key", 701L, 704L, 0L, NOW, NOW, NOW, null
    );
    var active = websiteConversation("website-id", "active", "", 701L, NOW.plusSeconds(1));
    when(websiteRepository.conversationById("website-id")).thenReturn(attention);
    when(legacyRepository.sessionById("website-id")).thenReturn(null);
    when(websiteService.confirmVisitorMessageFromCms(
        "website-id", 41L, "visitor_delivery_uncertain"
    )).thenReturn(active);

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/messages/41/confirm-delivered")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.state").value("active"));
    verify(websiteService).confirmVisitorMessageFromCms(
        "website-id", 41L, "visitor_delivery_uncertain"
    );

    var closed = websiteConversation(
        "website-id", "closed", "topic_close_failed", 701L, NOW.plusSeconds(2)
    );
    when(websiteRepository.conversationById("website-id")).thenReturn(closed);
    when(websiteService.retryTopicCloseFromCms("website-id", "topic_close_failed"))
        .thenReturn(websiteConversation("website-id", "closed", "", 701L, NOW.plusSeconds(3)));
    mvc.perform(post("/api/admin/live-chat/sessions/website-id/retry-topic-close")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.state").value("closed"));
  }

  @Test
  void websiteTopicResetUsesTheStoredAttentionCodeAndDoesNotCreateATopic() throws Exception {
    var needsAttention = websiteConversation(
        "website-id", "needs_attention", "topic_creation_uncertain", 0L, NOW
    );
    var opening = websiteConversation("website-id", "opening", "", 0L, NOW.plusSeconds(1));
    when(websiteRepository.conversationById("website-id")).thenReturn(needsAttention);
    when(legacyRepository.sessionById("website-id")).thenReturn(null);
    when(websiteService.resetTopicCreationFromCms(
        "website-id", "topic_creation_uncertain"
    )).thenReturn(opening);

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/reset-topic-creation")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.source").value("website"))
        .andExpect(jsonPath("$.session.state").value("opening"));

    verify(websiteService).resetTopicCreationFromCms(
        "website-id", "topic_creation_uncertain"
    );
    verify(legacyRepository, never()).confirmTopicMissingAndReset("website-id");
  }

  @Test
  void legacyOnlyReconcileActionIsRejectedForAWebsiteConversation() throws Exception {
    when(websiteRepository.conversationById("website-id")).thenReturn(
        websiteConversation("website-id", "needs_attention", "registration_mapping_pending", 701L, NOW)
    );
    when(legacyRepository.sessionById("website-id")).thenReturn(null);

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/reconcile")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.error").value("Reconcile is only available for legacy sessions."));

    verify(legacyRepository, never()).reconcile("website-id");
  }

  @Test
  void legacyCloseEndpointRemainsCompatibleAndReturnsTheCommonDto() throws Exception {
    var active = legacySession("legacy-id", "active", "");
    var closed = legacySession("legacy-id", "closed", "");
    when(websiteRepository.conversationById("legacy-id")).thenReturn(null);
    when(legacyRepository.sessionById("legacy-id")).thenReturn(active);
    when(legacyService.closeConversation("legacy-id")).thenReturn(closed);

    mvc.perform(post("/api/admin/live-chat/sessions/legacy-id/close")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.session.source").value("telegram_legacy"))
        .andExpect(jsonPath("$.session.state").value("closed"));

    verify(legacyService).closeConversation("legacy-id");
    verify(websiteService, never()).closeFromCms("legacy-id");
  }

  @Test
  void actionResolutionReturnsNotFoundAndRejectsCrossSourceIdCollisions() throws Exception {
    mvc.perform(post("/api/admin/live-chat/sessions/missing/close")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("Live-chat session not found."));

    when(websiteRepository.conversationById("shared-id")).thenReturn(
        websiteConversation("shared-id", "active", "", 701L, NOW)
    );
    when(legacyRepository.sessionById("shared-id")).thenReturn(
        legacySession("shared-id", "active", "")
    );

    mvc.perform(post("/api/admin/live-chat/sessions/shared-id/close")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("The live-chat session ID is ambiguous."));

    verify(websiteService, never()).closeFromCms("shared-id");
    verify(legacyService, never()).closeConversation("shared-id");
  }

  @Test
  void adminEndpointsKeepApiKeyProtection() throws Exception {
    mvc.perform(get("/api/admin/live-chat"))
        .andExpect(status().isUnauthorized());
    mvc.perform(post("/api/admin/live-chat/sessions/website-id/close"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void websiteRetryReportsUnavailableConfigurationWithoutLeakingInternals() throws Exception {
    var needsAttention = websiteConversation(
        "website-id", "needs_attention", "registration_delivery_failed", 701L, NOW
    );
    when(websiteRepository.conversationById("website-id")).thenReturn(needsAttention);
    when(legacyRepository.sessionById("website-id")).thenReturn(null);
    when(websiteService.retryRegistrationFromCms(
        "website-id", "registration_delivery_failed"
    )).thenThrow(new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE, "Web live chat is temporarily unavailable."
    ));

    mvc.perform(post("/api/admin/live-chat/sessions/website-id/retry-delivery")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("Web live chat is temporarily unavailable."))
        .andExpect(jsonPath("$.stackTrace").doesNotExist());
  }

  private WebLiveChatRepository.Conversation websiteConversation(
      String id,
      String state,
      String attentionCode,
      long topicThreadId,
      Instant updatedAt
  ) {
    return new WebLiveChatRepository.Conversation(
        id, "visitor-secret-id", 3L, "-1003425727647", "inquiry-web", "ko", state,
        "Website Customer", "website@example.com", "Website inquiry", "2026-09", NOW,
        attentionCode, "", 0L, "client-secret-key", topicThreadId, 704L, 0L,
        NOW, NOW, updatedAt, "closed".equals(state) ? updatedAt : null
    );
  }

  private TelegramLiveChatRepository.Session legacySession(
      String id,
      String state,
      String attentionCode
  ) {
    return legacySession(id, state, attentionCode, NOW.plusSeconds(1));
  }

  private TelegramLiveChatRepository.Session legacySession(
      String id,
      String state,
      String attentionCode,
      Instant updatedAt
  ) {
    return new TelegramLiveChatRepository.Session(
        id, 101L, 202L, "inquiry-legacy", "ko", state, "Legacy Customer",
        "legacy@example.com", "Legacy inquiry", attentionCode, 0L, 0L, "", 702L,
        703L, NOW, updatedAt
    );
  }

  private WebLiveChatRepository.CmsConversationSummary summary(
      WebLiveChatRepository.Conversation conversation
  ) {
    return new WebLiveChatRepository.CmsConversationSummary(conversation, 0L, 0L);
  }
}
