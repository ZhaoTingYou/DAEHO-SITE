package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NotificationPlanner {
  private static final List<String> CUSTOMER_STATUSES = List.of("contacted", "in_progress", "done");
  private static final int TELEGRAM_MESSAGE_LIMIT = 4096;
  private static final Map<String, Integer> TELEGRAM_VARIABLE_LIMITS = Map.ofEntries(
      Map.entry("inquiry_id", 160),
      Map.entry("inquiry_type", 160),
      Map.entry("name", 120),
      Map.entry("organization", 160),
      Map.entry("team", 160),
      Map.entry("phone", 180),
      Map.entry("email", 254),
      Map.entry("quantity", 40),
      Map.entry("due_date", 160),
      Map.entry("use_case", 160),
      Map.entry("message", 1800),
      Map.entry("admin_url", 500)
  );

  private final CmsProperties cmsProperties;
  private final TelegramCredentialService telegramCredentials;
  private final NotificationRepository repository;
  private final NotificationTemplateRenderer renderer;
  private final NotificationTestService notificationTest;

  public NotificationPlanner(
      CmsProperties cmsProperties,
      TelegramCredentialService telegramCredentials,
      NotificationRepository repository,
      NotificationTemplateRenderer renderer,
      NotificationTestService notificationTest
  ) {
    this.cmsProperties = cmsProperties;
    this.telegramCredentials = telegramCredentials;
    this.repository = repository;
    this.renderer = renderer;
    this.notificationTest = notificationTest;
  }

  public Map<String, Object> previewStatusChange(Map<String, Object> inquiry, String nextStatus) {
    var previousStatus = text(inquiry.get("status"));
    var notifications = buildStatusPlans(inquiry, previousStatus, nextStatus).stream()
        .map(this::previewPlan)
        .toList();
    return orderedMap(
        "changed", !previousStatus.equals(nextStatus),
        "previousStatus", previousStatus,
        "nextStatus", nextStatus,
        "notifications", notifications
    );
  }

  public List<Map<String, Object>> queueNewInquiry(Map<String, Object> inquiry) {
    var settings = settings();
    var plans = new ArrayList<Map<String, Object>>();
    plans.add(buildPlan(
        inquiry,
        "",
        "new",
        "",
        "email",
        "internal",
        "new_inquiry",
        "ko",
        text(settings.get("internalEmail")),
        validationBoolean(settings.get("internalEmailEnabled")),
        "internal_new_email_ko",
        text(inquiry.get("id")) + ":new_inquiry:internal:email"
    ));
    var telegramConfiguration = telegramCredentials.current();
    var telegramPlan = buildPlan(
        inquiry,
        "",
        "new",
        "",
        "telegram",
        "internal",
        "new_inquiry",
        "ko",
        text(telegramConfiguration.chatId()),
        validationBoolean(settings.get("telegramEnabled")),
        "internal_new_telegram_ko",
        text(inquiry.get("id")) + ":new_inquiry:internal:telegram"
    );
    if (!telegramConfiguration.configured()) {
      telegramPlan.put("ready", false);
      telegramPlan.put("reason", "Telegram Bot credentials or group Chat ID are not configured.");
    } else if (!telegramCredentials.verified()) {
      telegramPlan.put("ready", false);
      telegramPlan.put("reason", "Send a successful Telegram test from this CMS before enabling notifications.");
    }
    telegramPlan.put(
        "verificationFingerprint",
        telegramConfiguration.configured()
            ? telegramCredentials.fingerprint(telegramConfiguration)
            : ""
    );
    plans.add(telegramPlan);
    return queueEnabled(plans);
  }

  public List<Map<String, Object>> queueStatusChange(
      Map<String, Object> inquiry,
      Map<String, Object> statusEvent
  ) {
    var previousStatus = text(statusEvent.get("previousStatus"));
    var nextStatus = text(statusEvent.get("nextStatus"));
    var statusEventId = text(statusEvent.get("id"));
    return queueEnabled(buildStatusPlans(inquiry, previousStatus, nextStatus, statusEventId));
  }

  public Map<String, Object> health() {
    var settings = settings();
    var kakaoTemplatesReady = CUSTOMER_STATUSES.stream().allMatch(status ->
        repository.getActiveTemplate(templateKey("kakao", status, "ko")) != null
    );
    return orderedMap(
        "settings", settings,
        "kakaoTemplatesReady", kakaoTemplatesReady,
        "telegramTemplateReady", repository.getActiveTemplate("internal_new_telegram_ko") != null
    );
  }

  private List<Map<String, Object>> buildStatusPlans(
      Map<String, Object> inquiry,
      String previousStatus,
      String nextStatus
  ) {
    return buildStatusPlans(inquiry, previousStatus, nextStatus, "");
  }

  private List<Map<String, Object>> buildStatusPlans(
      Map<String, Object> inquiry,
      String previousStatus,
      String nextStatus,
      String statusEventId
  ) {
    if (previousStatus.equals(nextStatus)) {
      return List.of();
    }
    var settings = settings();
    var locale = "en".equals(text(inquiry.get("locale"))) ? "en" : "ko";
    var eventPart = statusEventId.isBlank()
        ? previousStatus + ":" + nextStatus
        : statusEventId;
    var plans = new ArrayList<Map<String, Object>>();
    plans.add(buildPlan(
        inquiry,
        previousStatus,
        nextStatus,
        statusEventId,
        "email",
        "internal",
        "status_changed",
        "ko",
        text(settings.get("internalEmail")),
        validationBoolean(settings.get("internalEmailEnabled")),
        "internal_status_email_ko",
        text(inquiry.get("id")) + ":" + eventPart + ":internal:email"
    ));

    if (!CUSTOMER_STATUSES.contains(nextStatus)) {
      return List.copyOf(plans);
    }

    var email = text(inquiry.get("email"));
    if (!email.isBlank()) {
      plans.add(buildPlan(
          inquiry,
          previousStatus,
          nextStatus,
          statusEventId,
          "email",
          "customer",
          "status_changed",
          locale,
          email,
          validationBoolean(settings.get("customerEmailEnabled")),
          templateKey("email", nextStatus, locale),
          text(inquiry.get("id")) + ":" + eventPart + ":customer:email"
      ));
    }

    var originalPhone = firstNonBlank(inquiry.get("phone"), inquiry.get("contact"));
    if (!originalPhone.isBlank()) {
      var kakaoEnabled = validationBoolean(settings.get("kakaoEnabled"))
          && notificationTest.kakaoVerified();
      var normalizedPhone = normalizeKoreanPhone(originalPhone);
      var recipient = normalizedPhone.isBlank() ? digits(originalPhone) : normalizedPhone;
      var plan = buildPlan(
          inquiry,
          previousStatus,
          nextStatus,
          statusEventId,
          "kakao",
          "customer",
          "status_changed",
          "ko",
          recipient,
          kakaoEnabled,
          templateKey("kakao", nextStatus, "ko"),
          text(inquiry.get("id")) + ":" + eventPart + ":customer:kakao"
      );
      if (normalizedPhone.isBlank()) {
        plan.put("ready", false);
        plan.put("reason", "Kakao notifications require a valid Korean mobile number.");
      }
      plans.add(plan);
    }
    return List.copyOf(plans);
  }

  private Map<String, Object> buildPlan(
      Map<String, Object> inquiry,
      String previousStatus,
      String nextStatus,
      String statusEventId,
      String channel,
      String audience,
      String eventType,
      String locale,
      String recipient,
      boolean enabled,
      String templateKey,
      String dedupeKey
  ) {
    var template = repository.getActiveTemplate(templateKey);
    var latestTemplate = template == null ? repository.getLatestTemplate(templateKey) : template;
    var variables = renderer.variables(
        inquiry,
        previousStatus,
        nextStatus,
        managedStatusLabel(previousStatus, locale),
        managedStatusLabel(nextStatus, locale)
    );
    var renderVariables = "telegram".equals(channel)
        ? boundedTelegramVariables(variables)
        : variables;
    var subject = "";
    var body = "";
    var templateError = "";
    try {
      subject = latestTemplate == null
          ? ""
          : renderer.render(text(latestTemplate.get("subject")), renderVariables);
      body = latestTemplate == null
          ? ""
          : renderer.render(text(latestTemplate.get("body")), renderVariables);
      if ("telegram".equals(channel)) {
        body = boundedTelegramBody(body, variables.getOrDefault("admin_url", ""));
      }
    } catch (IllegalArgumentException error) {
      templateError = error.getMessage();
    }
    var approved = !"kakao".equals(channel)
        || latestTemplate != null
            && "approved".equals(text(latestTemplate.get("approvalStatus")))
            && !text(latestTemplate.get("providerTemplateCode")).isBlank()
            && validationBoolean(latestTemplate.get("isActive"));
    var ready = template != null
        && !recipient.isBlank()
        && approved
        && templateError.isBlank();
    var verificationFingerprint = "kakao".equals(channel) && latestTemplate != null
        ? notificationTest.verificationFingerprint(templateKey, latestTemplate)
        : "";
    var reason = "";
    if (recipient.isBlank()) {
      reason = "Recipient is not configured.";
    } else if (template == null) {
      reason = "An active notification template is not configured.";
    } else if (!templateError.isBlank()) {
      reason = templateError;
    } else if (!approved) {
      reason = "The Kakao template is not approved and active.";
    }
    var providerVariables = "kakao".equals(channel)
        ? Map.of(
            "#{고객명}", variables.getOrDefault("name", ""),
            "#{문의번호}", variables.getOrDefault("inquiry_id", "")
        )
        : Map.<String, String>of();
    return orderedMap(
        "inquiryId", inquiry.get("id"),
        "statusEventId", statusEventId,
        "channel", channel,
        "audience", audience,
        "eventType", eventType,
        "inquiryStatus", nextStatus,
        "locale", locale,
        "recipient", recipient,
        "maskedRecipient", maskRecipient(channel, recipient),
        "subject", subject,
        "renderedBody", body,
        "templateId", latestTemplate == null ? "" : latestTemplate.get("id"),
        "templateKey", templateKey,
        "templateVersion", latestTemplate == null ? 0 : latestTemplate.get("version"),
        "providerTemplateCode", latestTemplate == null ? "" : latestTemplate.get("providerTemplateCode"),
        "kakaoTemplateType", latestTemplate == null ? "basic" : latestTemplate.get("kakaoTemplateType"),
        "providerVariables", providerVariables,
        "verificationFingerprint", verificationFingerprint,
        "enabled", enabled,
        "ready", ready,
        "reason", reason,
        "dedupeKey", dedupeKey
    );
  }

  private List<Map<String, Object>> queueEnabled(List<Map<String, Object>> plans) {
    var jobs = new ArrayList<Map<String, Object>>();
    for (var plan : plans) {
      if (!validationBoolean(plan.get("enabled"))) {
        continue;
      }
      var ready = validationBoolean(plan.get("ready"));
      var job = new LinkedHashMap<String, Object>(plan);
      job.put("status", ready ? "queued" : "needs_attention");
      job.put("lastError", ready ? "" : text(plan.get("reason")));
      jobs.add(repository.createJob(job));
    }
    return List.copyOf(jobs);
  }

  private String boundedTelegramBody(String body, String adminUrl) {
    if (body.codePointCount(0, body.length()) <= TELEGRAM_MESSAGE_LIMIT) {
      return body;
    }
    var suffix = truncateCodePoints("\n\nCMS: " + text(adminUrl), TELEGRAM_MESSAGE_LIMIT - 1);
    var prefixLength = TELEGRAM_MESSAGE_LIMIT
        - suffix.codePointCount(0, suffix.length())
        - 1;
    return truncateCodePoints(body, Math.max(0, prefixLength)) + "…" + suffix;
  }

  private Map<String, String> boundedTelegramVariables(Map<String, String> variables) {
    var bounded = new LinkedHashMap<String, String>(variables);
    TELEGRAM_VARIABLE_LIMITS.forEach((key, maximum) ->
        bounded.put(key, truncateWithEllipsis(variables.getOrDefault(key, ""), maximum))
    );
    return Map.copyOf(bounded);
  }

  private String truncateWithEllipsis(String value, int maximum) {
    var count = value.codePointCount(0, value.length());
    if (count <= maximum) {
      return value;
    }
    return truncateCodePoints(value, Math.max(0, maximum - 1)) + "…";
  }

  private String truncateCodePoints(String value, int maximum) {
    if (maximum <= 0) {
      return "";
    }
    var count = value.codePointCount(0, value.length());
    if (count <= maximum) {
      return value;
    }
    return value.substring(0, value.offsetByCodePoints(0, maximum));
  }

  private Map<String, Object> previewPlan(Map<String, Object> plan) {
    return orderedMap(
        "channel", plan.get("channel"),
        "audience", plan.get("audience"),
        "maskedRecipient", plan.get("maskedRecipient"),
        "subject", plan.get("subject"),
        "renderedBody", plan.get("renderedBody"),
        "enabled", plan.get("enabled"),
        "ready", plan.get("ready"),
        "reason", plan.get("reason")
    );
  }

  private Map<String, Object> settings() {
    return repository.getSettings(cmsProperties.notifyTo());
  }

  private String templateKey(String channel, String status, String locale) {
    return "customer_" + status + "_" + channel + "_" + locale;
  }

  private String managedStatusLabel(String status, String locale) {
    if (status.isBlank()) {
      return "";
    }
    var definition = repository.getInquiryStatus(status);
    if (definition == null) {
      return "";
    }
    return "en".equals(locale)
        ? firstNonBlank(definition.get("labelEn"), definition.get("labelKo"))
        : text(definition.get("labelKo"));
  }

  private String normalizeKoreanPhone(String value) {
    var normalized = digits(value);
    if (normalized.startsWith("0082")) {
      normalized = normalized.substring(2);
    }
    if (normalized.startsWith("82")) {
      normalized = "0" + normalized.substring(2);
    }
    return normalized.matches("^01[016789][0-9]{7,8}$") ? normalized : "";
  }

  private String maskRecipient(String channel, String recipient) {
    if (recipient.isBlank()) {
      return "";
    }
    if ("email".equals(channel)) {
      var at = recipient.indexOf('@');
      if (at <= 1) {
        return "***" + (at >= 0 ? recipient.substring(at) : "");
      }
      return recipient.substring(0, 1) + "***" + recipient.substring(at);
    }
    return recipient.length() <= 4
        ? "****"
        : "*".repeat(recipient.length() - 4) + recipient.substring(recipient.length() - 4);
  }

  private boolean validationBoolean(Object value) {
    return value instanceof Boolean bool && bool;
  }

  private String digits(String value) {
    return value == null ? "" : value.replaceAll("[^0-9]", "");
  }

  private String firstNonBlank(Object... values) {
    for (var value : values) {
      var text = text(value);
      if (!text.isBlank()) {
        return text;
      }
    }
    return "";
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  private LinkedHashMap<String, Object> orderedMap(Object... values) {
    var map = new LinkedHashMap<String, Object>();
    for (var index = 0; index < values.length; index += 2) {
      map.put(String.valueOf(values[index]), values[index + 1]);
    }
    return map;
  }
}
