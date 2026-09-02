package com.daeho.customer.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AdultEligibilityTest {
  private final Clock clock = Clock.fixed(Instant.parse("2026-09-02T00:00:00Z"), ZoneOffset.UTC);

  @Test
  void acceptsSomeoneOnTheirNineteenthBirthday() {
    assertThat(AdultEligibility.isAdult(LocalDate.of(2007, 9, 2), clock)).isTrue();
  }

  @Test
  void rejectsSomeoneUntilTheirNineteenthBirthday() {
    assertThat(AdultEligibility.isAdult(LocalDate.of(2007, 9, 3), clock)).isFalse();
  }
}
