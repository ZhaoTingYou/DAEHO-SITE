package com.daeho.cms.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class InquiryContactMatcherTest {
  @Test
  void requiresAnExactNormalizedPhoneOrEmailForTheSpecifiedInquiry() {
    assertThat(InquiryContactMatcher.matches(
        "010-1234-5678", "010-1234-5678", "member@example.com", "01012345678"
    )).isTrue();
    assertThat(InquiryContactMatcher.matches(
        "+82 10-1234-5678", "+821012345678", "member@example.com", "01012345678"
    )).isTrue();
    assertThat(InquiryContactMatcher.matches(
        "010-1234-5678", "010-1234-5678", "member@example.com", " MEMBER@example.com "
    )).isTrue();
    assertThat(InquiryContactMatcher.matches(
        "010-1234-5678", "010-1234-5678", "member@example.com", "01012345679"
    )).isFalse();
    assertThat(InquiryContactMatcher.matches(
        "010-1234-5678", "010-1234-5678", "member@example.com", ""
    )).isFalse();
  }
}
