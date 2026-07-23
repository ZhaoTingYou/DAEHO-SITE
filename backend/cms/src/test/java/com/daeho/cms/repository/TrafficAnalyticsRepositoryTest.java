package com.daeho.cms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class TrafficAnalyticsRepositoryTest {
  private static final UUID SESSION_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID RETRY_SESSION_ID = UUID.fromString("00000000-0000-4000-8000-000000000004");
  private static final UUID FIRST_PAGE_VIEW_ID = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID SECOND_PAGE_VIEW_ID = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final OffsetDateTime FROM = OffsetDateTime.of(2026, 7, 1, 0, 0, 0, 0, ZoneOffset.UTC);
  private static final OffsetDateTime TO = OffsetDateTime.of(2026, 8, 1, 0, 0, 0, 0, ZoneOffset.UTC);

  @Test
  void recordsDistinctPageViewsAndIgnoresAPageViewRetry() {
    var jdbc = new RecordingJdbcTemplate();
    var pageViewInserts = new AtomicInteger();
    var sessionInsertResults = new AtomicInteger();
    jdbc.updateResult = call -> {
      if (call.sql().contains("INSERT INTO cms_analytics_sessions")) {
        return sessionInsertResults.getAndIncrement() == 0 ? 1 : 0;
      }
      if (call.sql().contains("INSERT INTO cms_analytics_pageviews")) {
        return pageViewInserts.getAndIncrement() < 2 ? 1 : 0;
      }
      return 1;
    };
    var repository = new TrafficAnalyticsRepository(jdbc);

    var first = repository.recordPageView(payload(FIRST_PAGE_VIEW_ID, "/en", "/en/collections", "Collections"));
    var second = repository.recordPageView(payload(SECOND_PAGE_VIEW_ID, "/ignored-on-conflict", "/en/contact", "Contact"));
    var retry = repository.recordPageView(payload(SECOND_PAGE_VIEW_ID, "/ignored-on-conflict", "/en/contact", "Contact"));

    assertTrue(first.inserted());
    assertTrue(second.inserted());
    assertFalse(retry.inserted());

    var sessionInserts = jdbc.callsMatching("INSERT INTO cms_analytics_sessions");
    assertEquals(3, sessionInserts.size());
    assertEquals(
        List.of(SESSION_ID, "google", "google", "organic", "summer", "hero", "google.com", "/en", "/en/collections", "en", "desktop"),
        Arrays.asList(sessionInserts.get(0).args()).subList(0, 11)
    );
    assertTrue(sessionInserts.get(0).args()[11] instanceof OffsetDateTime);
    assertTrue(sessionInserts.get(0).args()[12] instanceof OffsetDateTime);

    var pageViewInsertCalls = jdbc.callsMatching("INSERT INTO cms_analytics_pageviews");
    assertEquals(3, pageViewInsertCalls.size());
    assertEquals(List.of(FIRST_PAGE_VIEW_ID, SESSION_ID, "/en/collections", "Collections"), Arrays.asList(pageViewInsertCalls.get(0).args()).subList(0, 4));
    assertEquals(List.of(SECOND_PAGE_VIEW_ID, SESSION_ID, "/en/contact", "Contact"), Arrays.asList(pageViewInsertCalls.get(1).args()).subList(0, 4));

    var sessionUpdates = jdbc.callsMatching("UPDATE cms_analytics_sessions");
    assertEquals(2, sessionUpdates.size());
    assertEquals(List.of("/en/collections", "en", "desktop"), Arrays.asList(sessionUpdates.get(0).args()).subList(0, 3));
    assertEquals(List.of("/en/contact", "en", "desktop"), Arrays.asList(sessionUpdates.get(1).args()).subList(0, 3));
    assertEquals(SESSION_ID, sessionUpdates.get(1).args()[4]);
    assertTrue(sessionUpdates.get(0).sql().contains("page_view_count = page_view_count + 1"));
    assertTrue(pageViewInsertCalls.get(0).sql().contains("ON CONFLICT (page_view_id) DO NOTHING"));
    assertTrue(sessionInserts.get(0).sql().contains("ON CONFLICT (session_id) DO NOTHING"));
    assertTrue(jdbc.callsMatching("DELETE FROM cms_analytics_sessions").isEmpty());
  }

  @Test
  void removesOnlyANewEmptySessionWhenAPageViewRetryUsesADifferentSession() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.updateResult = call -> {
      if (call.sql().contains("INSERT INTO cms_analytics_sessions")) {
        return 1;
      }
      if (call.sql().contains("INSERT INTO cms_analytics_pageviews")) {
        return 0;
      }
      if (call.sql().contains("DELETE FROM cms_analytics_sessions")) {
        return 1;
      }
      return 0;
    };
    var repository = new TrafficAnalyticsRepository(jdbc);

    var result = repository.recordPageView(payload(RETRY_SESSION_ID, SECOND_PAGE_VIEW_ID, "/en", "/en/contact", "Contact"));

    assertFalse(result.inserted());
    var lock = jdbc.callsMatching("pg_advisory_xact_lock").get(0);
    var sessionInsert = jdbc.callsMatching("INSERT INTO cms_analytics_sessions").get(0);
    var cleanup = jdbc.callsMatching("DELETE FROM cms_analytics_sessions").get(0);
    assertTrue(jdbc.calls().indexOf(lock) < jdbc.calls().indexOf(sessionInsert));
    assertEquals(List.of(RETRY_SESSION_ID.toString()), Arrays.asList(lock.args()));
    assertTrue(cleanup.sql().contains("page_view_count = 0"));
    assertTrue(cleanup.sql().contains("NOT EXISTS"));
    assertTrue(cleanup.sql().contains("cms_analytics_pageviews"));
    assertEquals(List.of(RETRY_SESSION_ID), Arrays.asList(cleanup.args()));
  }

  @Test
  void returnsSummarySectionsWithTheSharedRangeAndChannelFilter() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> {
      if (call.sql().contains("active_sessions")) {
        return List.of(Map.of("sessions", 2L, "page_views", 3L, "active_sessions", 1L, "average_pages_per_session", 1.5D));
      }
      if (call.sql().contains("GROUP BY (started_at AT TIME ZONE 'Asia/Seoul')::date")) {
        return List.of(Map.of("date", "2026-07-02", "sessions", 2L, "page_views", 3L));
      }
      if (call.sql().contains("GROUP BY channel, source, medium")) {
        return List.of(Map.of("channel", "google", "source", "google", "medium", "organic", "sessions", 2L, "page_views", 3L));
      }
      if (call.sql().contains("GROUP BY landing_path")) {
        return List.of(Map.of("path", "/en", "sessions", 2L, "leading_channel", "google"));
      }
      throw new AssertionError("Unexpected summary query: " + call.sql());
    };
    var repository = new TrafficAnalyticsRepository(jdbc);

    var summary = repository.summary(FROM, TO, "google");

    assertEquals(Map.of("sessions", 2L, "pageViews", 3L, "activeSessions", 1L, "averagePagesPerSession", 1.5D), summary.get("totals"));
    assertEquals(List.of(Map.of("date", "2026-07-02", "sessions", 2L, "pageViews", 3L)), summary.get("daily"));
    assertEquals(List.of(Map.of("channel", "google", "source", "google", "medium", "organic", "sessions", 2L, "pageViews", 3L, "share", 1.0D)), summary.get("channels"));
    assertEquals(List.of(Map.of("path", "/en", "sessions", 2L, "leadingChannel", "google")), summary.get("landingPages"));

    var summaryCalls = jdbc.callsMatching("SELECT");
    assertEquals(4, summaryCalls.size());
    assertTrue(summaryCalls.stream().allMatch(call -> call.sql().contains("started_at >= ? AND started_at < ?") && call.sql().contains("(? = '' OR channel = ?)")));
    assertTrue(summaryCalls.stream().allMatch(call -> Arrays.asList(call.args()).subList(0, 4).equals(List.of(FROM, TO, "google", "google"))));
  }

  @Test
  void returnsNewestFirstVisitsWithRequestedPagination() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> call.sql().contains("COUNT(*) AS total")
        ? List.of(Map.of("total", 51L))
        : List.of(Map.ofEntries(
        Map.entry("session_id", SESSION_ID),
        Map.entry("channel", "google"),
        Map.entry("source", "google"),
        Map.entry("medium", "organic"),
        Map.entry("campaign", "summer"),
        Map.entry("content", "hero"),
        Map.entry("referrer_host", "google.com"),
        Map.entry("landing_path", "/en"),
        Map.entry("latest_path", "/en/contact"),
        Map.entry("locale", "en"),
        Map.entry("device_class", "desktop"),
        Map.entry("page_view_count", 2),
        Map.entry("started_at", TO.minusDays(1)),
        Map.entry("last_activity_at", TO.minusHours(1)),
        Map.entry("total_count", 51L)
    ));
    var repository = new TrafficAnalyticsRepository(jdbc);

    var visits = repository.visits(FROM, TO, "google", 2, 25);

    assertEquals(51L, visits.get("total"));
    assertEquals(2, visits.get("page"));
    assertEquals(25, visits.get("pageSize"));
    assertEquals(3, visits.get("totalPages"));
    assertEquals("/en/contact", ((Map<?, ?>) ((List<?>) visits.get("items")).get(0)).get("latestPath"));

    var call = jdbc.callsMatching("ORDER BY s.started_at DESC").get(0);
    assertTrue(call.sql().contains("ORDER BY s.started_at DESC"));
    assertTrue(call.sql().contains("LIMIT ? OFFSET ?"));
    assertEquals(List.of(FROM, TO, "google", "google", 25, 25), Arrays.asList(call.args()));
  }

  @Test
  void retainsTotalAndTotalPagesWhenTheRequestedVisitPageIsEmpty() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.queryResult = call -> call.sql().contains("COUNT(*) AS total")
        ? List.of(Map.of("total", 51L))
        : List.of();
    var repository = new TrafficAnalyticsRepository(jdbc);

    var visits = repository.visits(FROM, TO, "google", 4, 25);

    assertEquals(List.of(), visits.get("items"));
    assertEquals(51L, visits.get("total"));
    assertEquals(3, visits.get("totalPages"));
    var count = jdbc.callsMatching("COUNT(*) AS total").get(0);
    assertEquals(List.of(FROM, TO, "google", "google"), Arrays.asList(count.args()));
  }

  @Test
  void deletesExpiredPageViewsBeforeSessions() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.updateResult = call -> call.sql().contains("cms_analytics_pageviews") ? 4 : 2;
    var repository = new TrafficAnalyticsRepository(jdbc);

    assertEquals(6, repository.deleteExpired(FROM));

    var calls = jdbc.calls();
    assertEquals(2, calls.size());
    assertTrue(calls.get(0).sql().contains("DELETE FROM cms_analytics_pageviews WHERE viewed_at < ?"));
    assertTrue(calls.get(1).sql().contains("DELETE FROM cms_analytics_sessions WHERE last_activity_at < ?"));
    assertEquals(List.of(FROM), Arrays.asList(calls.get(0).args()));
    assertEquals(List.of(FROM), Arrays.asList(calls.get(1).args()));
  }

  @Test
  void claimsTheUtcCleanupDateBeforeDeletingExpiredAnalytics() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.updateResult = call -> call.sql().contains("cms_admin_settings") ? 1 : 2;
    var repository = new TrafficAnalyticsRepository(jdbc);
    var cleanupDate = LocalDate.of(2026, 7, 23);

    assertTrue(repository.cleanupExpiredIfDue(FROM, cleanupDate));

    var calls = jdbc.calls();
    assertEquals(3, calls.size());
    assertTrue(calls.get(0).sql().contains("INSERT INTO cms_admin_settings"));
    assertTrue(calls.get(0).sql().contains("setting_value < EXCLUDED.setting_value"));
    assertEquals(List.of("traffic_analytics_cleanup_date", "2026-07-23"), Arrays.asList(calls.get(0).args()));
    assertTrue(calls.get(1).sql().contains("DELETE FROM cms_analytics_pageviews"));
    assertTrue(calls.get(2).sql().contains("DELETE FROM cms_analytics_sessions"));
  }

  @Test
  void skipsCleanupWhenAnotherProcessAlreadyClaimedToday() {
    var jdbc = new RecordingJdbcTemplate();
    jdbc.updateResult = call -> 0;
    var repository = new TrafficAnalyticsRepository(jdbc);

    assertFalse(repository.cleanupExpiredIfDue(FROM, LocalDate.of(2026, 7, 23)));
    assertEquals(1, jdbc.calls().size());
    assertTrue(jdbc.calls().get(0).sql().contains("cms_admin_settings"));
  }

  @Test
  void leavesTheClaimRetryableWhenCleanupFails() {
    var jdbc = new RecordingJdbcTemplate();
    var pageViewDeletes = new AtomicInteger();
    jdbc.updateResult = call -> {
      if (call.sql().contains("cms_admin_settings")) {
        return 1;
      }
      if (call.sql().contains("cms_analytics_pageviews") && pageViewDeletes.getAndIncrement() == 0) {
        throw new IllegalStateException("cleanup failed");
      }
      return 1;
    };
    var repository = new TrafficAnalyticsRepository(jdbc);
    var cleanupDate = LocalDate.of(2026, 7, 23);

    assertThrows(IllegalStateException.class, () -> repository.cleanupExpiredIfDue(FROM, cleanupDate));
    assertTrue(repository.cleanupExpiredIfDue(FROM, cleanupDate));
    assertEquals(2, jdbc.callsMatching("cms_admin_settings").size());
  }

  private static Map<String, Object> payload(UUID pageViewId, String landingPath, String pagePath, String pageTitle) {
    return payload(SESSION_ID, pageViewId, landingPath, pagePath, pageTitle);
  }

  private static Map<String, Object> payload(UUID sessionId, UUID pageViewId, String landingPath, String pagePath, String pageTitle) {
    return Map.ofEntries(
        Map.entry("sessionId", sessionId.toString()),
        Map.entry("pageViewId", pageViewId.toString()),
        Map.entry("channel", "google"),
        Map.entry("source", "google"),
        Map.entry("medium", "organic"),
        Map.entry("campaign", "summer"),
        Map.entry("content", "hero"),
        Map.entry("referrerHost", "google.com"),
        Map.entry("landingPath", landingPath),
        Map.entry("pagePath", pagePath),
        Map.entry("pageTitle", pageTitle),
        Map.entry("locale", "en"),
        Map.entry("deviceClass", "desktop")
    );
  }

  private static class RecordingJdbcTemplate extends JdbcTemplate {
    private final List<SqlCall> calls = new ArrayList<>();
    private Function<SqlCall, Integer> updateResult = call -> 0;
    private Function<SqlCall, List<Map<String, Object>>> queryResult = call -> List.of();

    @Override
    public int update(String sql, Object... args) {
      var call = new SqlCall(sql, args);
      calls.add(call);
      return updateResult.apply(call);
    }

    @Override
    public List<Map<String, Object>> queryForList(String sql, Object... args) {
      var call = new SqlCall(sql, args);
      calls.add(call);
      return queryResult.apply(call);
    }

    private List<SqlCall> calls() {
      return calls;
    }

    private List<SqlCall> callsMatching(String text) {
      return calls.stream().filter(call -> call.sql().contains(text)).toList();
    }
  }

  private record SqlCall(String sql, Object[] args) {}
}
