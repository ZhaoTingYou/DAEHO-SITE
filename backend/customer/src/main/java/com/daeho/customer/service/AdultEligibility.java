package com.daeho.customer.service;

import java.time.Clock;
import java.time.LocalDate;

public final class AdultEligibility {
  private static final int MINIMUM_AGE = 19;

  private AdultEligibility() {}

  public static boolean isAdult(LocalDate birthDate, Clock clock) {
    return !birthDate.plusYears(MINIMUM_AGE).isAfter(LocalDate.now(clock));
  }
}
