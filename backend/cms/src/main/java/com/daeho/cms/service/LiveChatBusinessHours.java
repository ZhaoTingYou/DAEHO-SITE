package com.daeho.cms.service;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public record LiveChatBusinessHours(LocalTime start, LocalTime end) {
  public static final String DEFAULT_START = "09:00";
  public static final String DEFAULT_END = "19:00";
  public static final String TIME_ZONE = "Asia/Seoul";
  private static final ZoneId SEOUL = ZoneId.of(TIME_ZONE);
  private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

  public LiveChatBusinessHours {
    if (start == null || end == null || !start.isBefore(end)) {
      throw new IllegalArgumentException("Live-chat opening time must be before closing time.");
    }
  }

  public static LiveChatBusinessHours parse(String start, String end) {
    try {
      return new LiveChatBusinessHours(
          LocalTime.parse(normalize(start, DEFAULT_START), CLOCK),
          LocalTime.parse(normalize(end, DEFAULT_END), CLOCK)
      );
    } catch (DateTimeParseException error) {
      throw new IllegalArgumentException("Live-chat hours must use HH:mm.", error);
    }
  }

  public boolean includes(Instant instant) {
    var localTime = instant.atZone(SEOUL).toLocalTime();
    return !localTime.isBefore(start) && localTime.isBefore(end);
  }

  public String startText() {
    return CLOCK.format(start);
  }

  public String endText() {
    return CLOCK.format(end);
  }

  private static String normalize(String value, String fallback) {
    var normalized = value == null ? "" : value.trim();
    return normalized.isBlank() ? fallback : normalized;
  }
}
