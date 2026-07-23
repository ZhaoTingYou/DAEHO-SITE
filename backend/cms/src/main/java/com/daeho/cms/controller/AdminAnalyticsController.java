package com.daeho.cms.controller;

import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.TrafficAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {
  private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

  private final AdminAuth auth;
  private final TrafficAnalyticsService service;

  public AdminAnalyticsController(AdminAuth auth, TrafficAnalyticsService service) {
    this.auth = auth;
    this.service = service;
  }

  @GetMapping("/summary")
  public Map<String, Object> summary(
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(defaultValue = "") String channel,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    return service.summary(defaultFrom(from), defaultTo(to), channel);
  }

  @GetMapping("/visits")
  public Map<String, Object> visits(
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(defaultValue = "") String channel,
      @RequestParam(defaultValue = "1") String page,
      @RequestParam(defaultValue = "25") String pageSize,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    return service.visits(defaultFrom(from), defaultTo(to), channel, page, pageSize);
  }

  private String defaultFrom(String value) {
    return hasText(value) ? value : LocalDate.now(SEOUL).minusDays(29).toString();
  }

  private String defaultTo(String value) {
    return hasText(value) ? value : LocalDate.now(SEOUL).toString();
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
