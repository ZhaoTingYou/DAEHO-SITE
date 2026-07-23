package com.daeho.cms.controller;

import com.daeho.cms.service.TrafficAnalyticsService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cms/analytics")
public class PublicAnalyticsController {
  private final TrafficAnalyticsService service;

  public PublicAnalyticsController(TrafficAnalyticsService service) {
    this.service = service;
  }

  @PostMapping("/page-view")
  public ResponseEntity<Map<String, Object>> pageView(@RequestBody Map<String, Object> body) {
    var result = service.record(body);
    return ResponseEntity.status(result.inserted() ? HttpStatus.ACCEPTED : HttpStatus.OK)
        .body(Map.of("accepted", true, "inserted", result.inserted()));
  }
}
