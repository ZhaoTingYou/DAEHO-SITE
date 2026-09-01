package com.daeho.cms.service;

import com.daeho.cms.error.ValidationFailedException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WebLiveChatInputValidator {
  private static final Duration MINIMUM_FORM_AGE = Duration.ofMillis(1200);
  private static final Duration MAXIMUM_FORM_AGE = Duration.ofHours(24);

  public StartInput validateStart(Map<String, Object> body, Duration formAge) {
    var issues = new ArrayList<Map<String, String>>();
    var locale = value(body, "locale").toLowerCase(Locale.ROOT);
    var name = value(body, "name");
    var contact = value(body, "contact");
    var content = value(body, "content");
    var consentVersion = value(body, "consentVersion");
    var clientMessageKey = value(body, "clientMessageKey");

    if (!List.of("ko", "en").contains(locale)) {
      issues.add(issue("locale", "Expected locale to be ko or en."));
    }
    validateText(name, "name", 2, 80, issues);
    validateText(contact, "contact", 5, 120, issues);
    validateText(content, "content", 2, 2000, issues);
    if (!Boolean.TRUE.equals(body == null ? null : body.get("consent"))) {
      issues.add(issue("consent", "Consent is required."));
    }
    validateText(consentVersion, "consentVersion", 1, 120, issues);
    validateText(clientMessageKey, "clientMessageKey", 20, 100, issues);
    if (!value(body, "companyWebsite").isBlank()) {
      issues.add(issue("companyWebsite", "Expected companyWebsite to be blank."));
    }
    if (formAge == null || formAge.compareTo(MINIMUM_FORM_AGE) < 0 || formAge.compareTo(MAXIMUM_FORM_AGE) > 0) {
      issues.add(issue("formStartedAt", "Expected form age to be between 1200ms and 24 hours."));
    }
    throwIfInvalid(issues);
    return new StartInput(locale, name, contact, content, consentVersion, clientMessageKey);
  }

  public MessageInput validateMessage(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var message = value(body, "body");
    var clientMessageKey = value(body, "clientMessageKey");
    validateText(message, "body", 1, 2000, issues);
    validateText(clientMessageKey, "clientMessageKey", 20, 100, issues);
    throwIfInvalid(issues);
    return new MessageInput(message, clientMessageKey);
  }

  private static void validateText(String value, String path, int minimum, int maximum,
      List<Map<String, String>> issues) {
    var length = value.codePointCount(0, value.length());
    if (length < minimum || length > maximum || containsControlCharacter(value)) {
      issues.add(issue(path, "Expected " + path + " to contain " + minimum + " to " + maximum + " characters."));
    }
  }

  private static boolean containsControlCharacter(String value) {
    return value.codePoints().anyMatch(character -> Character.isISOControl(character));
  }

  private static void throwIfInvalid(List<Map<String, String>> issues) {
    if (!issues.isEmpty()) {
      throw new ValidationFailedException(List.copyOf(issues));
    }
  }

  private static Map<String, String> issue(String path, String message) {
    return Map.of("path", path, "message", message);
  }

  private static String value(Map<String, Object> body, String key) {
    var raw = body == null ? null : body.get(key);
    return raw == null ? "" : raw.toString().trim();
  }

  public record StartInput(
      String locale, String name, String contact, String content,
      String consentVersion, String clientMessageKey
  ) {}

  public record MessageInput(String body, String clientMessageKey) {}
}
