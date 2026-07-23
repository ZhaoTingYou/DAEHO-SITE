package com.daeho.cms.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class RequestValidation {
  public static final List<String> LOCALES = List.of("ko", "en");
  public static final List<String> INQUIRY_STATUSES = List.of("new", "contacted", "in_progress", "done", "spam");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

  public ValidatedRequest pagePayload(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("section", "site");
    payload.putIfAbsent("sortOrder", 0);
    payload.putIfAbsent("content", Map.of());
    payload.putIfAbsent("seo", Map.of());
    requireText(payload, "section", issues);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest newsPayload(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("imagePath", "");
    payload.putIfAbsent("publishedAt", "");
    payload.putIfAbsent("isFeatured", false);
    payload.putIfAbsent("isVisible", true);
    payload.putIfAbsent("sortOrder", 0);
    payload.putIfAbsent("translations", Map.of());
    requireText(payload, "category", issues);
    validateTranslations(payload, "translations", issues, true);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest collectionPayload(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("sportCategory", "");
    payload.putIfAbsent("imagePath", "");
    payload.putIfAbsent("gallery", List.of());
    payload.putIfAbsent("specs", Map.of());
    payload.putIfAbsent("isVisible", true);
    payload.putIfAbsent("sortOrder", 0);
    payload.putIfAbsent("translations", Map.of());
    requireText(payload, "category", issues);
    validateTranslations(payload, "translations", issues, true);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest contactInquiry(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("locale", "ko");
    payload.putIfAbsent("organization", "");
    payload.putIfAbsent("type", "");
    payload.putIfAbsent("message", "");
    payload.putIfAbsent("pagePath", "");
    requireText(payload, "name", issues);
    requireText(payload, "contact", issues);
    requireText(payload, "email", issues);
    validateEmail(payload.get("email"), "email", issues);
    validateLocale(payload.get("locale"), "locale", issues);
    maxLength(payload, "name", 120, issues);
    maxLength(payload, "contact", 180, issues);
    maxLength(payload, "email", 254, issues);
    maxLength(payload, "organization", 160, issues);
    maxLength(payload, "type", 160, issues);
    maxLength(payload, "message", 3000, issues);
    maxLength(payload, "pagePath", 300, issues);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest golfInquiry(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("locale", "ko");
    payload.putIfAbsent("due", "");
    payload.putIfAbsent("team", "");
    payload.putIfAbsent("use", "");
    payload.putIfAbsent("message", "");
    payload.putIfAbsent("selectedHead", "");
    payload.putIfAbsent("selectedShaft", "");
    payload.putIfAbsent("selectedStyle", "");
    payload.putIfAbsent("engravingSample", "");
    payload.putIfAbsent("pagePath", "");
    requireText(payload, "name", issues);
    requireText(payload, "contact", issues);
    validateLocale(payload.get("locale"), "locale", issues);
    maxLength(payload, "name", 120, issues);
    maxLength(payload, "contact", 180, issues);
    maxLength(payload, "due", 160, issues);
    maxLength(payload, "team", 160, issues);
    maxLength(payload, "use", 160, issues);
    maxLength(payload, "selectedHead", 160, issues);
    maxLength(payload, "selectedShaft", 160, issues);
    maxLength(payload, "selectedStyle", 160, issues);
    maxLength(payload, "engravingSample", 300, issues);
    maxLength(payload, "message", 3000, issues);
    maxLength(payload, "pagePath", 300, issues);
    var quantity = payload.get("quantity");
    if (quantity != null && !stringValue(quantity).isBlank()) {
      var parsed = intValue(quantity, -1);
      if (parsed <= 0 || parsed > 10000) {
        issues.add(issue("quantity", "Expected a positive integer up to 10000."));
      } else {
        payload.put("quantity", parsed);
      }
    } else {
      payload.put("quantity", null);
    }
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest inquiryStatus(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var status = stringValue(body.get("status"));
    if (!INQUIRY_STATUSES.contains(status)) {
      issues.add(issue("status", "Invalid inquiry status."));
    }
    return new ValidatedRequest(Map.of("status", status), issues);
  }

  public ValidatedRequest mediaPayload(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("mimeType", "");
    payload.putIfAbsent("sizeBytes", 0);
    payload.putIfAbsent("altKo", "");
    payload.putIfAbsent("altEn", "");
    payload.putIfAbsent("storageProvider", "local");
    payload.putIfAbsent("storageKey", "");
    requireText(payload, "filename", issues);
    requireText(payload, "path", issues);
    requireText(payload, "url", issues);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest mediaUpdate(Map<String, Object> body) {
    return new ValidatedRequest(Map.of(
        "altKo", stringValue(body.get("altKo")),
        "altEn", stringValue(body.get("altEn"))
    ), List.of());
  }

  public String localeOrDefault(String value) {
    return LOCALES.contains(value) ? value : "ko";
  }

  public String stringValue(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public int intValue(Object value, int fallback) {
    if (value instanceof Number number) {
      return number.intValue();
    }
    try {
      return Integer.parseInt(stringValue(value));
    } catch (NumberFormatException error) {
      return fallback;
    }
  }

  public long longValue(Object value, long fallback) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    try {
      return Long.parseLong(stringValue(value));
    } catch (NumberFormatException error) {
      return fallback;
    }
  }

  public boolean booleanValue(Object value, boolean fallback) {
    if (value instanceof Boolean bool) {
      return bool;
    }
    if (value instanceof Number number) {
      return number.intValue() != 0;
    }
    var text = stringValue(value);
    if (text.equalsIgnoreCase("true") || text.equals("1")) {
      return true;
    }
    if (text.equalsIgnoreCase("false") || text.equals("0")) {
      return false;
    }
    return fallback;
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> objectValue(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  @SuppressWarnings("unchecked")
  public List<Object> arrayValue(Object value) {
    return value instanceof List<?> list ? (List<Object>) list : List.of();
  }

  private Map<String, Object> mutableCopy(Map<String, Object> body) {
    return new java.util.LinkedHashMap<>(body == null ? Map.of() : body);
  }

  private void validateTranslations(Map<String, Object> payload, String key, List<Map<String, String>> issues, boolean requireTitle) {
    var translations = objectValue(payload.get(key));
    for (var locale : LOCALES) {
      var translation = objectValue(translations.get(locale));
      if (!translation.isEmpty() && requireTitle && stringValue(translation.get("title")).isBlank()) {
        issues.add(issue(key + "." + locale + ".title", "Expected a non-empty title."));
      }
    }
  }

  private void requireText(Map<String, Object> payload, String key, List<Map<String, String>> issues) {
    if (stringValue(payload.get(key)).isBlank()) {
      issues.add(issue(key, "Expected a non-empty value."));
    }
  }

  private void validateLocale(Object value, String path, List<Map<String, String>> issues) {
    if (!LOCALES.contains(stringValue(value))) {
      issues.add(issue(path, "Expected locale to be ko or en."));
    }
  }

  private void validateEmail(Object value, String path, List<Map<String, String>> issues) {
    var email = stringValue(value);
    if (!email.isBlank() && !EMAIL_PATTERN.matcher(email).matches()) {
      issues.add(issue(path, "Expected a valid email address."));
    }
  }

  private void maxLength(Map<String, Object> payload, String key, int maxLength, List<Map<String, String>> issues) {
    if (stringValue(payload.get(key)).length() > maxLength) {
      issues.add(issue(key, "Expected at most " + maxLength + " characters."));
    }
  }

  private Map<String, String> issue(String path, String message) {
    return Map.of("path", path, "message", message);
  }

  public record ValidatedRequest(Map<String, Object> data, List<Map<String, String>> issues) {
    public boolean success() {
      return issues.isEmpty();
    }
  }
}
