package com.daeho.cms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ApiExceptionHandler;
import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.security.AdminAuth;
import com.daeho.cms.service.AdminPasswordService;
import com.daeho.cms.service.CmsSnapshotService;
import com.daeho.cms.service.CmsStatusService;
import com.daeho.cms.service.EmailNotificationService;
import com.daeho.cms.service.MediaStorageService;
import com.daeho.cms.service.RequestValidation;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CmsHttpContractTest {
  private static final String ADMIN_KEY = "test-key";

  private CmsRepository repository;
  private MediaStorageService mediaStorage;
  private EmailNotificationService email;
  private CmsSnapshotService snapshots;
  private CmsStatusService status;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    repository = mock(CmsRepository.class);
    mediaStorage = mock(MediaStorageService.class);
    email = mock(EmailNotificationService.class);
    snapshots = mock(CmsSnapshotService.class);
    status = mock(CmsStatusService.class);

    var auth = new AdminAuth(new CmsProperties(
        ADMIN_KEY,
        "",
        "",
        false,
        Path.of("/tmp/uploads"),
        "/uploads",
        "",
        "local",
        "",
        "",
        "",
        "",
        "",
        ""
    ));
    var validation = new RequestValidation();
    mvc = MockMvcBuilders.standaloneSetup(
            new AdminCmsController(auth, repository, validation, mediaStorage, email, snapshots, status, mock(AdminPasswordService.class)),
            new PublicCmsController(repository, validation),
            new PublicInquiryController(repository, validation, email)
        )
        .setControllerAdvice(new ApiExceptionHandler())
        .build();
  }

  @Test
  void rejectsAdminRequestsWithoutApiKey() throws Exception {
    mvc.perform(get("/api/admin/pages"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
  }

  @Test
  void servesAdminPageEndpoints() throws Exception {
    when(repository.listPages()).thenReturn(List.of(page()));
    when(repository.getPage("home")).thenReturn(page());
    when(repository.upsertPage(eq("home"), anyMap())).thenReturn(page());

    mvc.perform(get("/api/admin/pages").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].pageKey").value("home"));

    mvc.perform(get("/api/admin/pages/home").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.pageKey").value("home"));

    mvc.perform(put("/api/admin/pages/home")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"section":"site","sortOrder":1,"content":{"ko":{"title":"홈"},"en":{"title":"Home"}},"seo":{"ko":{},"en":{}}}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.section").value("site"));
  }

  @Test
  void servesAdminNewsEndpoints() throws Exception {
    when(repository.listNews()).thenReturn(List.of(news()));
    when(repository.getNews("news-1")).thenReturn(news());
    when(repository.createNews(anyMap())).thenReturn(news());
    when(repository.updateNews(eq("news-1"), anyMap())).thenReturn(news());
    when(repository.deleteNews("news-1")).thenReturn(true);

    mvc.perform(get("/api/admin/news").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].slug").value("launch"));

    mvc.perform(post("/api/admin/news")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(newsPayload()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.item.id").value("news-1"));

    mvc.perform(get("/api/admin/news/news-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.slug").value("launch"));

    mvc.perform(put("/api/admin/news/news-1")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(newsPayload()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.id").value("news-1"));

    mvc.perform(delete("/api/admin/news/news-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void servesAdminCollectionEndpoints() throws Exception {
    when(repository.listCollections()).thenReturn(List.of(collection()));
    when(repository.getCollection("collection-1")).thenReturn(collection());
    when(repository.createCollection(anyMap())).thenReturn(collection());
    when(repository.updateCollection(eq("collection-1"), anyMap())).thenReturn(collection());
    when(repository.deleteCollection("collection-1")).thenReturn(true);

    mvc.perform(get("/api/admin/collections").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].slug").value("champion"));

    mvc.perform(post("/api/admin/collections")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(collectionPayload()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.item.id").value("collection-1"));

    mvc.perform(get("/api/admin/collections/collection-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.slug").value("champion"));

    mvc.perform(put("/api/admin/collections/collection-1")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(collectionPayload()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.id").value("collection-1"));

    mvc.perform(delete("/api/admin/collections/collection-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void servesAdminMediaEndpoints() throws Exception {
    when(repository.listMedia()).thenReturn(List.of(media()));
    when(repository.getMedia("media-1")).thenReturn(media());
    when(repository.createMedia(anyMap())).thenReturn(media());
    when(repository.updateMedia(eq("media-1"), anyMap())).thenReturn(media());
    when(repository.deleteMedia("media-1")).thenReturn(true);
    when(mediaStorage.uploadError(any(MultipartFile.class))).thenReturn("");
    when(mediaStorage.store(any(MultipartFile.class), eq("upload.png"), eq("alt ko"), eq("alt en"))).thenReturn(media());
    doNothing().when(mediaStorage).deleteStoredFile(anyMap());

    mvc.perform(get("/api/admin/media").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].filename").value("image.png"));

    mvc.perform(post("/api/admin/media")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"filename":"image.png","path":"uploads/image.png","url":"/uploads/image.png","mimeType":"image/png","sizeBytes":3}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.item.id").value("media-1"));

    var file = new MockMultipartFile("file", "upload.png", "image/png", new byte[] {1, 2, 3});
    mvc.perform(multipart("/api/admin/media")
            .file(file)
            .param("filename", "upload.png")
            .param("altKo", "alt ko")
            .param("altEn", "alt en")
            .header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.item.url").value("/uploads/image.png"));

    mvc.perform(get("/api/admin/media/media-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.filename").value("image.png"));

    mvc.perform(patch("/api/admin/media/media-1")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"altKo\":\"새 이미지\",\"altEn\":\"Image\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.id").value("media-1"));

    mvc.perform(delete("/api/admin/media/media-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void servesAdminInquiryEndpoints() throws Exception {
    when(repository.listInquiries("new", "contact")).thenReturn(List.of(inquiry()));
    when(repository.getInquiry("inquiry-1")).thenReturn(inquiry());
    when(repository.listEmailEventsForInquiry("inquiry-1")).thenReturn(List.of(emailEvent()));
    when(repository.updateInquiryStatus(eq("inquiry-1"), anyMap())).thenReturn(inquiry());
    when(email.notifyInquiry(anyMap())).thenReturn(Map.of("status", "skipped"));

    mvc.perform(get("/api/admin/inquiries?status=new&source=contact").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value("inquiry-1"));

    mvc.perform(get("/api/admin/inquiries/inquiry-1").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.emailEvents[0].status").value("skipped"));

    mvc.perform(patch("/api/admin/inquiries/inquiry-1")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"contacted\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.inquiry.id").value("inquiry-1"));

    mvc.perform(post("/api/admin/inquiries/inquiry-1/notify").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email.status").value("skipped"));
  }

  @Test
  void servesImportExportAndStatusEndpoints() throws Exception {
    var snapshot = snapshot();
    when(snapshots.exportSnapshot()).thenReturn(snapshot);
    when(snapshots.counts(anyMap())).thenReturn(List.of(Map.of("table", "cms_pages", "count", 1)));
    when(status.status()).thenReturn(statusPayload());

    mvc.perform(get("/api/admin/export").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("daeho-cms-export-")))
        .andExpect(jsonPath("$.schemaVersion").value(1));

    mvc.perform(post("/api/admin/import")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"schemaVersion\":1,\"exportedAt\":\"2026-06-27T00:00:00Z\",\"tables\":{\"cms_pages\":[]}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.dryRun").value(true));

    mvc.perform(post("/api/admin/import?replace=1")
            .header("x-admin-api-key", ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"schemaVersion\":1,\"exportedAt\":\"2026-06-27T00:00:00Z\",\"tables\":{\"cms_pages\":[]}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.replaced").value(true));
    verify(snapshots).replace(anyMap());

    mvc.perform(get("/api/admin/status").header("x-admin-api-key", ADMIN_KEY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.database.engine").value("postgresql"));
  }

  @Test
  void servesPublicCmsEndpoints() throws Exception {
    when(repository.getPage("home")).thenReturn(page());
    when(repository.listPublicNews("ko")).thenReturn(List.of(publicNews()));
    when(repository.getPublicNews("launch", "ko")).thenReturn(publicNews());
    when(repository.listPublicCollections("ko")).thenReturn(List.of(publicCollection()));
    when(repository.getPublicCollection("champion", "ko")).thenReturn(publicCollection());

    mvc.perform(get("/api/cms/pages/home?locale=ko"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.title").value("홈"));

    mvc.perform(get("/api/cms/news?locale=ko"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].slug").value("launch"));

    mvc.perform(get("/api/cms/news/launch?locale=ko"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.title").value("뉴스"));

    mvc.perform(get("/api/cms/collections?locale=ko"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].slug").value("champion"));

    mvc.perform(get("/api/cms/collections/champion?locale=ko"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.title").value("챔피언"));
  }

  @Test
  void servesPublicInquiryEndpointsAndValidationShape() throws Exception {
    when(repository.createContactInquiry(anyMap(), anyMap())).thenReturn(inquiry());
    when(repository.createGolfInquiry(anyMap(), anyMap())).thenReturn(inquiry());
    when(email.notifyInquiry(anyMap())).thenReturn(Map.of("status", "skipped"));

    mvc.perform(post("/api/inquiries/contact")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"locale\":\"ko\",\"name\":\"Tester\",\"contact\":\"tester@example.com\",\"message\":\"Hello\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.inquiry.id").value("inquiry-1"))
        .andExpect(jsonPath("$.email.status").value("skipped"));

    mvc.perform(post("/api/inquiries/golf")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"locale\":\"ko\",\"name\":\"Tester\",\"contact\":\"tester@example.com\",\"quantity\":2,\"selectedHead\":\"ball\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.inquiry.id").value("inquiry-1"));

    mvc.perform(post("/api/inquiries/contact")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Validation failed"))
        .andExpect(jsonPath("$.issues[0].path").exists());
  }

  private Map<String, Object> page() {
    return Map.of(
        "pageKey", "home",
        "section", "site",
        "sortOrder", 1,
        "content", Map.of("ko", Map.of("title", "홈"), "en", Map.of("title", "Home")),
        "seo", Map.of("ko", Map.of("title", "홈 SEO"), "en", Map.of("title", "Home SEO")),
        "createdAt", "2026-06-27T00:00:00Z",
        "updatedAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> news() {
    return map(
        "id", "news-1",
        "slug", "launch",
        "category", "brand",
        "imagePath", "news.png",
        "publishedAt", "2026-06-27",
        "isFeatured", true,
        "isVisible", true,
        "sortOrder", 1,
        "translations", Map.of("ko", Map.of("title", "뉴스")),
        "createdAt", "2026-06-27T00:00:00Z",
        "updatedAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> publicNews() {
    return map(
        "id", "news-1",
        "slug", "launch",
        "category", "brand",
        "imagePath", "news.png",
        "publishedAt", "2026-06-27",
        "title", "뉴스",
        "categoryLabel", "브랜드",
        "excerpt", "excerpt",
        "body", Map.of("lead", "lead"),
        "tags", List.of("tag"),
        "seoTitle", "seo",
        "seoDescription", "desc",
        "ogImagePath", "news.png"
    );
  }

  private Map<String, Object> collection() {
    return map(
        "id", "collection-1",
        "slug", "champion",
        "category", "ring",
        "sportCategory", "baseball",
        "imagePath", "ring.png",
        "gallery", List.of("ring.png"),
        "specs", Map.of("year", "2026"),
        "isVisible", true,
        "sortOrder", 1,
        "translations", Map.of("ko", Map.of("title", "챔피언")),
        "createdAt", "2026-06-27T00:00:00Z",
        "updatedAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> publicCollection() {
    return map(
        "id", "collection-1",
        "slug", "champion",
        "category", "ring",
        "sportCategory", "baseball",
        "imagePath", "ring.png",
        "gallery", List.of("ring.png"),
        "specs", Map.of("year", "2026"),
        "title", "챔피언",
        "caption", "caption",
        "story", "story",
        "categoryLabel", "반지",
        "sportCategoryLabel", "야구",
        "seoTitle", "seo",
        "seoDescription", "desc",
        "ogImagePath", "ring.png"
    );
  }

  private Map<String, Object> media() {
    return map(
        "id", "media-1",
        "filename", "image.png",
        "path", "uploads/image.png",
        "url", "/uploads/image.png",
        "mimeType", "image/png",
        "sizeBytes", 3,
        "altKo", "이미지",
        "altEn", "Image",
        "storageProvider", "local",
        "storageKey", "image.png",
        "createdAt", "2026-06-27T00:00:00Z",
        "updatedAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> inquiry() {
    return map(
        "id", "inquiry-1",
        "source", "contact",
        "status", "new",
        "locale", "ko",
        "name", "Tester",
        "contact", "tester@example.com",
        "organization", "",
        "inquiryType", "",
        "team", "",
        "dueDate", "",
        "useCase", "",
        "message", "Hello",
        "configuration", Map.of(),
        "pagePath", "/ko/contact",
        "userAgent", "JUnit",
        "ipAddress", "127.0.0.1",
        "createdAt", "2026-06-27T00:00:00Z",
        "updatedAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> emailEvent() {
    return Map.of(
        "id", "email-1",
        "inquiryId", "inquiry-1",
        "eventType", "inquiry_notification",
        "recipient", "",
        "subject", "subject",
        "status", "skipped",
        "providerMessageId", "",
        "errorMessage", "SMTP is not configured.",
        "createdAt", "2026-06-27T00:00:00Z"
    );
  }

  private Map<String, Object> snapshot() {
    return Map.of(
        "schemaVersion", 1,
        "exportedAt", "2026-06-27T00:00:00Z",
        "tables", Map.of("cms_pages", List.of())
    );
  }

  private Map<String, Object> statusPayload() {
    return Map.of(
        "checkedAt", "2026-06-27T00:00:00Z",
        "database", Map.of("path", "jdbc:postgresql://localhost/daeho", "engine", "postgresql"),
        "environment", Map.of("persistence", "configured"),
        "security", Map.of("hasAdminApiKey", true),
        "email", Map.of("configured", false),
        "latest", Map.of("inquiryCreatedAt", "", "emailEventCreatedAt", ""),
        "tables", List.of(Map.of("table", "cms_pages", "count", 1))
    );
  }

  private String newsPayload() {
    return """
        {
          "slug":"launch",
          "category":"brand",
          "imagePath":"news.png",
          "publishedAt":"2026-06-27",
          "isFeatured":true,
          "isVisible":true,
          "sortOrder":1,
          "translations":{"ko":{"title":"뉴스","body":{"lead":"lead"},"tags":["tag"]}}
        }
        """;
  }

  private String collectionPayload() {
    return """
        {
          "slug":"champion",
          "category":"ring",
          "sportCategory":"baseball",
          "imagePath":"ring.png",
          "gallery":["ring.png"],
          "specs":{"year":"2026"},
          "isVisible":true,
          "sortOrder":1,
          "translations":{"ko":{"title":"챔피언","caption":"caption"}}
        }
        """;
  }

  private Map<String, Object> map(Object... values) {
    var map = new LinkedHashMap<String, Object>();
    for (var index = 0; index < values.length; index += 2) {
      map.put((String) values[index], values[index + 1]);
    }
    return map;
  }
}
