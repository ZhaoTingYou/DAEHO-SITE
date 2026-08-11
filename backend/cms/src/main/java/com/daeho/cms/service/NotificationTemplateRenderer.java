package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class NotificationTemplateRenderer {
  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([^{}]+)}}");
  private static final Set<String> ALLOWED_VARIABLES = Set.of(
      "inquiry_id",
      "source",
      "locale",
      "name",
      "phone",
      "email",
      "organization",
      "inquiry_type",
      "team",
      "quantity",
      "due_date",
      "use_case",
      "message",
      "selected_head",
      "selected_shaft",
      "selected_style",
      "engraving_sample",
      "page_path",
      "received_at",
      "previous_status",
      "previous_status_label",
      "status",
      "status_label",
      "admin_url"
  );

  private final NotificationProperties properties;

  public NotificationTemplateRenderer(NotificationProperties properties) {
    this.properties = properties;
  }

  public Map<String, String> variables(
      Map<String, Object> inquiry,
      String previousStatus,
      String nextStatus
  ) {
    var locale = text(inquiry.get("locale")).equals("en") ? "en" : "ko";
    return variables(
        inquiry,
        previousStatus,
        nextStatus,
        statusLabel(previousStatus, locale),
        statusLabel(nextStatus, locale)
    );
  }

  public Map<String, String> variables(
      Map<String, Object> inquiry,
      String previousStatus,
      String nextStatus,
      String previousStatusLabel,
      String nextStatusLabel
  ) {
    var locale = text(inquiry.get("locale")).equals("en") ? "en" : "ko";
    var configuration = inquiry.get("configuration") instanceof Map<?, ?> map
        ? map
        : Map.of();
    var values = new LinkedHashMap<String, String>();
    values.put("inquiry_id", text(inquiry.get("id")));
    values.put("source", text(inquiry.get("source")));
    values.put("locale", text(inquiry.get("locale")));
    values.put("name", text(inquiry.get("name")));
    values.put("phone", firstNonBlank(inquiry.get("phone"), inquiry.get("contact")));
    values.put("email", text(inquiry.get("email")));
    values.put("organization", text(inquiry.get("organization")));
    values.put("inquiry_type", text(inquiry.get("inquiryType")));
    values.put("team", text(inquiry.get("team")));
    values.put("quantity", text(inquiry.get("quantity")));
    values.put("due_date", text(inquiry.get("dueDate")));
    values.put("use_case", text(inquiry.get("useCase")));
    values.put("message", text(inquiry.get("message")));
    values.put("selected_head", text(configuration.get("selectedHead")));
    values.put("selected_shaft", text(configuration.get("selectedShaft")));
    values.put("selected_style", text(configuration.get("selectedStyle")));
    values.put("engraving_sample", text(configuration.get("engravingSample")));
    values.put("page_path", text(inquiry.get("pagePath")));
    values.put("received_at", text(inquiry.get("createdAt")));
    values.put("previous_status", text(previousStatus));
    values.put("previous_status_label", firstNonBlank(previousStatusLabel, statusLabel(previousStatus, locale)));
    values.put("status", text(nextStatus));
    values.put("status_label", firstNonBlank(nextStatusLabel, statusLabel(nextStatus, locale)));
    values.put(
        "admin_url",
        properties.normalizedAdminBaseUrl() + "/inquiries/" + text(inquiry.get("id"))
    );
    return values;
  }

  public String render(String template, Map<String, String> variables) {
    var source = template == null ? "" : template;
    var matcher = PLACEHOLDER.matcher(source);
    var output = new StringBuffer();
    while (matcher.find()) {
      var key = matcher.group(1).trim();
      if (!ALLOWED_VARIABLES.contains(key)) {
        throw new IllegalArgumentException("Unsupported notification template variable: " + key);
      }
      matcher.appendReplacement(output, java.util.regex.Matcher.quoteReplacement(variables.getOrDefault(key, "")));
    }
    matcher.appendTail(output);
    return output.toString();
  }

  public List<String> validateVariables(String template) {
    var unsupported = new ArrayList<String>();
    var matcher = PLACEHOLDER.matcher(template == null ? "" : template);
    while (matcher.find()) {
      var key = matcher.group(1).trim();
      if (!ALLOWED_VARIABLES.contains(key) && !unsupported.contains(key)) {
        unsupported.add(key);
      }
    }
    return List.copyOf(unsupported);
  }

  public Set<String> allowedVariables() {
    return ALLOWED_VARIABLES;
  }

  private String statusLabel(String status, String locale) {
    if ("en".equals(locale)) {
      return switch (text(status)) {
        case "new" -> "New";
        case "contacted" -> "Contacted";
        case "in_progress" -> "In progress";
        case "done" -> "Completed";
        case "spam" -> "Spam";
        default -> "";
      };
    }
    return switch (text(status)) {
      case "new" -> "신규";
      case "contacted" -> "연락 완료";
      case "in_progress" -> "진행 중";
      case "done" -> "처리 완료";
      case "spam" -> "스팸";
      default -> "";
    };
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
}
