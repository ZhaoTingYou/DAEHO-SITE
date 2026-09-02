package com.daeho.cms.repository;

import com.daeho.cms.service.JsonSupport;
import com.daeho.cms.service.InquiryContactMatcher;
import com.daeho.cms.service.RequestValidation;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class CmsRepository {
  public static final List<String> EXPORT_TABLES = List.of(
      "cms_pages",
      "cms_news",
      "cms_news_translations",
      "cms_collections",
      "cms_collection_translations",
      "cms_media",
      "cms_inquiry_statuses",
      "cms_inquiries",
      "cms_inquiry_link_events",
      "cms_email_events",
      "cms_inquiry_status_events",
      "cms_notification_settings",
      "cms_notification_templates",
      "cms_notification_jobs",
      "cms_notification_attempts"
  );
  private static final List<String> DELETE_TABLES = reverseExportTables();
  private static final Set<String> JSON_COLUMNS = Set.of(
      "content_ko", "content_en", "seo_ko", "seo_en", "body_json", "tags_json",
      "gallery_json", "specs_json", "configuration_json"
  );
  private static final Set<String> BOOLEAN_COLUMNS = Set.of(
      "is_featured", "is_visible", "internal_email_enabled", "customer_email_enabled",
      "kakao_enabled", "is_active", "is_system", "retry_blocked"
  );
  private static final Set<String> TIMESTAMPTZ_COLUMNS = Set.of(
      "created_at", "updated_at", "next_attempt_at"
  );
  private static final Set<String> LEGACY_PAGE_COLUMNS = Set.of("content_zh", "seo_zh");
  private static final Set<String> LEGACY_MEDIA_COLUMNS = Set.of("alt_zh");
  private static final Set<String> NON_EXPORTABLE_JOB_COLUMNS = Set.of("verification_fingerprint");

  private final JdbcTemplate jdbc;
  private final JsonSupport json;
  private final RequestValidation validation;

  public CmsRepository(JdbcTemplate jdbc, JsonSupport json, RequestValidation validation) {
    this.jdbc = jdbc;
    this.json = json;
    this.validation = validation;
  }

  private static List<String> reverseExportTables() {
    var tables = new ArrayList<>(EXPORT_TABLES);
    java.util.Collections.reverse(tables);
    return List.copyOf(tables);
  }

  public List<Map<String, Object>> listPages() {
    return jdbc.query("SELECT * FROM cms_pages ORDER BY sort_order ASC, page_key ASC", this::mapPage);
  }

  public Map<String, Object> getPage(String pageKey) {
    return jdbc.query("SELECT * FROM cms_pages WHERE page_key = ?", this::mapPage, pageKey)
        .stream()
        .findFirst()
        .orElse(null);
  }

  @Transactional
  public Map<String, Object> upsertPage(String pageKey, Map<String, Object> payload) {
    var existing = getPage(pageKey);
    var content = validation.objectValue(payload.get("content"));
    var seo = validation.objectValue(payload.get("seo"));
    var existingContent = existing == null ? Map.<String, Object>of() : validation.objectValue(existing.get("content"));
    var existingSeo = existing == null ? Map.<String, Object>of() : validation.objectValue(existing.get("seo"));

    jdbc.update("""
        INSERT INTO cms_pages (
          page_key, section, sort_order, content_ko, content_en, seo_ko, seo_en, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?::timestamptz, now()), now())
        ON CONFLICT(page_key) DO UPDATE SET
          section = excluded.section,
          sort_order = excluded.sort_order,
          content_ko = excluded.content_ko,
          content_en = excluded.content_en,
          seo_ko = excluded.seo_ko,
          seo_en = excluded.seo_en,
          updated_at = now()
        """,
        pageKey,
        validation.stringValue(payload.get("section")),
        validation.intValue(payload.get("sortOrder"), 0),
        json.jsonb(content.getOrDefault("ko", validation.objectValue(existingContent.get("ko")))),
        json.jsonb(content.getOrDefault("en", validation.objectValue(existingContent.get("en")))),
        json.jsonb(seo.getOrDefault("ko", validation.objectValue(existingSeo.get("ko")))),
        json.jsonb(seo.getOrDefault("en", validation.objectValue(existingSeo.get("en")))),
        existing == null ? null : existing.get("createdAt")
    );
    return getPage(pageKey);
  }

  public List<Map<String, Object>> listNews() {
    return jdbc.query(
        "SELECT * FROM cms_news ORDER BY sort_order ASC, published_at DESC, created_at DESC",
        (rs, rowNum) -> mapNews(rs, getNewsTranslations(rs.getString("id")))
    );
  }

  public List<Map<String, Object>> listPublicNews(String locale) {
    return jdbc.query("""
        SELECT n.*, t.locale, t.title, t.category_label, t.excerpt, t.body_json, t.tags_json
        FROM cms_news n
        JOIN cms_news_translations t ON t.news_id = n.id AND t.locale = ?
        WHERE n.is_visible = true
        ORDER BY n.sort_order ASC, n.published_at DESC, n.created_at DESC
        """, this::mapPublicNews, locale);
  }

  public Map<String, Object> getNews(String idOrSlug) {
    return jdbc.query(
        "SELECT * FROM cms_news WHERE id = ? OR slug = ?",
        (rs, rowNum) -> mapNews(rs, getNewsTranslations(rs.getString("id"))),
        idOrSlug,
        idOrSlug
    ).stream().findFirst().orElse(null);
  }

  public Map<String, Object> getPublicNews(String slug, String locale) {
    return jdbc.query("""
        SELECT n.*, t.locale, t.title, t.category_label, t.excerpt, t.body_json, t.tags_json
        FROM cms_news n
        JOIN cms_news_translations t ON t.news_id = n.id AND t.locale = ?
        WHERE n.slug = ? AND n.is_visible = true
        """, this::mapPublicNews, locale, slug).stream().findFirst().orElse(null);
  }

  @Transactional
  public Map<String, Object> createNews(Map<String, Object> payload) {
    var id = UUID.randomUUID().toString();
    var slug = firstNonBlank(payload.get("slug"), id);
    jdbc.update("""
        INSERT INTO cms_news (
          id, slug, category, image_path, mobile_image_path, published_at,
          is_featured, is_visible, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
        """,
        id,
        slug,
        validation.stringValue(payload.get("category")),
        validation.stringValue(payload.get("imagePath")),
        validation.stringValue(payload.get("mobileImagePath")),
        validation.stringValue(payload.get("publishedAt")),
        validation.booleanValue(payload.get("isFeatured"), false),
        validation.booleanValue(payload.get("isVisible"), true),
        validation.intValue(payload.get("sortOrder"), 0)
    );
    upsertNewsTranslations(id, payload);
    return getNews(id);
  }

  @Transactional
  public Map<String, Object> updateNews(String idOrSlug, Map<String, Object> payload) {
    var existing = getNews(idOrSlug);
    if (existing == null) {
      return null;
    }
    jdbc.update("""
        UPDATE cms_news SET
          slug = ?,
          category = ?,
          image_path = ?,
          mobile_image_path = ?,
          published_at = ?,
          is_featured = ?,
          is_visible = ?,
          sort_order = ?,
          updated_at = now()
        WHERE id = ?
        """,
        firstNonBlank(payload.get("slug"), existing.get("slug")),
        validation.stringValue(payload.get("category")),
        validation.stringValue(payload.get("imagePath")),
        validation.stringValue(payload.get("mobileImagePath")),
        validation.stringValue(payload.get("publishedAt")),
        validation.booleanValue(payload.get("isFeatured"), false),
        validation.booleanValue(payload.get("isVisible"), true),
        validation.intValue(payload.get("sortOrder"), 0),
        existing.get("id")
    );
    upsertNewsTranslations(existing.get("id").toString(), payload);
    return getNews(existing.get("id").toString());
  }

  @Transactional
  public boolean deleteNews(String idOrSlug) {
    var existing = getNews(idOrSlug);
    if (existing == null) {
      return false;
    }
    jdbc.update("DELETE FROM cms_news WHERE id = ?", existing.get("id"));
    return true;
  }

  public List<Map<String, Object>> listCollections() {
    return jdbc.query(
        "SELECT * FROM cms_collections ORDER BY sort_order ASC, created_at DESC",
        (rs, rowNum) -> mapCollection(rs, getCollectionTranslations(rs.getString("id")))
    );
  }

  public List<Map<String, Object>> listPublicCollections(String locale) {
    return jdbc.query("""
        SELECT c.*, t.locale, t.title,
          COALESCE(NULLIF(t.story, ''), t.caption) AS resolved_story,
          t.sport_category_label,
          COALESCE(NULLIF(c.sport_category, ''), c.specs_json ->> 'sportCategory') AS resolved_sport_category
        FROM cms_collections c
        JOIN cms_collection_translations t ON t.collection_id = c.id AND t.locale = ?
        WHERE c.is_visible = true
          AND c.category IN ('champion', 'bespoke')
        ORDER BY c.sort_order ASC, c.created_at DESC
        """, this::mapPublicCollection, locale);
  }

  public Map<String, Object> getCollection(String idOrSlug) {
    return jdbc.query(
        "SELECT * FROM cms_collections WHERE id = ? OR slug = ?",
        (rs, rowNum) -> mapCollection(rs, getCollectionTranslations(rs.getString("id"))),
        idOrSlug,
        idOrSlug
    ).stream().findFirst().orElse(null);
  }

  public Map<String, Object> getPublicCollection(String slug, String locale) {
    return jdbc.query("""
        SELECT c.*, t.locale, t.title,
          COALESCE(NULLIF(t.story, ''), t.caption) AS resolved_story,
          t.sport_category_label,
          COALESCE(NULLIF(c.sport_category, ''), c.specs_json ->> 'sportCategory') AS resolved_sport_category
        FROM cms_collections c
        JOIN cms_collection_translations t ON t.collection_id = c.id AND t.locale = ?
        WHERE c.slug = ? AND c.is_visible = true
          AND c.category IN ('champion', 'bespoke')
        """, this::mapPublicCollection, locale, slug).stream().findFirst().orElse(null);
  }

  @Transactional
  public Map<String, Object> createCollection(Map<String, Object> payload) {
    var id = UUID.randomUUID().toString();
    var slug = firstNonBlank(payload.get("slug"), id);
    jdbc.update("""
        INSERT INTO cms_collections (
          id, slug, category, sport_category, image_path, gallery_json, specs_json,
          is_visible, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
        """,
        id,
        slug,
        validation.stringValue(payload.get("category")),
        validation.stringValue(payload.get("sportCategory")),
        validation.stringValue(payload.get("imagePath")),
        json.jsonb(payload.getOrDefault("gallery", List.of())),
        json.jsonb(payload.getOrDefault("specs", Map.of())),
        validation.booleanValue(payload.get("isVisible"), true),
        validation.intValue(payload.get("sortOrder"), 0)
    );
    upsertCollectionTranslations(id, payload);
    return getCollection(id);
  }

  @Transactional
  public Map<String, Object> updateCollection(String idOrSlug, Map<String, Object> payload) {
    var existing = getCollection(idOrSlug);
    if (existing == null) {
      return null;
    }
    jdbc.update("""
        UPDATE cms_collections SET
          slug = ?,
          category = ?,
          sport_category = ?,
          image_path = ?,
          gallery_json = ?,
          specs_json = ?,
          is_visible = ?,
          sort_order = ?,
          updated_at = now()
        WHERE id = ?
        """,
        firstNonBlank(payload.get("slug"), existing.get("slug")),
        validation.stringValue(payload.get("category")),
        validation.stringValue(payload.get("sportCategory")),
        validation.stringValue(payload.get("imagePath")),
        json.jsonb(payload.getOrDefault("gallery", List.of())),
        json.jsonb(payload.getOrDefault("specs", Map.of())),
        validation.booleanValue(payload.get("isVisible"), true),
        validation.intValue(payload.get("sortOrder"), 0),
        existing.get("id")
    );
    upsertCollectionTranslations(existing.get("id").toString(), payload);
    return getCollection(existing.get("id").toString());
  }

  @Transactional
  public boolean deleteCollection(String idOrSlug) {
    var existing = getCollection(idOrSlug);
    if (existing == null) {
      return false;
    }
    jdbc.update("DELETE FROM cms_collections WHERE id = ?", existing.get("id"));
    return true;
  }

  @Transactional
  public Map<String, Object> createContactInquiry(Map<String, Object> payload, Map<String, String> requestMeta) {
    return createInquiry(Map.ofEntries(
        Map.entry("source", "contact"),
        Map.entry("locale", validation.stringValue(payload.get("locale"))),
        Map.entry("name", validation.stringValue(payload.get("name"))),
        Map.entry("phone", validation.stringValue(payload.get("phone"))),
        Map.entry("email", validation.stringValue(payload.get("email"))),
        Map.entry("organization", validation.stringValue(payload.get("organization"))),
        Map.entry("inquiryType", validation.stringValue(payload.get("type"))),
        Map.entry("team", ""),
        Map.entry("dueDate", ""),
        Map.entry("useCase", ""),
        Map.entry("message", validation.stringValue(payload.get("message"))),
        Map.entry("pagePath", validation.stringValue(payload.get("pagePath"))),
        Map.entry("configuration", Map.of()),
        Map.entry("userAgent", requestMeta.getOrDefault("userAgent", "")),
        Map.entry("ipAddress", requestMeta.getOrDefault("ipAddress", "")),
        Map.entry("customerId", requestMeta.getOrDefault("customerId", "")),
        Map.entry("linkSource", requestMeta.getOrDefault("linkSource", ""))
    ));
  }

  @Transactional
  public Map<String, Object> createGolfInquiry(Map<String, Object> payload, Map<String, String> requestMeta) {
    var quantity = payload.get("quantity");
    var values = new LinkedHashMap<String, Object>();
    values.put("source", "golf");
    values.put("locale", validation.stringValue(payload.get("locale")));
    values.put("name", validation.stringValue(payload.get("name")));
    values.put("phone", validation.stringValue(payload.get("phone")));
    values.put("email", validation.stringValue(payload.get("email")));
    values.put("organization", "");
    values.put("inquiryType", "");
    values.put("team", validation.stringValue(payload.get("team")));
    values.put("quantity", quantity);
    values.put("dueDate", validation.stringValue(payload.get("due")));
    values.put("useCase", validation.stringValue(payload.get("use")));
    values.put("message", validation.stringValue(payload.get("message")));
    values.put("pagePath", validation.stringValue(payload.get("pagePath")));
    values.put("configuration", Map.of(
        "selectedHead", validation.stringValue(payload.get("selectedHead")),
        "selectedShaft", validation.stringValue(payload.get("selectedShaft")),
        "selectedStyle", validation.stringValue(payload.get("selectedStyle")),
        "engravingSample", validation.stringValue(payload.get("engravingSample"))
    ));
    values.put("userAgent", requestMeta.getOrDefault("userAgent", ""));
    values.put("ipAddress", requestMeta.getOrDefault("ipAddress", ""));
    values.put("customerId", requestMeta.getOrDefault("customerId", ""));
    values.put("linkSource", requestMeta.getOrDefault("linkSource", ""));
    return createInquiry(values);
  }

  @Transactional
  public Map<String, Object> createTelegramInquiry(
      Map<String, Object> payload,
      Map<String, String> requestMeta
  ) {
    var contact = validation.stringValue(payload.get("contact"));
    var email = contact.contains("@") ? contact : "";
    var phone = email.isBlank() ? contact : "";
    var values = new LinkedHashMap<String, Object>();
    values.put("id", validation.stringValue(payload.get("inquiryId")));
    values.put("source", "telegram");
    values.put("locale", validation.stringValue(payload.get("locale")));
    values.put("name", validation.stringValue(payload.get("name")));
    values.put("phone", phone);
    values.put("email", email);
    values.put("organization", "");
    values.put("inquiryType", "telegram_live_chat");
    values.put("team", "");
    values.put("dueDate", "");
    values.put("useCase", "");
    values.put("message", validation.stringValue(payload.get("message")));
    values.put("pagePath", "/telegram/live-chat");
    values.put("configuration", Map.of(
        "telegramChatId", validation.stringValue(payload.get("telegramChatId")),
        "telegramUserId", validation.stringValue(payload.get("telegramUserId"))
    ));
    values.put("userAgent", requestMeta.getOrDefault("userAgent", "Telegram Bot"));
    values.put("ipAddress", "");
    return createInquiry(values);
  }

  @Transactional
  public Map<String, Object> createWebLiveChatInquiry(
      Map<String, Object> payload,
      Map<String, String> requestMeta
  ) {
    var contact = validation.stringValue(payload.get("contact"));
    var email = contact.contains("@") ? contact : "";
    var phone = email.isBlank() ? contact : "";
    var values = new LinkedHashMap<String, Object>();
    values.put("id", validation.stringValue(payload.get("inquiryId")));
    values.put("source", "web_live_chat");
    values.put("locale", validation.stringValue(payload.get("locale")));
    values.put("name", validation.stringValue(payload.get("name")));
    values.put("phone", phone);
    values.put("email", email);
    values.put("organization", "");
    values.put("inquiryType", "web_live_chat");
    values.put("team", "");
    values.put("dueDate", "");
    values.put("useCase", "");
    values.put("message", validation.stringValue(payload.get("message")));
    values.put("pagePath", "/live-chat");
    values.put("configuration", Map.of(
        "conversationId", validation.stringValue(payload.get("conversationId"))
    ));
    values.put("userAgent", requestMeta.getOrDefault("userAgent", ""));
    values.put("ipAddress", "");
    return createInquiry(values);
  }

  public List<Map<String, Object>> listCustomerInquiries(String customerId) {
    return jdbc.query("SELECT * FROM cms_inquiries WHERE customer_id = ?::uuid ORDER BY created_at DESC",
        this::mapInquiry, customerId);
  }

  public Map<String, Object> getCustomerInquiry(String customerId, String id) {
    return jdbc.query("SELECT * FROM cms_inquiries WHERE customer_id = ?::uuid AND id = ?",
        this::mapInquiry, customerId, id).stream().findFirst().orElse(null);
  }

  @Transactional
  public Map<String, Object> claimInquiry(String id, String customerId, String suppliedContact) {
    var inquiry = getInquiry(id);
    if (inquiry == null) return Map.of("matched", false, "reason", "not_found");
    var linkedCustomerId = validation.stringValue(inquiry.get("customerId"));
    if (!linkedCustomerId.isBlank()) return Map.of("matched", linkedCustomerId.equals(customerId),
        "reason", linkedCustomerId.equals(customerId) ? "already_linked" : "linked_to_another_customer");
    if (!InquiryContactMatcher.matches(validation.stringValue(inquiry.get("contact")),
        validation.stringValue(inquiry.get("phone")), validation.stringValue(inquiry.get("email")), suppliedContact)) {
      return Map.of("matched", false, "reason", "contact_mismatch");
    }
    return Map.of("matched", true, "reason", "exact_match");
  }

  @Transactional
  public Map<String, Object> linkInquiryByAdmin(String id, String customerId, String actor, String reason) {
    return linkInquiry(id, customerId, "admin", actor, reason);
  }

  @Transactional
  public Map<String, Object> linkInquiryByClaim(String id, String customerId, String actor, String reason) {
    return linkInquiry(id, customerId, "claim", actor, reason);
  }

  private Map<String, Object> linkInquiry(String id, String customerId, String source, String actor, String reason) {
    var existing = getInquiry(id);
    if (existing == null) return null;
    var linkedCustomerId = validation.stringValue(existing.get("customerId"));
    if (linkedCustomerId.equals(customerId)) return existing;
    if (!linkedCustomerId.isBlank()) return null;
    var updated = jdbc.update("""
        UPDATE cms_inquiries SET customer_id = ?::uuid, link_source = ?,
          linked_at = COALESCE(linked_at, now()), updated_at = now()
        WHERE id = ? AND (customer_id IS NULL OR customer_id = ?::uuid)
        """, customerId, source, id, customerId);
    if (updated != 1) return null;
    auditInquiryLink(id, customerId, source, actor, reason);
    return getInquiry(id);
  }

  @Transactional
  public Map<String, Object> unlinkInquiryByAdmin(String id, String actor, String reason) {
    var existing = getInquiry(id);
    if (existing == null) return null;
    var customerId = validation.stringValue(existing.get("customerId"));
    jdbc.update("UPDATE cms_inquiries SET customer_id = NULL, link_source = NULL, linked_at = NULL, updated_at = now() WHERE id = ?", id);
    auditInquiryLink(id, customerId, "unlink", actor, reason);
    return getInquiry(id);
  }

  @Transactional
  public int unlinkInquiriesForDeletedCustomer(String customerId) {
    var inquiryIds = jdbc.queryForList("SELECT id FROM cms_inquiries WHERE customer_id = ?::uuid", String.class, customerId);
    var unlinked = 0;
    for (var inquiryId : inquiryIds) {
      var updated = jdbc.update("UPDATE cms_inquiries SET customer_id = NULL, link_source = NULL, linked_at = NULL, updated_at = now() WHERE id = ? AND customer_id = ?::uuid", inquiryId, customerId);
      if (updated == 1) {
        unlinked++;
        auditInquiryLink(inquiryId, customerId, "unlink", "account-deletion", "retention unlink");
      }
    }
    return unlinked;
  }

  private void auditInquiryLink(String inquiryId, String customerId, String action, String actor, String reason) {
    jdbc.update("""
        INSERT INTO cms_inquiry_link_events (id, inquiry_id, customer_id, action, actor, reason, created_at)
        VALUES (?, ?, NULLIF(?, '')::uuid, ?, ?, ?, now())
        """, UUID.randomUUID().toString(), inquiryId, customerId, action,
        validation.stringValue(actor), validation.stringValue(reason));
  }

  public List<Map<String, Object>> listInquiries(String status, String source) {
    var clauses = new ArrayList<String>();
    var values = new ArrayList<Object>();
    if (status != null && !status.isBlank()) {
      clauses.add("status = ?");
      values.add(status);
    }
    if (source != null && !source.isBlank()) {
      clauses.add("source = ?");
      values.add(source);
    }
    var where = clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    return jdbc.query(
        "SELECT * FROM cms_inquiries" + where + " ORDER BY created_at DESC",
        this::mapInquiry,
        values.toArray()
    );
  }

  public List<Map<String, Object>> listInquiryStatuses() {
    return jdbc.query(
        "SELECT * FROM cms_inquiry_statuses ORDER BY sort_order ASC, code ASC",
        this::mapInquiryStatus
    );
  }

  public Map<String, Object> getInquiryStatus(String code) {
    return jdbc.query(
        "SELECT * FROM cms_inquiry_statuses WHERE code = ?",
        this::mapInquiryStatus,
        code
    ).stream().findFirst().orElse(null);
  }

  public Map<String, Object> getInquiryStatusForUpdate(String code) {
    return jdbc.query(
        "SELECT * FROM cms_inquiry_statuses WHERE code = ? FOR UPDATE",
        this::mapInquiryStatus,
        code
    ).stream().findFirst().orElse(null);
  }

  @Transactional
  public Map<String, Object> createInquiryStatus(Map<String, Object> payload) {
    var created = jdbc.update("""
        INSERT INTO cms_inquiry_statuses (
          code, label_ko, label_en, label_zh, color, sort_order,
          is_active, is_system, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, false, now(), now())
        ON CONFLICT (code) DO NOTHING
        """,
        validation.stringValue(payload.get("code")),
        validation.stringValue(payload.get("labelKo")),
        validation.stringValue(payload.get("labelEn")),
        validation.stringValue(payload.get("labelZh")),
        validation.stringValue(payload.get("color")),
        validation.intValue(payload.get("sortOrder"), 0),
        validation.booleanValue(payload.get("isActive"), true)
    );
    return created == 1 ? getInquiryStatus(validation.stringValue(payload.get("code"))) : null;
  }

  @Transactional
  public Map<String, Object> updateInquiryStatus(String code, Map<String, Object> payload) {
    var updated = jdbc.update("""
        UPDATE cms_inquiry_statuses SET
          label_ko = ?,
          label_en = ?,
          label_zh = ?,
          color = ?,
          sort_order = ?,
          is_active = CASE WHEN is_system THEN true ELSE ? END,
          updated_at = now()
        WHERE code = ?
          AND updated_at = ?::timestamptz
        """,
        validation.stringValue(payload.get("labelKo")),
        validation.stringValue(payload.get("labelEn")),
        validation.stringValue(payload.get("labelZh")),
        validation.stringValue(payload.get("color")),
        validation.intValue(payload.get("sortOrder"), 0),
        validation.booleanValue(payload.get("isActive"), true),
        code,
        validation.stringValue(payload.get("expectedUpdatedAt"))
    );
    return updated == 1 ? getInquiryStatus(code) : null;
  }

  public Map<String, Object> getInquiry(String id) {
    return jdbc.query("SELECT * FROM cms_inquiries WHERE id = ?", this::mapInquiry, id)
        .stream()
        .findFirst()
        .orElse(null);
  }

  @Transactional
  public Map<String, Object> updateInquiryStatusIfExpected(String id, String expectedStatus, String nextStatus) {
    var updated = jdbc.update("""
        UPDATE cms_inquiries
        SET status = ?, updated_at = now()
        WHERE id = ?
          AND status = ?
          AND EXISTS (
            SELECT 1 FROM cms_inquiry_statuses
            WHERE code = ? AND is_active = true
          )
        """,
        nextStatus,
        id,
        expectedStatus,
        nextStatus
    );
    return updated == 1 ? getInquiry(id) : null;
  }

  public List<Map<String, Object>> listMedia() {
    return jdbc.query("SELECT * FROM cms_media ORDER BY created_at DESC", this::mapMedia);
  }

  public Map<String, Object> getMedia(String id) {
    return jdbc.query("SELECT * FROM cms_media WHERE id = ?", this::mapMedia, id)
        .stream()
        .findFirst()
        .orElse(null);
  }

  @Transactional
  public Map<String, Object> createMedia(Map<String, Object> payload) {
    var id = UUID.randomUUID().toString();
    jdbc.update("""
        INSERT INTO cms_media (
          id, filename, path, url, mime_type, size_bytes, alt_ko, alt_en,
          storage_provider, storage_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
        ON CONFLICT(path) DO UPDATE SET
          filename = excluded.filename,
          url = excluded.url,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          alt_ko = CASE WHEN excluded.alt_ko = '' THEN cms_media.alt_ko ELSE excluded.alt_ko END,
          alt_en = CASE WHEN excluded.alt_en = '' THEN cms_media.alt_en ELSE excluded.alt_en END,
          storage_provider = excluded.storage_provider,
          storage_key = excluded.storage_key,
          updated_at = now()
        """,
        id,
        validation.stringValue(payload.get("filename")),
        validation.stringValue(payload.get("path")),
        validation.stringValue(payload.get("url")),
        validation.stringValue(payload.get("mimeType")),
        validation.longValue(payload.get("sizeBytes"), 0),
        validation.stringValue(payload.get("altKo")),
        validation.stringValue(payload.get("altEn")),
        firstNonBlank(payload.get("storageProvider"), "local"),
        validation.stringValue(payload.get("storageKey"))
    );
    return jdbc.query("SELECT * FROM cms_media WHERE path = ?", this::mapMedia, payload.get("path"))
        .stream()
        .findFirst()
        .orElse(null);
  }

  @Transactional
  public Map<String, Object> updateMedia(String id, Map<String, Object> payload) {
    jdbc.update(
        "UPDATE cms_media SET alt_ko = ?, alt_en = ?, updated_at = now() WHERE id = ?",
        validation.stringValue(payload.get("altKo")),
        validation.stringValue(payload.get("altEn")),
        id
    );
    return getMedia(id);
  }

  @Transactional
  public boolean deleteMedia(String id) {
    var existing = getMedia(id);
    if (existing == null) {
      return false;
    }
    jdbc.update("DELETE FROM cms_media WHERE id = ?", id);
    return true;
  }

  public Map<String, Object> exportSnapshot() {
    var tables = new LinkedHashMap<String, Object>();
    for (var table : EXPORT_TABLES) {
      tables.put(table, exportRows(table));
    }
    return Map.of(
        "exportedAt", java.time.Instant.now().toString(),
        "schemaVersion", 1,
        "tables", tables
    );
  }

  public List<Map<String, Object>> exportCounts(Map<String, Object> snapshot) {
    var tables = validation.objectValue(snapshot.get("tables"));
    return EXPORT_TABLES.stream()
        .map(table -> orderedMap("table", table, "count", importableExportRows(table, tables.get(table)).size()))
        .toList();
  }

  @Transactional
  public void replaceFromSnapshot(Map<String, Object> snapshot) {
    jdbc.query(
        "SELECT pg_advisory_xact_lock(?)",
        rs -> null,
        NotificationRepository.DISPATCH_LOCK_ID
    );
    var tables = validation.objectValue(snapshot.get("tables"));
    for (var table : DELETE_TABLES) {
      if (tables.containsKey(table)) {
        jdbc.update("DELETE FROM " + table);
      }
    }
    for (var table : EXPORT_TABLES) {
      if (tables.containsKey(table)) {
        for (var row : importableExportRows(table, tables.get(table))) {
          insertExportRow(table, row);
        }
      }
    }
    // Provider credentials and final-delivery verification are intentionally
    // outside CMS content backups. A restore must require fresh live tests.
    jdbc.update("DELETE FROM cms_kakao_template_verifications");
    jdbc.update("UPDATE cms_notification_settings SET kakao_enabled = false, updated_at = now()");
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'needs_attention',
          retry_blocked = true,
          last_error = CASE
            WHEN last_error = '' THEN 'Restored Kakao job requires manual review and cannot be retried.'
            ELSE last_error || ' | Restored Kakao job requires manual review and cannot be retried.'
          END,
          updated_at = now()
        WHERE channel = 'kakao'
          AND status IN ('queued', 'processing', 'provider_pending', 'failed', 'needs_attention')
        """);
  }

  public List<Map<String, Object>> tableCounts() {
    return EXPORT_TABLES.stream().map(table -> orderedMap(
        "table", table,
        "count", jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class)
    )).toList();
  }

  public List<Map<String, Object>> mediaProviders() {
    return jdbc.query("""
        SELECT storage_provider, COUNT(*) AS count
        FROM cms_media
        GROUP BY storage_provider
        ORDER BY count DESC, storage_provider ASC
        """, (rs, rowNum) -> Map.of(
        "provider", firstNonBlank(rs.getString("storage_provider"), "unknown"),
        "count", rs.getLong("count")
    ));
  }

  public String latestCreatedAt(String table) {
    return jdbc.query(
        "SELECT created_at FROM " + table + " ORDER BY created_at DESC LIMIT 1",
        (rs, rowNum) -> instantString(rs, "created_at")
    ).stream().findFirst().orElse("");
  }

  private Map<String, Object> createInquiry(Map<String, Object> payload) {
    var id = firstNonBlank(payload.get("id"), UUID.randomUUID().toString());
    var customerId = validation.stringValue(payload.get("customerId"));
    var linkSource = validation.stringValue(payload.get("linkSource"));
    jdbc.update("""
        INSERT INTO cms_inquiries (
          id, source, status, locale, name, contact, phone, email, organization, inquiry_type,
          team, quantity, due_date, use_case, message, configuration_json,
          page_path, user_agent, ip_address, customer_id, link_source, linked_at, created_at, updated_at
        ) VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, '')::uuid,
          NULLIF(?, ''), CASE WHEN NULLIF(?, '') IS NULL THEN NULL ELSE now() END, now(), now())
        ON CONFLICT (id) DO NOTHING
        """,
        id,
        payload.get("source"),
        payload.get("locale"),
        payload.get("name"),
        firstNonBlank(payload.get("phone"), payload.get("email")),
        payload.get("phone"),
        payload.get("email"),
        payload.get("organization"),
        payload.get("inquiryType"),
        payload.get("team"),
        payload.get("quantity"),
        payload.get("dueDate"),
        payload.get("useCase"),
        payload.get("message"),
        json.jsonb(payload.get("configuration")),
        payload.get("pagePath"),
        payload.get("userAgent"),
        payload.get("ipAddress"),
        customerId,
        linkSource,
        customerId
    );
    return getInquiry(id);
  }

  @SuppressWarnings("unchecked")
  private void upsertNewsTranslations(String newsId, Map<String, Object> payload) {
    var translations = validation.objectValue(payload.get("translations"));
    for (var locale : RequestValidation.LOCALES) {
      var translation = validation.objectValue(translations.get(locale));
      if (translation.isEmpty()) {
        continue;
      }
      jdbc.update("""
          INSERT INTO cms_news_translations (
            news_id, locale, title, category_label, excerpt, body_json, tags_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())
          ON CONFLICT(news_id, locale) DO UPDATE SET
            title = excluded.title,
            category_label = excluded.category_label,
            excerpt = excluded.excerpt,
            body_json = excluded.body_json,
            tags_json = excluded.tags_json,
            updated_at = now()
          """,
          newsId,
          locale,
          validation.stringValue(translation.get("title")),
          validation.stringValue(translation.get("categoryLabel")),
          validation.stringValue(translation.get("excerpt")),
          json.jsonb(translation.getOrDefault("body", Map.of())),
          json.jsonb(translation.getOrDefault("tags", List.of()))
      );
    }
  }

  private Map<String, Object> getNewsTranslations(String newsId) {
    var rows = jdbc.query(
        "SELECT * FROM cms_news_translations WHERE news_id = ?",
        (rs, rowNum) -> Map.entry(rs.getString("locale"), mapNewsTranslation(rs)),
        newsId
    );
    var translations = new LinkedHashMap<String, Object>();
    for (var row : rows) {
      translations.put(row.getKey(), row.getValue());
    }
    return translations;
  }

  private void upsertCollectionTranslations(String collectionId, Map<String, Object> payload) {
    var translations = validation.objectValue(payload.get("translations"));
    for (var locale : RequestValidation.LOCALES) {
      var translation = validation.objectValue(translations.get(locale));
      if (translation.isEmpty()) {
        continue;
      }
      jdbc.update("""
          INSERT INTO cms_collection_translations (
            collection_id, locale, title, story, sport_category_label, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, now(), now())
          ON CONFLICT(collection_id, locale) DO UPDATE SET
            title = excluded.title,
            story = excluded.story,
            sport_category_label = excluded.sport_category_label,
            updated_at = now()
          """,
          collectionId,
          locale,
          validation.stringValue(translation.get("title")),
          validation.stringValue(translation.get("story")),
          validation.stringValue(translation.get("sportCategoryLabel"))
      );
    }
  }

  private Map<String, Object> getCollectionTranslations(String collectionId) {
    var rows = jdbc.query(
        """
        SELECT *,
          COALESCE(NULLIF(story, ''), caption) AS resolved_story
        FROM cms_collection_translations
        WHERE collection_id = ?
        """,
        (rs, rowNum) -> Map.entry(rs.getString("locale"), mapCollectionTranslation(rs)),
        collectionId
    );
    var translations = new LinkedHashMap<String, Object>();
    for (var row : rows) {
      translations.put(row.getKey(), row.getValue());
    }
    return translations;
  }

  private List<Map<String, Object>> exportRows(String table) {
    return jdbc.query("SELECT * FROM " + table, exportRowMapper(table));
  }

  private List<Map<String, Object>> importableExportRows(String table, Object rows) {
    return validation.arrayValue(rows).stream()
        .map(validation::objectValue)
        .filter(row -> !isUnsupportedLegacyLocaleRow(table, row))
        .toList();
  }

  private boolean isUnsupportedLegacyLocaleRow(String table, Map<String, Object> row) {
    if (!table.equals("cms_news_translations") && !table.equals("cms_collection_translations")) {
      return false;
    }
    return !RequestValidation.LOCALES.contains(validation.stringValue(row.get("locale")));
  }

  private RowMapper<Map<String, Object>> exportRowMapper(String table) {
    return (rs, rowNum) -> {
      var meta = rs.getMetaData();
      var row = new LinkedHashMap<String, Object>();
      for (var index = 1; index <= meta.getColumnCount(); index += 1) {
        var column = meta.getColumnName(index);
        if ((table.equals("cms_pages") && LEGACY_PAGE_COLUMNS.contains(column))
            || (table.equals("cms_media") && LEGACY_MEDIA_COLUMNS.contains(column))
            || (table.equals("cms_notification_jobs") && NON_EXPORTABLE_JOB_COLUMNS.contains(column))) {
          continue;
        }
        if (JSON_COLUMNS.contains(column)) {
          row.put(column, json.exportJsonString(rs.getString(column), defaultJsonFallback(column)));
        } else if (BOOLEAN_COLUMNS.contains(column)) {
          row.put(column, rs.getBoolean(column) ? 1 : 0);
        } else if (TIMESTAMPTZ_COLUMNS.contains(column)) {
          row.put(column, instantString(rs, column));
        } else {
          row.put(column, rs.getObject(index));
        }
      }
      return row;
    };
  }

  private void insertExportRow(String table, Map<String, Object> row) {
    var tableColumns = tableColumns(table);
    var ignoredColumns = ignoredLegacyColumns(table);
    var unknown = row.keySet().stream()
        .filter(column -> !tableColumns.contains(column) && !ignoredColumns.contains(column))
        .toList();
    if (!unknown.isEmpty()) {
      throw new IllegalArgumentException("Cannot import " + table + ": unknown columns " + String.join(", ", unknown));
    }
    var columns = row.keySet().stream()
        .filter(tableColumns::contains)
        .filter(column -> !table.equals("cms_notification_jobs") || !NON_EXPORTABLE_JOB_COLUMNS.contains(column))
        .toList();
    if (columns.isEmpty()) {
      return;
    }
    var placeholders = columns.stream().map(this::placeholderForColumn).toList();
    var values = columns.stream().map(column -> importValue(column, row.get(column))).toArray();
    jdbc.update(
        "INSERT INTO " + table + " (" + String.join(", ", columns) + ") VALUES (" + String.join(", ", placeholders) + ")",
        values
    );
  }

  private List<String> tableColumns(String table) {
    return jdbc.queryForList("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = ?
        ORDER BY ordinal_position
        """, String.class, table);
  }

  private String placeholderForColumn(String column) {
    if (TIMESTAMPTZ_COLUMNS.contains(column)) {
      return "?::timestamptz";
    }
    return "?";
  }

  private Object importValue(String column, Object value) {
    if (JSON_COLUMNS.contains(column)) {
      return json.jsonbFromExportValue(value, defaultJsonFallback(column));
    }
    if (BOOLEAN_COLUMNS.contains(column)) {
      return validation.booleanValue(value, false);
    }
    return value;
  }

  private Set<String> ignoredLegacyColumns(String table) {
    if (table.equals("cms_pages")) {
      return LEGACY_PAGE_COLUMNS;
    }
    if (table.equals("cms_media")) {
      return LEGACY_MEDIA_COLUMNS;
    }
    return Set.of();
  }

  private Object defaultJsonFallback(String column) {
    return column.equals("tags_json") || column.equals("gallery_json") ? List.of() : Map.of();
  }

  private Map<String, Object> mapPage(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "pageKey", rs.getString("page_key"),
        "section", rs.getString("section"),
        "sortOrder", rs.getInt("sort_order"),
        "content", Map.of(
            "ko", json.objectOrEmpty(rs.getString("content_ko")),
            "en", json.objectOrEmpty(rs.getString("content_en"))
        ),
        "seo", Map.of(
            "ko", json.objectOrEmpty(rs.getString("seo_ko")),
            "en", json.objectOrEmpty(rs.getString("seo_en"))
        ),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapNews(ResultSet rs, Map<String, Object> translations) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "slug", rs.getString("slug"),
        "category", rs.getString("category"),
        "imagePath", rs.getString("image_path"),
        "mobileImagePath", rs.getString("mobile_image_path"),
        "publishedAt", rs.getString("published_at"),
        "isFeatured", rs.getBoolean("is_featured"),
        "isVisible", rs.getBoolean("is_visible"),
        "sortOrder", rs.getInt("sort_order"),
        "translations", translations,
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapNewsTranslation(ResultSet rs) throws SQLException {
    return orderedMap(
        "title", rs.getString("title"),
        "categoryLabel", rs.getString("category_label"),
        "excerpt", rs.getString("excerpt"),
        "body", json.objectOrEmpty(rs.getString("body_json")),
        "tags", json.arrayOrEmpty(rs.getString("tags_json"))
    );
  }

  private Map<String, Object> mapPublicNews(ResultSet rs, int rowNum) throws SQLException {
    var item = orderedMap(
        "id", rs.getString("id"),
        "slug", rs.getString("slug"),
        "category", rs.getString("category"),
        "imagePath", rs.getString("image_path"),
        "mobileImagePath", rs.getString("mobile_image_path"),
        "publishedAt", rs.getString("published_at"),
        "isFeatured", rs.getBoolean("is_featured"),
        "sortOrder", rs.getInt("sort_order"),
        "locale", rs.getString("locale")
    );
    item.putAll(mapNewsTranslation(rs));
    return item;
  }

  private Map<String, Object> mapCollection(ResultSet rs, Map<String, Object> translations) throws SQLException {
    var specs = json.objectOrEmpty(rs.getString("specs_json"));
    var sportCategory = rs.getString("sport_category");
    if (sportCategory == null || sportCategory.isBlank()) {
      sportCategory = validation.stringValue(specs.get("sportCategory"));
    }

    return orderedMap(
        "id", rs.getString("id"),
        "slug", rs.getString("slug"),
        "category", rs.getString("category"),
        "sportCategory", sportCategory,
        "imagePath", rs.getString("image_path"),
        "gallery", json.arrayOrEmpty(rs.getString("gallery_json")),
        "specs", specs,
        "isVisible", rs.getBoolean("is_visible"),
        "sortOrder", rs.getInt("sort_order"),
        "translations", translations,
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapCollectionTranslation(ResultSet rs) throws SQLException {
    return orderedMap(
        "title", rs.getString("title"),
        "story", rs.getString("resolved_story"),
        "sportCategoryLabel", rs.getString("sport_category_label")
    );
  }

  private Map<String, Object> mapPublicCollection(ResultSet rs, int rowNum) throws SQLException {
    var item = orderedMap(
        "id", rs.getString("id"),
        "slug", rs.getString("slug"),
        "category", rs.getString("category"),
        "sportCategory", rs.getString("resolved_sport_category"),
        "imagePath", rs.getString("image_path"),
        "gallery", json.arrayOrEmpty(rs.getString("gallery_json")),
        "specs", json.objectOrEmpty(rs.getString("specs_json")),
        "sortOrder", rs.getInt("sort_order"),
        "locale", rs.getString("locale")
    );
    item.putAll(mapCollectionTranslation(rs));
    return item;
  }

  private Map<String, Object> mapInquiry(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "source", rs.getString("source"),
        "status", rs.getString("status"),
        "locale", rs.getString("locale"),
        "name", rs.getString("name"),
        "contact", rs.getString("contact"),
        "phone", rs.getString("phone"),
        "email", rs.getString("email"),
        "organization", rs.getString("organization"),
        "inquiryType", rs.getString("inquiry_type"),
        "team", rs.getString("team"),
        "quantity", rs.getObject("quantity"),
        "dueDate", rs.getString("due_date"),
        "useCase", rs.getString("use_case"),
        "message", rs.getString("message"),
        "configuration", json.objectOrEmpty(rs.getString("configuration_json")),
        "pagePath", rs.getString("page_path"),
        "userAgent", rs.getString("user_agent"),
        "ipAddress", rs.getString("ip_address"),
        "customerId", validation.stringValue(rs.getString("customer_id")),
        "linkSource", validation.stringValue(rs.getString("link_source")),
        "linkedAt", instantString(rs, "linked_at"),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapInquiryStatus(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "code", rs.getString("code"),
        "labelKo", rs.getString("label_ko"),
        "labelEn", rs.getString("label_en"),
        "labelZh", rs.getString("label_zh"),
        "color", rs.getString("color"),
        "sortOrder", rs.getInt("sort_order"),
        "isActive", rs.getBoolean("is_active"),
        "isSystem", rs.getBoolean("is_system"),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapMedia(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "filename", rs.getString("filename"),
        "path", rs.getString("path"),
        "url", rs.getString("url"),
        "mimeType", rs.getString("mime_type"),
        "sizeBytes", rs.getLong("size_bytes"),
        "altKo", rs.getString("alt_ko"),
        "altEn", rs.getString("alt_en"),
        "storageProvider", rs.getString("storage_provider"),
        "storageKey", rs.getString("storage_key"),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private String instantString(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? "" : value.toInstant().toString();
  }

  private String firstNonBlank(Object value, Object fallback) {
    var text = validation.stringValue(value);
    return text.isBlank() ? validation.stringValue(fallback) : text;
  }

  private Map<String, Object> orderedMap(Object... values) {
    var map = new LinkedHashMap<String, Object>();
    for (var index = 0; index < values.length; index += 2) {
      map.put((String) values[index], values[index + 1]);
    }
    return map;
  }
}
