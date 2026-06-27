package com.daeho.cms.controller;

import com.daeho.cms.error.ValidationFailedException;
import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.CmsSnapshotService;
import com.daeho.cms.service.CmsStatusService;
import com.daeho.cms.service.EmailNotificationService;
import com.daeho.cms.service.MediaStorageService;
import com.daeho.cms.service.RequestValidation;
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

@RestController
@RequestMapping("/api/admin")
public class AdminCmsController {
  private final AdminAuth auth;
  private final CmsRepository repository;
  private final RequestValidation validation;
  private final MediaStorageService mediaStorage;
  private final EmailNotificationService email;
  private final CmsSnapshotService snapshots;
  private final CmsStatusService status;

  public AdminCmsController(
      AdminAuth auth,
      CmsRepository repository,
      RequestValidation validation,
      MediaStorageService mediaStorage,
      EmailNotificationService email,
      CmsSnapshotService snapshots,
      CmsStatusService status
  ) {
    this.auth = auth;
    this.repository = repository;
    this.validation = validation;
    this.mediaStorage = mediaStorage;
    this.email = email;
    this.snapshots = snapshots;
    this.status = status;
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

  @GetMapping("/inquiries/{id}")
  public Map<String, Object> inquiry(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var inquiry = repository.getInquiry(id);
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return Map.of("inquiry", inquiry, "emailEvents", repository.listEmailEventsForInquiry(id));
  }

  @PatchMapping("/inquiries/{id}")
  public Map<String, Object> updateInquiry(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    auth.requireAdmin(request);
    var parsed = validation.inquiryStatus(body);
    if (!parsed.success()) {
      throw new ValidationFailedException(parsed.issues());
    }
    var inquiry = repository.updateInquiryStatus(id, parsed.data());
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return Map.of("inquiry", inquiry, "emailEvents", repository.listEmailEventsForInquiry(id));
  }

  @PostMapping("/inquiries/{id}/notify")
  public Map<String, Object> resendInquiryEmail(@PathVariable String id, HttpServletRequest request) {
    auth.requireAdmin(request);
    var inquiry = repository.getInquiry(id);
    if (inquiry == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found");
    }
    return Map.of("email", email.notifyInquiry(inquiry));
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
