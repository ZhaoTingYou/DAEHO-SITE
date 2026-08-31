package com.daeho.cms.service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class RequestValidation {
  public static final List<String> LOCALES = List.of("ko", "en");
  public static final List<String> COLLECTION_CATEGORIES = List.of("champion", "bespoke");
  private static final List<String> REQUIRED_TELEGRAM_VARIABLES = List.of(
      "inquiry_id",
      "inquiry_type",
      "name",
      "organization",
      "team",
      "phone",
      "email",
      "quantity",
      "due_date",
      "use_case",
      "message",
      "admin_url"
  );
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
  private static final Pattern INQUIRY_STATUS_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{0,31}$");
  private static final Pattern TEMPLATE_VARIABLE_PATTERN = Pattern.compile("\\{\\{\\s*([^{}]+?)\\s*}}");
  private static final int TELEGRAM_TEMPLATE_LITERAL_LIMIT = 200;

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
    payload.putIfAbsent("mobileImagePath", "");
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
    if (!COLLECTION_CATEGORIES.contains(stringValue(payload.get("category")))) {
      issues.add(issue("category", "Expected Collection category to be champion or bespoke."));
    }
    validateTranslations(payload, "translations", issues, true);
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest contactInquiry(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("locale", "ko");
    payload.putIfAbsent("organization", "");
    normalizeInquiryContacts(payload);
    payload.putIfAbsent("type", "");
    payload.putIfAbsent("message", "");
    payload.putIfAbsent("pagePath", "");
    requireText(payload, "name", issues);
    requireInquiryContact(payload, issues);
    validateEmail(payload.get("email"), "email", issues);
    validateLocale(payload.get("locale"), "locale", issues);
    maxLength(payload, "name", 120, issues);
    maxLength(payload, "phone", 180, issues);
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
    normalizeInquiryContacts(payload);
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
    requireInquiryContact(payload, issues);
    validateEmail(payload.get("email"), "email", issues);
    validateLocale(payload.get("locale"), "locale", issues);
    maxLength(payload, "name", 120, issues);
    maxLength(payload, "phone", 180, issues);
    maxLength(payload, "email", 254, issues);
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
    var expectedStatus = stringValue(body.get("expectedStatus"));
    if (!INQUIRY_STATUS_PATTERN.matcher(status).matches()) {
      issues.add(issue("status", "Invalid inquiry status."));
    }
    if (!expectedStatus.isBlank() && !INQUIRY_STATUS_PATTERN.matcher(expectedStatus).matches()) {
      issues.add(issue("expectedStatus", "Invalid expected inquiry status."));
    }
    return new ValidatedRequest(Map.of(
        "status", status,
        "expectedStatus", expectedStatus
    ), issues);
  }

  public ValidatedRequest inquiryStatusDefinition(Map<String, Object> body, boolean requireCode) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("code", "");
    payload.putIfAbsent("labelKo", "");
    payload.putIfAbsent("labelEn", "");
    payload.putIfAbsent("labelZh", "");
    payload.putIfAbsent("color", "slate");
    payload.putIfAbsent("sortOrder", 0);
    payload.putIfAbsent("isActive", true);
    payload.putIfAbsent("expectedUpdatedAt", "");

    var code = stringValue(payload.get("code"));
    if (requireCode && !INQUIRY_STATUS_PATTERN.matcher(code).matches()) {
      issues.add(issue("code", "Use lowercase letters, numbers, and underscores (maximum 32 characters)."));
    }
    requireText(payload, "labelKo", issues);
    maxLength(payload, "labelKo", 80, issues);
    maxLength(payload, "labelEn", 80, issues);
    maxLength(payload, "labelZh", 80, issues);

    var color = stringValue(payload.get("color"));
    if (!List.of("slate", "blue", "amber", "green", "red", "purple").contains(color)) {
      issues.add(issue("color", "Invalid inquiry status color."));
    }
    var sortOrder = intValue(payload.get("sortOrder"), -1);
    if (sortOrder < 0 || sortOrder > 10000) {
      issues.add(issue("sortOrder", "Expected a number from 0 to 10000."));
    }
    if (!requireCode) {
      requireText(payload, "expectedUpdatedAt", issues);
      maxLength(payload, "expectedUpdatedAt", 80, issues);
      var expectedUpdatedAt = stringValue(payload.get("expectedUpdatedAt"));
      if (!expectedUpdatedAt.isBlank()) {
        try {
          OffsetDateTime.parse(expectedUpdatedAt);
        } catch (DateTimeParseException exception) {
          issues.add(issue("expectedUpdatedAt", "Expected an ISO-8601 timestamp with an offset."));
        }
      }
    }

    payload.put("code", code);
    payload.put("labelKo", stringValue(payload.get("labelKo")));
    payload.put("labelEn", stringValue(payload.get("labelEn")));
    payload.put("labelZh", stringValue(payload.get("labelZh")));
    payload.put("color", color);
    payload.put("sortOrder", sortOrder);
    payload.put("isActive", booleanValue(payload.get("isActive"), true));
    payload.put("expectedUpdatedAt", stringValue(payload.get("expectedUpdatedAt")));
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest notificationSettings(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    payload.putIfAbsent("internalEmail", "");
    payload.putIfAbsent("internalEmailEnabled", false);
    payload.putIfAbsent("customerEmailEnabled", false);
    payload.putIfAbsent("kakaoEnabled", false);
    payload.putIfAbsent("telegramEnabled", false);
    payload.putIfAbsent("telegramBotToken", "");
    payload.putIfAbsent("telegramChatId", "");
    payload.putIfAbsent("clearTelegramBotToken", false);
    validateEmail(payload.get("internalEmail"), "internalEmail", issues);
    if (booleanValue(payload.get("internalEmailEnabled"), false)
        && stringValue(payload.get("internalEmail")).isBlank()) {
      issues.add(issue("internalEmail", "Internal email is required when internal notifications are enabled."));
    }
    maxLength(payload, "internalEmail", 254, issues);
    maxLength(payload, "telegramBotToken", 512, issues);
    maxLength(payload, "telegramChatId", 80, issues);
    if (booleanValue(payload.get("telegramEnabled"), false)
        && stringValue(payload.get("telegramChatId")).isBlank()) {
      issues.add(issue("telegramChatId", "Telegram Chat ID is required when Telegram notifications are enabled."));
    }
    payload.put("internalEmailEnabled", booleanValue(payload.get("internalEmailEnabled"), false));
    payload.put("customerEmailEnabled", booleanValue(payload.get("customerEmailEnabled"), false));
    payload.put("kakaoEnabled", booleanValue(payload.get("kakaoEnabled"), false));
    payload.put("telegramEnabled", booleanValue(payload.get("telegramEnabled"), false));
    payload.put("telegramBotToken", stringValue(payload.get("telegramBotToken")));
    payload.put("telegramChatId", stringValue(payload.get("telegramChatId")));
    payload.put("clearTelegramBotToken", booleanValue(payload.get("clearTelegramBotToken"), false));
    return new ValidatedRequest(payload, issues);
  }

  public ValidatedRequest notificationTemplate(Map<String, Object> body, String channel) {
    var issues = new ArrayList<Map<String, String>>();
    var payload = mutableCopy(body);
    var approvalStatus = stringValue(payload.get("approvalStatus"));
    var normalizedChannel = stringValue(channel);
    payload.putIfAbsent("subject", "");
    payload.putIfAbsent("body", "");
    payload.putIfAbsent("providerTemplateCode", "");
    payload.putIfAbsent("kakaoTemplateType", "basic");
    payload.putIfAbsent("isActive", false);
    if ("email".equals(normalizedChannel)) {
      requireText(payload, "subject", issues);
      requireText(payload, "body", issues);
    }
    if ("telegram".equals(normalizedChannel)) {
      requireText(payload, "body", issues);
      if (booleanValue(payload.get("isActive"), false)) {
        var templateBody = stringValue(payload.get("body"));
        var missingVariables = REQUIRED_TELEGRAM_VARIABLES.stream()
            .filter(variable -> !containsTemplateVariable(templateBody, variable))
            .toList();
        if (!missingVariables.isEmpty()) {
          issues.add(issue(
              "body",
              "Active Telegram templates must include: " + String.join(", ", missingVariables) + "."
          ));
        }
        var duplicateVariables = REQUIRED_TELEGRAM_VARIABLES.stream()
            .filter(variable -> countTemplateVariable(templateBody, variable) > 1)
            .toList();
        if (!duplicateVariables.isEmpty()) {
          issues.add(issue(
              "body",
              "Active Telegram templates must use each required variable once: "
                  + String.join(", ", duplicateVariables) + "."
          ));
        }
        var extraVariables = templateVariables(templateBody).stream()
            .filter(variable -> !REQUIRED_TELEGRAM_VARIABLES.contains(variable))
            .distinct()
            .toList();
        if (!extraVariables.isEmpty()) {
          issues.add(issue(
              "body",
              "Active Telegram templates only support the required variables: "
                  + String.join(", ", extraVariables) + "."
          ));
        }
        var literal = TEMPLATE_VARIABLE_PATTERN.matcher(templateBody).replaceAll("");
        if (literal.codePointCount(0, literal.length()) > TELEGRAM_TEMPLATE_LITERAL_LIMIT) {
          issues.add(issue(
              "body",
              "Active Telegram template labels and spacing must use at most 200 characters."
          ));
        }
      }
      payload.put("subject", "");
      payload.put("providerTemplateCode", "");
    }
    var kakaoTemplateType = stringValue(payload.get("kakaoTemplateType"));
    if ("kakao".equals(normalizedChannel)) {
      requireText(payload, "providerTemplateCode", issues);
      payload.put("subject", "");
      payload.put("body", "");
      kakaoTemplateType = "basic";
    } else {
      kakaoTemplateType = "basic";
    }
    if (!List.of("draft", "pending", "approved").contains(approvalStatus)) {
      issues.add(issue("approvalStatus", "Expected draft, pending, or approved."));
    }
    maxLength(payload, "subject", 300, issues);
    maxLength(payload, "body", 4000, issues);
    maxLength(payload, "providerTemplateCode", 160, issues);
    payload.put("approvalStatus", approvalStatus);
    payload.put("kakaoTemplateType", kakaoTemplateType);
    payload.put("isActive", booleanValue(payload.get("isActive"), false));
    return new ValidatedRequest(payload, issues);
  }

  private boolean containsTemplateVariable(String template, String variable) {
    return countTemplateVariable(template, variable) > 0;
  }

  private long countTemplateVariable(String template, String variable) {
    return templateVariables(template).stream().filter(variable::equals).count();
  }

  private List<String> templateVariables(String template) {
    var variables = new ArrayList<String>();
    var matcher = TEMPLATE_VARIABLE_PATTERN.matcher(template);
    while (matcher.find()) {
      variables.add(matcher.group(1).trim());
    }
    return List.copyOf(variables);
  }

  public ValidatedRequest notificationTest(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var channel = stringValue(body.get("channel"));
    var recipient = stringValue(body.get("recipient"));
    var templateKey = stringValue(body.get("templateKey"));
    var customerName = stringValue(body.get("customerName"));
    var inquiryNumber = stringValue(body.get("inquiryNumber"));
    if (!List.of("email", "kakao", "telegram").contains(channel)) {
      issues.add(issue("channel", "Expected email, kakao, or telegram."));
    }
    if (recipient.isBlank() && !"telegram".equals(channel)) {
      issues.add(issue("recipient", "Recipient is required."));
    } else if ("email".equals(channel)) {
      validateEmail(recipient, "recipient", issues);
    }
    if (templateKey.isBlank()) {
      issues.add(issue("templateKey", "Template key is required."));
    }
    if ("kakao".equals(channel)) {
      if (customerName.isBlank()) {
        issues.add(issue("customerName", "Customer name is required for a Kakao test."));
      }
      if (inquiryNumber.isBlank()) {
        issues.add(issue("inquiryNumber", "Inquiry number is required for a Kakao test."));
      }
    }
    if (customerName.length() > 120) {
      issues.add(issue("customerName", "Expected at most 120 characters."));
    }
    if (inquiryNumber.length() > 160) {
      issues.add(issue("inquiryNumber", "Expected at most 160 characters."));
    }
    return new ValidatedRequest(Map.of(
        "channel", channel,
        "recipient", recipient,
        "templateKey", templateKey,
        "customerName", customerName,
        "inquiryNumber", inquiryNumber
    ), issues);
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

  private void normalizeInquiryContacts(Map<String, Object> payload) {
    var phone = stringValue(payload.get("phone"));
    if (phone.isBlank()) {
      phone = stringValue(payload.get("contact"));
    }
    payload.put("phone", phone);
    payload.put("contact", phone);
    payload.put("email", stringValue(payload.get("email")));
  }

  private void requireInquiryContact(Map<String, Object> payload, List<Map<String, String>> issues) {
    if (stringValue(payload.get("phone")).isBlank() && stringValue(payload.get("email")).isBlank()) {
      issues.add(issue("contact", "Expected at least one email address or phone number."));
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
