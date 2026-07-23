package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.repository.TrafficAnalyticsRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TrafficAnalyticsServiceTest {
  private TrackingRepository repository;
  private TrafficAnalyticsService service;

  @BeforeEach
  void setUp() {
    repository = new TrackingRepository();
    service = new TrafficAnalyticsService(repository);
  }

  @Test
  void normalizesKnownChannelsWithUtmPriority() {
    assertEquals("google", service.normalizeChannel(payload("google", "organic", "naver.com")));
    assertEquals("instagram", service.normalizeChannel(payload("instagram", "social", "google.com")));
    assertEquals("kakao", service.normalizeChannel(payload("kakao", "social", "google.com")));
    assertEquals("qr", service.normalizeChannel(payload("qr", "offline", "google.com")));
    assertEquals("naver", service.normalizeChannel(payload("", "", "search.naver.com")));
    assertEquals("social", service.normalizeChannel(payload("", "social", "google.com")));
    assertEquals("referral", service.normalizeChannel(payload("", "", "example.com")));
    assertEquals("other", service.normalizeChannel(payload("newsletter", "email", "google.com")));
    assertEquals("direct", service.normalizeChannel(payload("", "", "")));
  }

  @Test
  void validatesCollectionPayloadBeforeItReachesTheRepository() {
    assertThrows(ValidationFailedException.class, () -> service.record(Map.of("sessionId", "not-a-uuid")));
    assertThrows(ValidationFailedException.class, () -> service.record(with("pagePath", "collections")));
    assertThrows(ValidationFailedException.class, () -> service.record(with("landingPath", "collections")));
    assertThrows(ValidationFailedException.class, () -> service.record(with("locale", "ja")));
    assertThrows(ValidationFailedException.class, () -> service.record(with("deviceClass", "watch")));
    assertEquals(0, repository.recordCalls);
  }

  @Test
  void trimsAndCapsStoredAttributionAndPageFields() {
    var result = service.record(with(
        "source", "  " + "s".repeat(130) + "  ",
        "medium", "  social  ",
        "campaign", "c".repeat(170),
        "content", "d".repeat(170),
        "referrerHost", "  www.instagram.com  ",
        "pageTitle", "t".repeat(320)
    ));

    assertTrue(result.inserted());
    assertEquals(120, repository.lastPayload.get("source").toString().length());
    assertEquals("social", repository.lastPayload.get("medium"));
    assertEquals(160, repository.lastPayload.get("campaign").toString().length());
    assertEquals(160, repository.lastPayload.get("content").toString().length());
    assertEquals("instagram.com", repository.lastPayload.get("referrerHost"));
    assertEquals(300, repository.lastPayload.get("pageTitle").toString().length());
  }

  @Test
  void stripsPrivateQueryValuesAndFragmentsFromStoredPaths() {
    service.record(with(
        "landingPath", "/en?utm_source=instagram&email=private@example.com&message=secret#ignored",
        "pagePath", "/en/contact?gclid=abc123&dclid=def456&engraving=private&utm_campaign=launch#details"
    ));

    assertEquals("/en?utm_source=instagram", repository.lastPayload.get("landingPath"));
    assertEquals("/en/contact?utm_campaign=launch", repository.lastPayload.get("pagePath"));
    assertFalse(repository.lastPayload.values().stream().map(Object::toString)
        .anyMatch(value -> value.contains("private@example.com") || value.contains("secret")
            || value.contains("engraving") || value.contains("abc123") || value.contains("def456")));
  }

  @Test
  void treatsInternalReferrersAsDirectAndRejectsMalformedHosts() {
    service.record(payload("", "", "daeho.works"));
    assertEquals("", repository.lastPayload.get("referrerHost"));
    assertEquals("direct", repository.lastPayload.get("channel"));

    service.record(payload("", "", "www.daeho.works"));

    assertEquals("", repository.lastPayload.get("referrerHost"));
    assertEquals("direct", repository.lastPayload.get("channel"));
    assertEquals("(direct)", repository.lastPayload.get("source"));
    assertThrows(ValidationFailedException.class, () -> service.record(payload("", "", "not a hostname")));
  }

  @Test
  void derivesNaturalSearchAndReferralChannelsFromReferrerHosts() {
    service.record(payload("", "", "www.google.com"));
    assertEquals("google", repository.lastPayload.get("channel"));
    assertEquals("google", repository.lastPayload.get("source"));
    assertEquals("organic", repository.lastPayload.get("medium"));

    service.record(payload("", "", "search.naver.com"));
    assertEquals("naver", repository.lastPayload.get("channel"));
    assertEquals("naver", repository.lastPayload.get("source"));
    assertEquals("organic", repository.lastPayload.get("medium"));

    service.record(payload("", "", "partner.example.com"));
    assertEquals("referral", repository.lastPayload.get("channel"));
    assertEquals("partner.example.com", repository.lastPayload.get("source"));
  }

  @Test
  void validatesReportDatesAndVisitPageSizes() {
    assertThrows(ValidationFailedException.class, () -> service.summary("2026-07-23", "2026-07-01", ""));
    assertThrows(ValidationFailedException.class, () -> service.summary("not-a-date", "2026-07-23", ""));
    assertThrows(ValidationFailedException.class, () -> service.visits("2026-07-01", "2026-07-23", "", 0, 25));
    assertThrows(ValidationFailedException.class, () -> service.visits("2026-07-01", "2026-07-23", "", 1, 10));

    var summary = service.summary("2026-07-01", "2026-07-23", " google ");
    var visits = service.visits("2026-07-01", "2026-07-23", " google ", 2, 50);

    assertEquals("google", repository.summaryChannel);
    assertEquals("google", repository.visitsChannel);
    assertEquals(2, repository.visitsPage);
    assertEquals(50, repository.visitsPageSize);
    assertEquals(OffsetDateTime.parse("2026-07-01T00:00:00+09:00"), repository.summaryFrom);
    assertEquals(OffsetDateTime.parse("2026-07-24T00:00:00+09:00"), repository.summaryTo);
    assertEquals("summary", summary.get("result"));
    assertEquals("visits", visits.get("result"));
    assertThrows(UnsupportedOperationException.class, () -> summary.put("extra", true));
  }

  @Test
  void rejectsVisitPagesAboveTheSafeMaximum() {
    service.visits("2026-07-01", "2026-07-23", "", 1_000_000, 100);

    assertEquals(1_000_000, repository.visitsPage);
    assertThrows(
        ValidationFailedException.class,
        () -> service.visits("2026-07-01", "2026-07-23", "", 1_000_001, 100)
    );
  }

  @Test
  void keepsThePageViewSuccessfulAndRetriesCleanupAfterFailure() {
    repository.cleanupFailure = true;

    var first = service.record(payload("instagram", "social", "google.com"));
    repository.cleanupFailure = false;
    var second = service.record(with("pageViewId", UUID.randomUUID().toString()));

    assertTrue(first.inserted());
    assertTrue(second.inserted());
    assertEquals(2, repository.recordCalls);
    assertEquals(2, repository.cleanupAttempts);
    assertEquals(LocalDate.now(java.time.ZoneOffset.UTC), repository.lastCleanupDate);
    assertFalse(repository.lastCutoff.isAfter(OffsetDateTime.now().minusMonths(14).plusMinutes(1)));
  }

  private static Map<String, Object> payload(String source, String medium, String referrerHost) {
    return Map.ofEntries(
        Map.entry("sessionId", "00000000-0000-4000-8000-000000000001"),
        Map.entry("pageViewId", "00000000-0000-4000-8000-000000000002"),
        Map.entry("source", source),
        Map.entry("medium", medium),
        Map.entry("campaign", "campaign"),
        Map.entry("content", "content"),
        Map.entry("referrerHost", referrerHost),
        Map.entry("landingPath", "/en"),
        Map.entry("pagePath", "/en/collections"),
        Map.entry("pageTitle", "Collections"),
        Map.entry("locale", "en"),
        Map.entry("deviceClass", "desktop")
    );
  }

  private static Map<String, Object> with(String key, Object value) {
    return with(key, value, null, null, null, null, null, null, null, null, null, null);
  }

  private static Map<String, Object> with(String key1, Object value1, String key2, Object value2) {
    return with(key1, value1, key2, value2, null, null, null, null, null, null, null, null);
  }

  private static Map<String, Object> with(
      String key1, Object value1,
      String key2, Object value2,
      String key3, Object value3,
      String key4, Object value4,
      String key5, Object value5,
      String key6, Object value6
  ) {
    var result = new LinkedHashMap<>(payload("google", "organic", "google.com"));
    result.put(key1, value1);
    if (key2 != null) {
      result.put(key2, value2);
    }
    if (key3 != null) {
      result.put(key3, value3);
    }
    if (key4 != null) {
      result.put(key4, value4);
    }
    if (key5 != null) {
      result.put(key5, value5);
    }
    if (key6 != null) {
      result.put(key6, value6);
    }
    return result;
  }

  private static class TrackingRepository extends TrafficAnalyticsRepository {
    private int recordCalls;
    private int cleanupAttempts;
    private boolean cleanupFailure;
    private Map<String, Object> lastPayload = Map.of();
    private OffsetDateTime lastCutoff;
    private LocalDate lastCleanupDate;
    private String summaryChannel;
    private OffsetDateTime summaryFrom;
    private OffsetDateTime summaryTo;
    private String visitsChannel;
    private int visitsPage;
    private int visitsPageSize;

    TrackingRepository() {
      super(null);
    }

    @Override
    public RecordResult recordPageView(Map<String, Object> payload) {
      recordCalls++;
      lastPayload = Map.copyOf(payload);
      return new RecordResult(true);
    }

    @Override
    public Map<String, Object> summary(OffsetDateTime from, OffsetDateTime to, String channel) {
      summaryChannel = channel;
      summaryFrom = from;
      summaryTo = to;
      return Map.of("result", "summary");
    }

    @Override
    public Map<String, Object> visits(OffsetDateTime from, OffsetDateTime to, String channel, int page, int pageSize) {
      visitsChannel = channel;
      visitsPage = page;
      visitsPageSize = pageSize;
      return Map.of("result", "visits");
    }

    @Override
    public boolean cleanupExpiredIfDue(OffsetDateTime cutoff, LocalDate cleanupDate) {
      cleanupAttempts++;
      lastCutoff = cutoff;
      lastCleanupDate = cleanupDate;
      if (cleanupFailure) {
        throw new IllegalStateException("cleanup unavailable");
      }
      return true;
    }
  }
}
