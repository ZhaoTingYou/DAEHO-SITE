package com.daeho.cms.repository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class TrafficAnalyticsRepository {
  private final JdbcTemplate jdbc;

  public TrafficAnalyticsRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Transactional
  public RecordResult recordPageView(Map<String, Object> payload) {
    var sessionId = UUID.fromString(payload.get("sessionId").toString());
    var pageViewId = UUID.fromString(payload.get("pageViewId").toString());
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    var pagePath = value(payload, "pagePath");

    // Every writer for a session shares this transaction-scoped lock before retry cleanup can run.
    jdbc.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?::text, 0))",
        sessionId.toString()
    );

    int sessionInserted = jdbc.update("""
        INSERT INTO cms_analytics_sessions (
          session_id, channel, source, medium, campaign, content, referrer_host,
          landing_path, latest_path, locale, device_class, started_at, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (session_id) DO NOTHING
        """,
        sessionId,
        value(payload, "channel"),
        value(payload, "source"),
        value(payload, "medium"),
        value(payload, "campaign"),
        value(payload, "content"),
        value(payload, "referrerHost"),
        value(payload, "landingPath"),
        pagePath,
        value(payload, "locale"),
        value(payload, "deviceClass"),
        now,
        now
    );

    int inserted = jdbc.update("""
        INSERT INTO cms_analytics_pageviews (page_view_id, session_id, page_path, page_title, viewed_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (page_view_id) DO NOTHING
        """, pageViewId, sessionId, pagePath, value(payload, "pageTitle"), now);

    if (inserted == 1) {
      jdbc.update("""
          UPDATE cms_analytics_sessions
          SET latest_path = ?, locale = ?, device_class = ?,
              page_view_count = page_view_count + 1,
              last_activity_at = GREATEST(last_activity_at, ?)
          WHERE session_id = ?
          """, pagePath, value(payload, "locale"), value(payload, "deviceClass"), now, sessionId);
    } else if (sessionInserted == 1) {
      jdbc.update("""
          DELETE FROM cms_analytics_sessions s
          WHERE s.session_id = ?
            AND s.page_view_count = 0
            AND NOT EXISTS (
              SELECT 1
              FROM cms_analytics_pageviews pv
              WHERE pv.session_id = s.session_id
            )
          """, sessionId);
    }

    return new RecordResult(inserted == 1);
  }

  public Map<String, Object> summary(OffsetDateTime from, OffsetDateTime to, String channel) {
    var totals = jdbc.queryForList("""
        SELECT COUNT(*) AS sessions,
          COALESCE(SUM(page_view_count), 0) AS page_views,
          COUNT(*) FILTER (WHERE last_activity_at >= now() - interval '30 minutes') AS active_sessions,
          COALESCE(AVG(page_view_count), 0) AS average_pages_per_session
        FROM cms_analytics_sessions
        WHERE started_at >= ? AND started_at < ?
          AND (? = '' OR channel = ?)
        """, from, to, channel, channel).get(0);
    long sessionCount = longValue(totals.get("sessions"));

    var daily = jdbc.queryForList("""
        SELECT (started_at AT TIME ZONE 'Asia/Seoul')::date AS date,
          COUNT(*) AS sessions,
          COALESCE(SUM(page_view_count), 0) AS page_views
        FROM cms_analytics_sessions
        WHERE started_at >= ? AND started_at < ?
          AND (? = '' OR channel = ?)
        GROUP BY (started_at AT TIME ZONE 'Asia/Seoul')::date
        ORDER BY date ASC
        """, from, to, channel, channel).stream().map(row -> Map.<String, Object>of(
            "date", String.valueOf(row.get("date")),
            "sessions", longValue(row.get("sessions")),
            "pageViews", longValue(row.get("page_views"))
        )).toList();

    var channels = jdbc.queryForList("""
        SELECT channel, source, medium,
          COUNT(*) AS sessions,
          COALESCE(SUM(page_view_count), 0) AS page_views
        FROM cms_analytics_sessions
        WHERE started_at >= ? AND started_at < ?
          AND (? = '' OR channel = ?)
        GROUP BY channel, source, medium
        ORDER BY sessions DESC, channel ASC, source ASC, medium ASC
        """, from, to, channel, channel).stream().map(row -> Map.<String, Object>of(
            "channel", row.get("channel"),
            "source", row.get("source"),
            "medium", row.get("medium"),
            "sessions", longValue(row.get("sessions")),
            "pageViews", longValue(row.get("page_views")),
            "share", sessionCount == 0 ? 0D : (double) longValue(row.get("sessions")) / sessionCount
        )).toList();

    var landingPages = jdbc.queryForList("""
        SELECT landing_path AS path,
          COUNT(*) AS sessions,
          (ARRAY_AGG(channel ORDER BY started_at ASC, session_id ASC))[1] AS leading_channel
        FROM cms_analytics_sessions
        WHERE started_at >= ? AND started_at < ?
          AND (? = '' OR channel = ?)
        GROUP BY landing_path
        ORDER BY sessions DESC, path ASC
        """, from, to, channel, channel).stream().map(row -> Map.<String, Object>of(
            "path", row.get("path"),
            "sessions", longValue(row.get("sessions")),
            "leadingChannel", row.get("leading_channel")
        )).toList();

    return Map.of(
        "totals", Map.of(
            "sessions", sessionCount,
            "pageViews", longValue(totals.get("page_views")),
            "activeSessions", longValue(totals.get("active_sessions")),
            "averagePagesPerSession", doubleValue(totals.get("average_pages_per_session"))
        ),
        "daily", daily,
        "channels", channels,
        "landingPages", landingPages
    );
  }

  public Map<String, Object> visits(OffsetDateTime from, OffsetDateTime to, String channel, int page, int pageSize) {
    int offset = (page - 1) * pageSize;
    var total = longValue(jdbc.queryForList("""
        SELECT COUNT(*) AS total
        FROM cms_analytics_sessions
        WHERE started_at >= ? AND started_at < ?
          AND (? = '' OR channel = ?)
        """, from, to, channel, channel).get(0).get("total"));
    var rows = jdbc.queryForList("""
        SELECT s.session_id, s.channel, s.source, s.medium, s.campaign, s.content, s.referrer_host,
          s.landing_path, s.latest_path, s.locale, s.device_class, s.page_view_count,
          s.started_at, s.last_activity_at
        FROM cms_analytics_sessions s
        WHERE s.started_at >= ? AND s.started_at < ?
          AND (? = '' OR s.channel = ?)
        ORDER BY s.started_at DESC, s.session_id DESC
        LIMIT ? OFFSET ?
        """, from, to, channel, channel, pageSize, offset);
    var items = rows.stream().map(this::visitRow).toList();

    return Map.of(
        "items", items,
        "total", total,
        "page", page,
        "pageSize", pageSize,
        "totalPages", total == 0 ? 0 : (int) ((total + pageSize - 1) / pageSize)
    );
  }

  @Transactional
  public int deleteExpired(OffsetDateTime cutoff) {
    int pageViews = jdbc.update("DELETE FROM cms_analytics_pageviews WHERE viewed_at < ?", cutoff);
    int sessions = jdbc.update("DELETE FROM cms_analytics_sessions WHERE last_activity_at < ?", cutoff);
    return pageViews + sessions;
  }

  private Map<String, Object> visitRow(Map<String, Object> row) {
    var result = new LinkedHashMap<String, Object>();
    result.put("sessionId", row.get("session_id"));
    result.put("channel", row.get("channel"));
    result.put("source", row.get("source"));
    result.put("medium", row.get("medium"));
    result.put("campaign", row.get("campaign"));
    result.put("content", row.get("content"));
    result.put("referrerHost", row.get("referrer_host"));
    result.put("landingPath", row.get("landing_path"));
    result.put("latestPath", row.get("latest_path"));
    result.put("locale", row.get("locale"));
    result.put("deviceClass", row.get("device_class"));
    result.put("pageViewCount", longValue(row.get("page_view_count")));
    result.put("startedAt", row.get("started_at"));
    result.put("lastActivityAt", row.get("last_activity_at"));
    return result;
  }

  private static String value(Map<String, Object> payload, String key) {
    var value = payload.get(key);
    return value == null ? "" : value.toString();
  }

  private static long longValue(Object value) {
    return ((Number) value).longValue();
  }

  private static double doubleValue(Object value) {
    return ((Number) value).doubleValue();
  }

  public record RecordResult(boolean inserted) {}
}
