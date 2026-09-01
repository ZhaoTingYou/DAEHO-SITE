package com.daeho.cms.service;

import org.springframework.stereotype.Component;

@Component
public class TelegramLiveChatFlow {
  public static final String AWAITING_CONSENT = "awaiting_consent";
  public static final String AWAITING_NAME = "awaiting_name";
  public static final String AWAITING_CONTACT = "awaiting_contact";
  public static final String AWAITING_CONTENT = "awaiting_content";
  public static final String ACTIVE = "active";
  public static final String CLOSED = "closed";

  public Decision decide(Session current, Input input) {
    var session = current == null ? Session.empty() : current;
    if (input.kind() == InputKind.START) {
      if (ACTIVE.equals(session.state())) {
        return new Decision(session, Action.ALREADY_ACTIVE, false, false);
      }
      return new Decision(
          new Session(AWAITING_CONSENT, locale(input.value()), "", ""),
          Action.SHOW_CONSENT,
          false,
          false
      );
    }
    if (input.kind() == InputKind.CONSENT) {
      if (!AWAITING_CONSENT.equals(session.state())) {
        return new Decision(session, Action.REPEAT_CURRENT_PROMPT, false, false);
      }
      if (!"yes".equals(input.value())) {
        return new Decision(
            new Session(CLOSED, session.locale(), "", ""),
            Action.CONSENT_DECLINED,
            false,
            false
        );
      }
      return new Decision(
          new Session(AWAITING_NAME, session.locale(), "", ""),
          Action.ASK_NAME,
          false,
          false
      );
    }
    if (AWAITING_NAME.equals(session.state())) {
      var name = normalized(input.value());
      if (input.kind() != InputKind.TEXT || name.length() < 2 || name.length() > 80) {
        return new Decision(session, Action.INVALID_NAME, false, false);
      }
      return new Decision(
          new Session(AWAITING_CONTACT, session.locale(), name, ""),
          Action.ASK_CONTACT,
          false,
          false
      );
    }
    if (AWAITING_CONTACT.equals(session.state())) {
      var contact = normalized(input.value());
      if ((input.kind() != InputKind.TEXT && input.kind() != InputKind.SHARED_PHONE)
          || !validContact(contact)) {
        return new Decision(session, Action.INVALID_CONTACT, false, false);
      }
      return new Decision(
          new Session(AWAITING_CONTENT, session.locale(), session.customerName(), contact),
          Action.ASK_CONTENT,
          false,
          false
      );
    }
    if (AWAITING_CONTENT.equals(session.state())) {
      var content = normalized(input.value());
      if (input.kind() != InputKind.TEXT || content.isBlank() || content.length() > 2000) {
        return new Decision(session, Action.INVALID_CONTENT, false, false);
      }
      return new Decision(
          new Session(ACTIVE, session.locale(), session.customerName(), session.customerContact()),
          Action.OPEN_CONVERSATION,
          true,
          false
      );
    }
    if (ACTIVE.equals(session.state())) {
      return new Decision(session, Action.FORWARD_MESSAGE, false, true);
    }
    return new Decision(session, Action.RESTART_REQUIRED, false, false);
  }

  private boolean validContact(String value) {
    if (value.length() < 5 || value.length() > 254) {
      return false;
    }
    if (value.contains("@")) {
      return value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }
    var digits = value.replaceAll("[^0-9]", "");
    return digits.length() >= 7 && digits.length() <= 15;
  }

  private String locale(String value) {
    return "en".equalsIgnoreCase(normalized(value)) ? "en" : "ko";
  }

  private String normalized(String value) {
    return value == null ? "" : value.trim();
  }

  public enum Action {
    SHOW_CONSENT,
    ASK_NAME,
    ASK_CONTACT,
    ASK_CONTENT,
    OPEN_CONVERSATION,
    FORWARD_MESSAGE,
    ALREADY_ACTIVE,
    CONSENT_DECLINED,
    INVALID_NAME,
    INVALID_CONTACT,
    INVALID_CONTENT,
    REPEAT_CURRENT_PROMPT,
    RESTART_REQUIRED
  }

  public enum InputKind {
    START,
    CONSENT,
    TEXT,
    SHARED_PHONE
  }

  public record Session(
      String state,
      String locale,
      String customerName,
      String customerContact
  ) {
    public static Session empty() {
      return new Session(CLOSED, "ko", "", "");
    }
  }

  public record Input(InputKind kind, String value) {
    public static Input start(String locale) {
      return new Input(InputKind.START, locale);
    }

    public static Input consent(boolean accepted) {
      return new Input(InputKind.CONSENT, accepted ? "yes" : "no");
    }

    public static Input text(String value) {
      return new Input(InputKind.TEXT, value);
    }

    public static Input sharedPhone(String value) {
      return new Input(InputKind.SHARED_PHONE, value);
    }
  }

  public record Decision(
      Session session,
      Action action,
      boolean createInquiry,
      boolean forwardMessage
  ) {}
}
