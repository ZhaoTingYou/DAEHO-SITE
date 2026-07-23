package com.daeho.cms.service;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.repository.TrafficAnalyticsRepository;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TrafficAnalyticsService {
  private static final Logger log = LoggerFactory.getLogger(TrafficAnalyticsService.class);
  private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
  private static final Set<String> LOCALES = Set.of("ko", "en");
  private static final Set<String> DEVICES = Set.of("desktop", "tablet", "mobile");
  private static final Set<String> CHANNELS = Set.of(
      "google", "naver", "instagram", "kakao", "qr", "social", "referral", "direct", "other"
  );
  private static final int MAX_REPORT_PAGE = 1_000_000;
  private static final Set<Integer> PAGE_SIZES = Set.of(25, 50, 100);
  private static final Set<String> ATTRIBUTION_PARAMETERS = Set.of(
      "utm_id", "utm_source", "utm_medium", "utm_campaign", "utm_source_platform", "utm_term", "utm_content", "gclid", "dclid"
  );
  private static final Pattern UUID_PATTERN = Pattern.compile(
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
  );
  private static final Pattern HOST_PATTERN = Pattern.compile(
      "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$"
  );
  private static final Set<String> SOCIAL_HOSTS = Set.of(
      "facebook.com", "twitter.com", "x.com", "linkedin.com", "tiktok.com", "youtube.com", "threads.net"
  );

  private final TrafficAnalyticsRepository repository;

  public TrafficAnalyticsService(TrafficAnalyticsRepository repository) {
    this.repository = repository;
  }

  public TrafficAnalyticsRepository.RecordResult record(Map<String, Object> body) {
    var payload = normalizePayload(body);
    var result = repository.recordPageView(payload);
    cleanupExpiredOnceToday();
    return result;
  }

  public String normalizeChannel(Map<String, Object> payload) {
    var source = clean(value(payload, "source"), 120).toLowerCase(Locale.ROOT);
    var medium = clean(value(payload, "medium"), 120).toLowerCase(Locale.ROOT);
    var referrerHost = cleanReferrerHost(value(payload, "referrerHost"));
    var hasUtm = !source.isBlank() || !medium.isBlank();

    if (source.equals("google")) {
      return "google";
    }
    if (source.equals("naver") || source.equals("naver_blog")) {
      return "naver";
    }
    if (source.equals("instagram")) {
      return "instagram";
    }
    if (source.equals("kakao")) {
      return "kakao";
    }
    if (source.equals("qr")) {
      return "qr";
    }
    if (hasUtm && medium.equals("social")) {
      return "social";
    }
    if (hasUtm) {
      return "other";
    }
    if (hostMatches(referrerHost, "google.com")) {
      return "google";
    }
    if (hostMatches(referrerHost, "naver.com")) {
      return "naver";
    }
    if (hostMatches(referrerHost, "instagram.com")) {
      return "instagram";
    }
    if (hostMatches(referrerHost, "kakao.com") || hostMatches(referrerHost, "kakao.co.kr")) {
      return "kakao";
    }
    if (SOCIAL_HOSTS.stream().anyMatch(domain -> hostMatches(referrerHost, domain))) {
      return "social";
    }
    return referrerHost.isBlank() ? "direct" : "referral";
  }

  public Map<String, Object> summary(String from, String to, String channel) {
    var range = parseRange(from, to);
    return Map.copyOf(repository.summary(range.from(), range.to(), reportChannel(channel)));
  }

  public Map<String, Object> visits(String from, String to, String channel, Object page, Object pageSize) {
    var range = parseRange(from, to);
    var parsedPage = positiveInteger(page, "page");
    var parsedPageSize = positiveInteger(pageSize, "pageSize");
    if (parsedPage > MAX_REPORT_PAGE) {
      throw validation("page", "Expected page to be at most " + MAX_REPORT_PAGE + ".");
    }
    if (!PAGE_SIZES.contains(parsedPageSize)) {
      throw validation("pageSize", "Expected pageSize to be 25, 50, or 100.");
    }
    return Map.copyOf(repository.visits(range.from(), range.to(), reportChannel(channel), parsedPage, parsedPageSize));
  }

  private Map<String, Object> normalizePayload(Map<String, Object> body) {
    var issues = new ArrayList<Map<String, String>>();
    var sessionId = clean(value(body, "sessionId"), 36);
    var pageViewId = clean(value(body, "pageViewId"), 36);
    var landingPath = sanitizePath("landingPath", value(body, "landingPath"), issues);
    var pagePath = sanitizePath("pagePath", value(body, "pagePath"), issues);
    var locale = clean(value(body, "locale"), 8);
    var deviceClass = clean(value(body, "deviceClass"), 16);
    var referrerHost = cleanReferrerHost(value(body, "referrerHost"));

    if (!UUID_PATTERN.matcher(sessionId).matches()) {
      issues.add(issue("sessionId", "Expected a UUID."));
    }
    if (!UUID_PATTERN.matcher(pageViewId).matches()) {
      issues.add(issue("pageViewId", "Expected a UUID."));
    }
    if (!LOCALES.contains(locale)) {
      issues.add(issue("locale", "Expected locale to be ko or en."));
    }
    if (!DEVICES.contains(deviceClass)) {
      issues.add(issue("deviceClass", "Expected deviceClass to be desktop, tablet, or mobile."));
    }
    if (!value(body, "referrerHost").isBlank() && normalizedHost(value(body, "referrerHost")).isBlank()) {
      issues.add(issue("referrerHost", "Expected an external referrer hostname."));
    }
    if (!issues.isEmpty()) {
      throw new ValidationFailedException(List.copyOf(issues));
    }

    var source = clean(value(body, "source"), 120);
    var medium = clean(value(body, "medium"), 120);
    var payload = new java.util.LinkedHashMap<String, Object>();
    payload.put("sessionId", sessionId);
    payload.put("pageViewId", pageViewId);
    payload.put("channel", normalizeChannel(Map.of(
        "source", source,
        "medium", medium,
        "referrerHost", referrerHost
    )));
    payload.put("source", source.isBlank() ? (referrerHost.isBlank() ? "(direct)" : referrerHost) : source);
    payload.put("medium", medium.isBlank() ? (referrerHost.isBlank() ? "(none)" : "referral") : medium);
    payload.put("campaign", clean(value(body, "campaign"), 160));
    payload.put("content", clean(value(body, "content"), 160));
    payload.put("referrerHost", referrerHost);
    payload.put("landingPath", landingPath);
    payload.put("pagePath", pagePath);
    payload.put("pageTitle", clean(value(body, "pageTitle"), 300));
    payload.put("locale", locale);
    payload.put("deviceClass", deviceClass);
    return Map.copyOf(payload);
  }

  private void cleanupExpiredOnceToday() {
    try {
      repository.cleanupExpiredIfDue(
          OffsetDateTime.now(ZoneOffset.UTC).minusMonths(14),
          LocalDate.now(ZoneOffset.UTC)
      );
    } catch (RuntimeException error) {
      log.warn("Traffic analytics retention cleanup failed; a later page view will retry it.", error);
    }
  }

  private ReportRange parseRange(String from, String to) {
    var issues = new ArrayList<Map<String, String>>();
    var fromDate = parseDate(from, "from", issues);
    var toDate = parseDate(to, "to", issues);
    if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
      issues.add(issue("to", "Expected to to be on or after from."));
    }
    if (!issues.isEmpty()) {
      throw new ValidationFailedException(List.copyOf(issues));
    }
    return new ReportRange(
        fromDate.atStartOfDay(SEOUL).toOffsetDateTime(),
        toDate.plusDays(1).atStartOfDay(SEOUL).toOffsetDateTime()
    );
  }

  private String reportChannel(String rawChannel) {
    var channel = clean(rawChannel, 32).toLowerCase(Locale.ROOT);
    if (!channel.isBlank() && !CHANNELS.contains(channel)) {
      throw validation("channel", "Invalid analytics channel.");
    }
    return channel;
  }

  private int positiveInteger(Object value, String path) {
    try {
      var number = Integer.parseInt(value == null ? "" : value.toString().trim());
      if (number > 0) {
        return number;
      }
    } catch (NumberFormatException ignored) {
      // Report validation below produces the consistent API error shape.
    }
    throw validation(path, "Expected a positive integer.");
  }

  private LocalDate parseDate(String value, String path, List<Map<String, String>> issues) {
    try {
      return LocalDate.parse(value == null ? "" : value.trim());
    } catch (DateTimeParseException error) {
      issues.add(issue(path, "Expected a YYYY-MM-DD date."));
      return null;
    }
  }

  private String sanitizePath(String path, String rawValue, List<Map<String, String>> issues) {
    var value = rawValue == null ? "" : rawValue.trim();
    if (value.isBlank() || !value.startsWith("/")) {
      issues.add(issue(path, "Expected a slash-prefixed path."));
      return "";
    }
    try {
      var uri = URI.create(value);
      if (uri.isAbsolute() || uri.getRawAuthority() != null || uri.getRawPath() == null || uri.getRawPath().isBlank()) {
        issues.add(issue(path, "Expected a slash-prefixed path."));
        return "";
      }
      var query = allowedQuery(uri.getRawQuery());
      return clean(uri.getRawPath() + (query.isBlank() ? "" : "?" + query), 300);
    } catch (IllegalArgumentException error) {
      issues.add(issue(path, "Expected a valid slash-prefixed path."));
      return "";
    }
  }

  private static String allowedQuery(String rawQuery) {
    if (rawQuery == null || rawQuery.isBlank()) {
      return "";
    }
    var allowed = new ArrayList<String>();
    for (var part : rawQuery.split("&")) {
      var separator = part.indexOf('=');
      var key = separator < 0 ? part : part.substring(0, separator);
      if (ATTRIBUTION_PARAMETERS.contains(key)) {
        allowed.add(part);
      }
    }
    return String.join("&", allowed);
  }

  private static boolean hostMatches(String host, String domain) {
    return host.equals(domain) || host.endsWith("." + domain);
  }

  private static String cleanReferrerHost(String value) {
    var host = normalizedHost(value);
    return hostMatches(host, "daeho.works") ? "" : host;
  }

  private static String normalizedHost(String value) {
    var host = clean(value, 253).toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
    return HOST_PATTERN.matcher(host).matches() ? host : "";
  }

  private static String clean(String value, int maximumLength) {
    var trimmed = value == null ? "" : value.trim();
    return trimmed.length() <= maximumLength ? trimmed : trimmed.substring(0, maximumLength);
  }

  private static String value(Map<String, Object> values, String key) {
    if (values == null || values.get(key) == null) {
      return "";
    }
    return values.get(key).toString();
  }

  private static ValidationFailedException validation(String path, String message) {
    return new ValidationFailedException(List.of(issue(path, message)));
  }

  private static Map<String, String> issue(String path, String message) {
    return Map.of("path", path, "message", message);
  }

  private record ReportRange(OffsetDateTime from, OffsetDateTime to) {}
}
