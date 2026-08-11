package com.daeho.cms.controller;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.repository.NotificationRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.AdminPasswordService;
import com.daeho.cms.service.CmsSnapshotService;
import com.daeho.cms.service.CmsStatusService;
import com.daeho.cms.service.InquiryWorkflowService;
import com.daeho.cms.service.MediaStorageService;
import com.daeho.cms.service.SolapiKakaoClient;
import com.daeho.cms.service.NotificationPlanner;
import com.daeho.cms.service.NotificationTemplateRenderer;
import com.daeho.cms.service.NotificationTestService;
import com.daeho.cms.service.RequestValidation;
import com.daeho.cms.service.WorkspaceEmailSender;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin")
public class AdminCmsController {
  private final AdminAuth auth;
  private final CmsRepository repository;
  private final RequestValidation validation;
  private final MediaStorageService mediaStorage;
  private final NotificationRepository notifications;
  private final NotificationPlanner notificationPlanner;
  private final NotificationTemplateRenderer notificationTemplateRenderer;
  private final InquiryWorkflowService inquiryWorkflow;
  private final WorkspaceEmailSender workspaceEmail;
  private final SolapiKakaoClient kakao;
  private final NotificationProperties notificationProperties;
  private final NotificationTestService notificationTest;
  private final CmsSnapshotService snapshots;
  private final CmsStatusService status;
  private final AdminPasswordService passwords;

  public AdminCmsController(
      AdminAuth auth,
      CmsRepository repository,
      RequestValidation validation,
      MediaStorageService mediaStorage,
      NotificationRepository notifications,
      NotificationPlanner notificationPlanner,
      NotificationTemplateRenderer notificationTemplateRenderer,
      InquiryWorkflowService inquiryWorkflow,
      WorkspaceEmailSender workspaceEmail,
      SolapiKakaoClient kakao,
      NotificationProperties notificationProperties,
      NotificationTestService notificationTest,
      CmsSnapshotService snapshots,
      CmsStatusService status,
      AdminPasswordService passwords
  ) {
    this.auth = auth;
    this.repository = repository;
    this.validation = validation;
    this.mediaStorage = mediaStorage;
    this.notifications = notifications;
    this.notificationPlanner = notificationPlanner;
    this.notificationTemplateRenderer = notificationTemplateRenderer;
    this.inquiryWorkflow = inquiryWorkflow;
    this.workspaceEmail = workspaceEmail;
    this.kakao = kakao;
    this.notificationProperties = notificationProperties;
    this.notificationTest = notificationTest;
    this.snapshots = snapshots;
    this.status = status;
    this.passwords = passwords;
  }

  @GetMapping("/auth/status")
  public Map<String, Object> authStatus(HttpServletRequest request) {
    auth.requireAdmin(request);
    var status = passwords.status();
    return Map.of("configured", status.configured(), "version", status.version());
  }

  @PostMapping("/auth/verify-password")
  public Map<String, Object> verifyPassword(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var verification = passwords.verify(validation.stringValue(body.get("password")));
    return Map.of(
        "valid", verification.valid(),
        "configured", verification.configured(),
        "version", verification.version()
    );
  }

  @PostMapping("/auth/change-password")
  public Map<String, Object> changePassword(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var status = passwords.changePassword(
        validation.stringValue(body.get("currentPassword")),
        body.get("newPassword") == null ? "" : body.get("newPassword").toString()
    );
    return Map.of("ok", true, "configured", status.configured(), "version", status.version());
  }

