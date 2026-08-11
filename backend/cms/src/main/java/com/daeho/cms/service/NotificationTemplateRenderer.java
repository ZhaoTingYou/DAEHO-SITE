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
      "name",
      "phone",
      "email",
      "organization",
      "inquiry_type",
      "message",
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
    var values = new LinkedHashMap<String, String>();
    values.put("inquiry_id", text(inquiry.get("id")));
    values.put("name", text(inquiry.get("name")));
    values.put("phone", firstNonBlank(inquiry.get("phone"), inquiry.get("contact")));
    values.put("email", text(inquiry.get("email")));
    values.put("organization", text(inquiry.get("organization")));
    values.put("inquiry_type", text(inquiry.get("inquiryType")));
    values.put("message", text(inquiry.get("message")));
    values.put("previous_status", text(previousStatus));
    values.put("previous_status_label", statusLabel(previousStatus, locale));
    values.put("status", text(nextStatus));
    values.put("status_label", statusLabel(nextStatus, locale));
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
