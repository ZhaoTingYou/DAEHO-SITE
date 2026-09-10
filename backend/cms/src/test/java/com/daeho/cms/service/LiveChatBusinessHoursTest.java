package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class LiveChatBusinessHoursTest {
  @Test
  void acceptsNewConsultationsFromNineUntilSevenInSeoul() {
    var hours = LiveChatBusinessHours.parse("09:00", "19:00");

    assertFalse(hours.includes(Instant.parse("2026-09-10T23:59:59Z")));
    assertTrue(hours.includes(Instant.parse("2026-09-11T00:00:00Z")));
    assertTrue(hours.includes(Instant.parse("2026-09-11T09:59:59Z")));
    assertFalse(hours.includes(Instant.parse("2026-09-11T10:00:00Z")));
  }

  @Test
  void rejectsMalformedOrReversedSameDayHours() {
    assertThrows(IllegalArgumentException.class,
        () -> LiveChatBusinessHours.parse("9:00", "19:00"));
    assertThrows(IllegalArgumentException.class,
        () -> LiveChatBusinessHours.parse("19:00", "09:00"));
    assertThrows(IllegalArgumentException.class,
        () -> LiveChatBusinessHours.parse("09:00", "09:00"));
  }
}