  @GetMapping("/pages")
  public Map<String, Object> pages(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listPages());
  }

  @GetMapping("/pages/{pageKey}")
  public Map<String, Object> page(@PathVariable String pageKey, HttpServletRequest request) {
    auth.requireAdmin(request);
    var page = repository.getPage(pageKey);
    if (page == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found");
    }
    return Map.of("page", page);
  }

  @PutMapping("/pages/{pageKey}")
  public Map<String, Object> savePage(@PathVariable String pageKey, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.pagePayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return Map.of("page", repository.upsertPage(pageKey, parsed.data()));
  }

  @GetMapping("/news")
  public Map<String, Object> news(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listNews());
  }

  @PostMapping("/news")
  public ResponseEntity<Map<String, Object>> createNews(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.newsPayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", repository.createNews(parsed.data())));
  }

  @GetMapping("/news/{id}")
  public Map<String, Object> newsItem(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var item = repository.getNews(id);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found");
    }
    return Map.of("item", item);
  }

  @PutMapping("/news/{id}")
  public Map<String, Object> updateNews(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.newsPayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var item = repository.updateNews(id, parsed.data());
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found");
    }
    return Map.of("item", item);
  }

  @DeleteMapping("/news/{id}")
  public Map<String, Object> deleteNews(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    if (!repository.deleteNews(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found");
    }
    return Map.of("ok", true);
  }

  @GetMapping("/collections")
  public Map<String, Object> collections(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listCollections());
  }

  @PostMapping("/collections")
  public ResponseEntity<Map<String, Object>> createCollection(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.collectionPayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", repository.createCollection(parsed.data())));
  }

  @GetMapping("/collections/{id}")
  public Map<String, Object> collectionItem(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var item = repository.getCollection(id);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection item not found");
    }
    return Map.of("item", item);
  }

  @PutMapping("/collections/{id}")
  public Map<String, Object> updateCollection(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.collectionPayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var item = repository.updateCollection(id, parsed.data());
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection item not found");
    }
    return Map.of("item", item);
  }

  @DeleteMapping("/collections/{id}")
  public Map<String, Object> deleteCollection(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    if (!repository.deleteCollection(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection item not found");
    }
    return Map.of("ok", true);
  }

  @GetMapping("/media")
  public Map<String, Object> media(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listMedia());
  }

  @PostMapping(value = "/media", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> createMedia(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.mediaPayload(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", repository.createMedia(parsed.data())));
  }

  @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, Object>> uploadMedia(
      @RequestPart("file") MultipartFile file,
      @RequestParam(defaultValue = "") String filename,
      @RequestParam(defaultValue = "") String altKo,
      @RequestParam(defaultValue = "") String altEn,
      HttpServletRequest request
  ) throws IOException {
    auth.requireAdmin(request);
    var uploadError = mediaStorage.uploadError(file);
    if (!uploadError.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, uploadError);
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", mediaStorage.store(file, filename, altKo, altEn)));
  }

  @GetMapping("/media/{id}")
  public Map<String, Object> mediaItem(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var item = repository.getMedia(id);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media item not found");
    }
    return Map.of("item", item);
  }

  @PatchMapping("/media/{id}")
  public Map<String, Object> updateMedia(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.mediaUpdate(body);
    var item = repository.updateMedia(id, parsed.data());
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media item not found");
    }
    return Map.of("item", item);
  }

  @DeleteMapping("/media/{id}")
  public Map<String, Object> deleteMedia(@PathVariable String id, HttpServletRequest request) throws IOException {
    auth.requireAdmin(request);
    var item = repository.getMedia(id);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media item not found");
    }
    mediaStorage.deleteStoredFile(item);
    if (!repository.deleteMedia(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media item not found");
    }
    return Map.of("ok", true);
  }

  @GetMapping("/inquiries")
  public Map<String, Object> inquiries(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String source,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listInquiries(status, source));
  }

  @GetMapping("/inquiry-statuses")
  public Map<String, Object> inquiryStatuses(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", repository.listInquiryStatuses());
  }

  @PostMapping("/inquiry-statuses")
  public ResponseEntity<Map<String, Object>> createInquiryStatus(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var parsed = validation.inquiryStatusDefinition(body, true);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var code = validation.stringValue(parsed.data().get("code"));
    if (repository.getInquiryStatus(code) != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Inquiry status code already exists");
    }
    var created = repository.createInquiryStatus(parsed.data());
    if (created == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Inquiry status code already exists");
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", created));
  }

  @PatchMapping("/inquiry-statuses/{code}")
  public Map<String, Object> updateInquiryStatusDefinition(
      @PathVariable String code,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var codeValidation = validation.inquiryStatus(Map.of("status", code));
    var parsed = validation.inquiryStatusDefinition(body, false);
    if (!codeValidation.success()) {
      throw new ValidationFailedException(codeValidation.issues());
    }
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var existing = repository.getInquiryStatus(code);
    if (existing == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry status not found");
    }
    if (validation.booleanValue(existing.get("isSystem"), false)
        && !validation.booleanValue(parsed.data().get("isActive"), true)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "System inquiry statuses cannot be disabled");
    }
    var updated = repository.updateInquiryStatus(code, parsed.data());
    if (updated == null) {
      if (repository.getInquiryStatus(code) == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry status not found");
      }
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Inquiry status changed by another administrator. Refresh and try again."
      );
    }
    return Map.of("item", updated);
  }

  @GetMapping("/inquiries/{id}")
  public Map<String, Object> inquiry(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var inquiry = repository.getInquiry(id);
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return inquiryWorkflow.detail(inquiry);
  }

  @PostMapping("/inquiries/{id}/status-preview")
  public Map<String, Object> previewInquiryStatus(
      @PathVariable String id,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var parsed = validation.inquiryStatus(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return inquiryWorkflow.previewStatus(id, validation.stringValue(parsed.data().get("status")));
  }

  @PatchMapping("/inquiries/{id}")
  public Map<String, Object> updateInquiry(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.inquiryStatus(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return inquiryWorkflow.changeStatus(
        id,
        validation.stringValue(parsed.data().get("expectedStatus")),
        validation.stringValue(parsed.data().get("status"))
    );
  }

  @PostMapping("/notifications/jobs/{jobId}/retry")
  public Map<String, Object> retryNotificationJob(@PathVariable String jobId, HttpServletRequest request) {
    auth.requireAdmin(request);
    var job = notifications.getJob(jobId);
    if (job == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification job not found");
    }
    if (validation.booleanValue(job.get("retryBlocked"), false)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This notification was quarantined during the provider cutover and cannot be retried."
      );
    }
    var jobStatus = validation.stringValue(job.get("status"));
    if (!jobStatus.equals("failed") && !jobStatus.equals("needs_attention")) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only failed notifications can be retried.");
    }
    return Map.of("job", notifications.retryJob(jobId));
  }

  @GetMapping("/notifications/settings")
  public Map<String, Object> notificationSettings(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("settings", notificationPlanner.health().get("settings"));
  }

  @PutMapping("/notifications/settings")
  @Transactional
  public Map<String, Object> updateNotificationSettings(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var parsed = validation.notificationSettings(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    if (validation.booleanValue(parsed.data().get("kakaoEnabled"), false)) {
      notifications.lockNotificationDispatch();
      if (!kakao.configured()) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "SOLAPI credentials are not configured.");
      }
      if (!notificationTest.kakaoVerified()) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Send a successful Kakao test from this CMS before enabling notifications."
        );
      }
      if (!validation.booleanValue(notificationPlanner.health().get("kakaoTemplatesReady"), false)) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "All three Korean Kakao templates must be approved and active."
        );
      }
    }
    return Map.of("settings", notifications.updateSettings(parsed.data()));
  }

  @GetMapping("/notifications/health")
  public Map<String, Object> notificationHealth(HttpServletRequest request) {
    auth.requireAdmin(request);
    var health = new java.util.LinkedHashMap<String, Object>(notificationPlanner.health());
    health.put("emailConfigured", workspaceEmail.configured());
    health.put("kakaoConfigured", kakao.configured());
    health.put("kakaoVerified", notificationTest.kakaoVerified());
    health.put("workerEnabled", notificationProperties.workerEnabled());
    return health;
  }

  @PostMapping("/notifications/test")
  public Map<String, Object> testNotification(
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var parsed = validation.notificationTest(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    return notificationTest.send(
        validation.stringValue(parsed.data().get("channel")),
        validation.stringValue(parsed.data().get("recipient")),
        validation.stringValue(parsed.data().get("templateKey")),
        validation.stringValue(parsed.data().get("customerName")),
        validation.stringValue(parsed.data().get("inquiryNumber"))
    );
  }

  @GetMapping("/notifications/templates")
  public Map<String, Object> notificationTemplates(HttpServletRequest request) {
    auth.requireAdmin(request);
    return Map.of("items", notifications.listTemplates());
  }

  @PostMapping("/notifications/templates/{templateKey}/versions")
  public ResponseEntity<Map<String, Object>> createNotificationTemplateVersion(
      @PathVariable String templateKey,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var base = notifications.getLatestTemplate(templateKey);
    if (base == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification template not found");
    }
    var parsed = validation.notificationTemplate(
        body,
        validation.stringValue(base.get("channel"))
    );
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var unsupportedVariables = new java.util.LinkedHashSet<String>();
    unsupportedVariables.addAll(notificationTemplateRenderer.validateVariables(
        validation.stringValue(parsed.data().get("subject"))
    ));
    unsupportedVariables.addAll(notificationTemplateRenderer.validateVariables(
        validation.stringValue(parsed.data().get("body"))
    ));
    if (!unsupportedVariables.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Unsupported notification template variables: " + String.join(", ", unsupportedVariables)
      );
    }
    var isKakao = "kakao".equals(validation.stringValue(base.get("channel")));
    var activate = validation.booleanValue(parsed.data().get("isActive"), false);
    if (isKakao && activate
        && (!"approved".equals(validation.stringValue(parsed.data().get("approvalStatus")))
            || validation.stringValue(parsed.data().get("providerTemplateCode")).isBlank())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "An active Kakao template must be externally approved and have a provider template code."
      );
    }
    var template = notifications.createTemplateVersion(templateKey, base, parsed.data());
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("template", template));
  }

  @GetMapping("/export")
  public ResponseEntity<Map<String, Object>> export(HttpServletRequest request) {
    auth.requireAdmin(request);
    var snapshot = snapshots.exportSnapshot();
    var headers = new HttpHeaders();
    headers.setCacheControl(CacheControl.noStore());
    headers.setContentDisposition(ContentDisposition.attachment().filename(exportFilename(snapshot.get("exportedAt"))).build());
    return ResponseEntity.ok().headers(headers).body(snapshot);
  }

  @PostMapping("/import")
  public Map<String, Object> importSnapshot(
      @RequestBody Map<String, Object> snapshot,
      @RequestParam(defaultValue = "0") String replace,
      HttpServletRequest request
  ) {
    auth.requireAdmin(request);
    var counts = snapshots.counts(snapshot);
    var totalRows = counts.stream().mapToLong(item -> ((Number) item.get("count")).longValue()).sum();
    var shouldReplace = "1".equals(replace) || "true".equalsIgnoreCase(replace);
    if (shouldReplace) {
      snapshots.replace(snapshot);
    }
    return Map.of(
        "dryRun", !shouldReplace,
        "replaced", shouldReplace,
        "schemaVersion", snapshot.get("schemaVersion"),
        "exportedAt", snapshot.getOrDefault("exportedAt", ""),
        "totalRows", totalRows,
        "counts", counts
    );
  }

  @GetMapping("/status")
  public ResponseEntity<Map<String, Object>> status(HttpServletRequest request) {
    auth.requireAdmin(request);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(status.status());
  }

  private String exportFilename(Object exportedAt) {
    return "daeho-cms-export-" + String.valueOf(exportedAt).replaceAll("[:.]", "-") + ".json";
  }
}
