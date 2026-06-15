import {randomUUID} from 'node:crypto';

import {locales, type Locale} from '@/lib/locales';

import {getCmsDb, jsonParse, jsonStringify, nowIso} from './db';
import type {
  collectionPayloadSchema,
  contactInquirySchema,
  golfInquirySchema,
  inquiryStatusSchema,
  mediaUpdateSchema,
  mediaPayloadSchema,
  newsPayloadSchema,
  pagePayloadSchema
} from './validation';
import type {z} from 'zod';

type PagePayload = z.infer<typeof pagePayloadSchema>;
type NewsPayload = z.infer<typeof newsPayloadSchema>;
type CollectionPayload = z.infer<typeof collectionPayloadSchema>;
type ContactInquiryPayload = z.infer<typeof contactInquirySchema>;
type GolfInquiryPayload = z.infer<typeof golfInquirySchema>;
type InquiryStatusPayload = z.infer<typeof inquiryStatusSchema>;
type MediaPayload = z.infer<typeof mediaPayloadSchema>;
type MediaUpdatePayload = z.infer<typeof mediaUpdateSchema>;

type PageRow = {
  page_key: string;
  section: string;
  sort_order: number;
  content_ko: string;
  content_en: string;
  seo_ko: string;
  seo_en: string;
  created_at: string;
  updated_at: string;
};

type NewsRow = {
  id: string;
  slug: string;
  category: string;
  image_path: string;
  published_at: string;
  is_featured: number;
  is_visible: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type NewsTranslationRow = {
  news_id: string;
  locale: Locale;
  title: string;
  category_label: string;
  excerpt: string;
  body_json: string;
  tags_json: string;
  seo_title: string;
  seo_description: string;
  og_image_path: string;
};

type CollectionRow = {
  id: string;
  slug: string;
  category: string;
  sport_category: string;
  image_path: string;
  gallery_json: string;
  specs_json: string;
  is_visible: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CollectionTranslationRow = {
  collection_id: string;
  locale: Locale;
  title: string;
  caption: string;
  story: string;
  category_label: string;
  sport_category_label: string;
  seo_title: string;
  seo_description: string;
  og_image_path: string;
};

type InquiryRow = {
  id: string;
  source: 'contact' | 'golf';
  status: InquiryStatusPayload['status'];
  locale: Locale;
  name: string;
  contact: string;
  organization: string;
  inquiry_type: string;
  team: string;
  quantity: number | null;
  due_date: string;
  use_case: string;
  message: string;
  configuration_json: string;
  page_path: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  updated_at: string;
};

type EmailEventRow = {
  id: string;
  inquiry_id: string;
  event_type: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'skipped' | 'failed';
  provider_message_id: string;
  error_message: string;
  created_at: string;
};

type MediaRow = {
  id: string;
  filename: string;
  path: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  alt_ko: string;
  alt_en: string;
  storage_provider: string;
  storage_key: string;
  created_at: string;
  updated_at: string;
};

export function listPages() {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_pages ORDER BY sort_order ASC, page_key ASC')
    .all() as PageRow[];

  return rows.map(mapPageRow);
}

export function getPage(pageKey: string) {
  const row = getCmsDb()
    .prepare('SELECT * FROM cms_pages WHERE page_key = ?')
    .get(pageKey) as PageRow | undefined;

  return row ? mapPageRow(row) : null;
}

export function upsertPage(pageKey: string, payload: PagePayload) {
  const existing = getPage(pageKey);
  const now = nowIso();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_pages (
        page_key, section, sort_order, content_ko, content_en,
        seo_ko, seo_en, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(page_key) DO UPDATE SET
        section = excluded.section,
        sort_order = excluded.sort_order,
        content_ko = excluded.content_ko,
        content_en = excluded.content_en,
        seo_ko = excluded.seo_ko,
        seo_en = excluded.seo_en,
        updated_at = excluded.updated_at`
    )
    .run(
      pageKey,
      payload.section,
      payload.sortOrder,
      jsonStringify(payload.content?.ko ?? existing?.content.ko ?? {}),
      jsonStringify(payload.content?.en ?? existing?.content.en ?? {}),
      jsonStringify(payload.seo?.ko ?? existing?.seo.ko ?? {}),
      jsonStringify(payload.seo?.en ?? existing?.seo.en ?? {}),
      existing?.createdAt ?? now,
      now
    );

  return getPage(pageKey);
}

export function listNews() {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_news ORDER BY sort_order ASC, published_at DESC, created_at DESC')
    .all() as NewsRow[];

  return rows.map((row) => mapNewsRow(row, getNewsTranslations(row.id)));
}

export function listPublicNews(locale: Locale) {
  const rows = getCmsDb()
    .prepare(
      `SELECT n.*, t.locale, t.title, t.category_label, t.excerpt, t.body_json, t.tags_json,
        t.seo_title, t.seo_description, t.og_image_path
      FROM cms_news n
      JOIN cms_news_translations t ON t.news_id = n.id AND t.locale = ?
      WHERE n.is_visible = 1
      ORDER BY n.sort_order ASC, n.published_at DESC, n.created_at DESC`
    )
    .all(locale) as Array<NewsRow & NewsTranslationRow>;

  return rows.map((row) => mapPublicNewsRow(row));
}

export function getNews(idOrSlug: string) {
  const row = getCmsDb()
    .prepare('SELECT * FROM cms_news WHERE id = ? OR slug = ?')
    .get(idOrSlug, idOrSlug) as NewsRow | undefined;

  return row ? mapNewsRow(row, getNewsTranslations(row.id)) : null;
}

export function getPublicNews(slug: string, locale: Locale) {
  const row = getCmsDb()
    .prepare(
      `SELECT n.*, t.locale, t.title, t.category_label, t.excerpt, t.body_json, t.tags_json,
        t.seo_title, t.seo_description, t.og_image_path
      FROM cms_news n
      JOIN cms_news_translations t ON t.news_id = n.id AND t.locale = ?
      WHERE n.slug = ? AND n.is_visible = 1`
    )
    .get(locale, slug) as (NewsRow & NewsTranslationRow) | undefined;

  return row ? mapPublicNewsRow(row) : null;
}

export function createNews(payload: NewsPayload) {
  const id = randomUUID();
  const slug = payload.slug ?? id;
  const now = nowIso();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_news (
        id, slug, category, image_path, published_at, is_featured, is_visible,
        sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      slug,
      payload.category,
      payload.imagePath,
      payload.publishedAt,
      payload.isFeatured ? 1 : 0,
      payload.isVisible ? 1 : 0,
      payload.sortOrder,
      now,
      now
    );

  upsertNewsTranslations(id, payload);
  return getNews(id);
}

export function updateNews(idOrSlug: string, payload: NewsPayload) {
  const existing = getNews(idOrSlug);

  if (!existing) {
    return null;
  }

  getCmsDb()
    .prepare(
      `UPDATE cms_news SET
        slug = ?,
        category = ?,
        image_path = ?,
        published_at = ?,
        is_featured = ?,
        is_visible = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .run(
      payload.slug ?? existing.slug,
      payload.category,
      payload.imagePath,
      payload.publishedAt,
      payload.isFeatured ? 1 : 0,
      payload.isVisible ? 1 : 0,
      payload.sortOrder,
      nowIso(),
      existing.id
    );

  upsertNewsTranslations(existing.id, payload);
  return getNews(existing.id);
}

export function deleteNews(idOrSlug: string) {
  const existing = getNews(idOrSlug);

  if (!existing) {
    return false;
  }

  getCmsDb().prepare('DELETE FROM cms_news WHERE id = ?').run(existing.id);
  return true;
}

export function listCollections() {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_collections ORDER BY sort_order ASC, created_at DESC')
    .all() as CollectionRow[];

  return rows.map((row) => mapCollectionRow(row, getCollectionTranslations(row.id)));
}

export function listPublicCollections(locale: Locale) {
  const rows = getCmsDb()
    .prepare(
      `SELECT c.*, t.locale, t.title, t.caption, t.story, t.category_label, t.sport_category_label,
        t.seo_title, t.seo_description, t.og_image_path
      FROM cms_collections c
      JOIN cms_collection_translations t ON t.collection_id = c.id AND t.locale = ?
      WHERE c.is_visible = 1
      ORDER BY c.sort_order ASC, c.created_at DESC`
    )
    .all(locale) as Array<CollectionRow & CollectionTranslationRow>;

  return rows.map((row) => mapPublicCollectionRow(row));
}

export function getCollection(idOrSlug: string) {
  const row = getCmsDb()
    .prepare('SELECT * FROM cms_collections WHERE id = ? OR slug = ?')
    .get(idOrSlug, idOrSlug) as CollectionRow | undefined;

  return row ? mapCollectionRow(row, getCollectionTranslations(row.id)) : null;
}

export function getPublicCollection(slug: string, locale: Locale) {
  const row = getCmsDb()
    .prepare(
      `SELECT c.*, t.locale, t.title, t.caption, t.story, t.category_label, t.sport_category_label,
        t.seo_title, t.seo_description, t.og_image_path
      FROM cms_collections c
      JOIN cms_collection_translations t ON t.collection_id = c.id AND t.locale = ?
      WHERE c.slug = ? AND c.is_visible = 1`
    )
    .get(locale, slug) as (CollectionRow & CollectionTranslationRow) | undefined;

  return row ? mapPublicCollectionRow(row) : null;
}

export function createCollection(payload: CollectionPayload) {
  const id = randomUUID();
  const slug = payload.slug ?? id;
  const now = nowIso();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_collections (
        id, slug, category, sport_category, image_path, gallery_json, specs_json,
        is_visible, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      slug,
      payload.category,
      payload.sportCategory,
      payload.imagePath,
      jsonStringify(payload.gallery),
      jsonStringify(payload.specs),
      payload.isVisible ? 1 : 0,
      payload.sortOrder,
      now,
      now
    );

  upsertCollectionTranslations(id, payload);
  return getCollection(id);
}

export function updateCollection(idOrSlug: string, payload: CollectionPayload) {
  const existing = getCollection(idOrSlug);

  if (!existing) {
    return null;
  }

  getCmsDb()
    .prepare(
      `UPDATE cms_collections SET
        slug = ?,
        category = ?,
        sport_category = ?,
        image_path = ?,
        gallery_json = ?,
        specs_json = ?,
        is_visible = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .run(
      payload.slug ?? existing.slug,
      payload.category,
      payload.sportCategory,
      payload.imagePath,
      jsonStringify(payload.gallery),
      jsonStringify(payload.specs),
      payload.isVisible ? 1 : 0,
      payload.sortOrder,
      nowIso(),
      existing.id
    );

  upsertCollectionTranslations(existing.id, payload);
  return getCollection(existing.id);
}

export function deleteCollection(idOrSlug: string) {
  const existing = getCollection(idOrSlug);

  if (!existing) {
    return false;
  }

  getCmsDb().prepare('DELETE FROM cms_collections WHERE id = ?').run(existing.id);
  return true;
}

export function createContactInquiry(payload: ContactInquiryPayload, requestMeta: RequestMeta) {
  return createInquiry({
    source: 'contact',
    locale: payload.locale,
    name: payload.name,
    contact: payload.contact,
    organization: payload.organization,
    inquiryType: payload.type,
    message: payload.message,
    pagePath: payload.pagePath,
    configuration: {},
    ...requestMeta
  });
}

export function createGolfInquiry(payload: GolfInquiryPayload, requestMeta: RequestMeta) {
  return createInquiry({
    source: 'golf',
    locale: payload.locale,
    name: payload.name,
    contact: payload.contact,
    organization: '',
    inquiryType: '',
    team: payload.team,
    quantity: payload.quantity,
    dueDate: payload.due,
    useCase: payload.use,
    message: payload.message,
    pagePath: payload.pagePath,
    configuration: {
      selectedHead: payload.selectedHead,
      selectedShaft: payload.selectedShaft,
      engravingSample: payload.engravingSample
    },
    ...requestMeta
  });
}

export function listInquiries(filters: {status?: string; source?: string}) {
  const clauses: string[] = [];
  const values: string[] = [];

  if (filters.status) {
    clauses.push('status = ?');
    values.push(filters.status);
  }

  if (filters.source) {
    clauses.push('source = ?');
    values.push(filters.source);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getCmsDb()
    .prepare(`SELECT * FROM cms_inquiries ${where} ORDER BY created_at DESC`)
    .all(...values) as InquiryRow[];

  return rows.map(mapInquiryRow);
}

export function getInquiry(id: string) {
  const row = getCmsDb()
    .prepare('SELECT * FROM cms_inquiries WHERE id = ?')
    .get(id) as InquiryRow | undefined;

  return row ? mapInquiryRow(row) : null;
}

export function listEmailEventsForInquiry(inquiryId: string) {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_email_events WHERE inquiry_id = ? ORDER BY created_at DESC')
    .all(inquiryId) as EmailEventRow[];

  return rows.map(mapEmailEventRow);
}

export function updateInquiryStatus(id: string, payload: InquiryStatusPayload) {
  getCmsDb()
    .prepare('UPDATE cms_inquiries SET status = ?, updated_at = ? WHERE id = ?')
    .run(payload.status, nowIso(), id);

  return getInquiry(id);
}

export function createEmailEvent(event: {
  inquiryId: string;
  recipient?: string;
  subject?: string;
  status: 'sent' | 'skipped' | 'failed';
  providerMessageId?: string;
  errorMessage?: string;
}) {
  const id = randomUUID();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_email_events (
        id, inquiry_id, recipient, subject, status, provider_message_id, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      event.inquiryId,
      event.recipient ?? '',
      event.subject ?? '',
      event.status,
      event.providerMessageId ?? '',
      event.errorMessage ?? '',
      nowIso()
    );

  return id;
}

export function listMedia() {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_media ORDER BY created_at DESC')
    .all() as MediaRow[];

  return rows.map(mapMediaRow);
}

export function getMedia(id: string) {
  const row = getCmsDb()
    .prepare('SELECT * FROM cms_media WHERE id = ?')
    .get(id) as MediaRow | undefined;

  return row ? mapMediaRow(row) : null;
}

export function createMedia(payload: MediaPayload) {
  const id = randomUUID();
  const now = nowIso();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_media (
        id, filename, path, url, mime_type, size_bytes, alt_ko, alt_en,
        storage_provider, storage_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      payload.filename,
      payload.path,
      payload.url,
      payload.mimeType,
      payload.sizeBytes,
      payload.altKo,
      payload.altEn,
      payload.storageProvider,
      payload.storageKey,
      now,
      now
    );

  return mapMediaRow(
    getCmsDb().prepare('SELECT * FROM cms_media WHERE id = ?').get(id) as MediaRow
  );
}

export function updateMedia(id: string, payload: MediaUpdatePayload) {
  getCmsDb()
    .prepare('UPDATE cms_media SET alt_ko = ?, alt_en = ?, updated_at = ? WHERE id = ?')
    .run(payload.altKo, payload.altEn, nowIso(), id);

  return getMedia(id);
}

export function deleteMedia(id: string) {
  const existing = getMedia(id);

  if (!existing) {
    return false;
  }

  getCmsDb().prepare('DELETE FROM cms_media WHERE id = ?').run(id);
  return true;
}

type RequestMeta = {
  userAgent: string;
  ipAddress: string;
};

function createInquiry(payload: {
  source: 'contact' | 'golf';
  locale: Locale;
  name: string;
  contact: string;
  organization: string;
  inquiryType: string;
  team?: string;
  quantity?: number;
  dueDate?: string;
  useCase?: string;
  message: string;
  configuration: unknown;
  pagePath: string;
  userAgent: string;
  ipAddress: string;
}) {
  const id = randomUUID();
  const now = nowIso();

  getCmsDb()
    .prepare(
      `INSERT INTO cms_inquiries (
        id, source, status, locale, name, contact, organization, inquiry_type,
        team, quantity, due_date, use_case, message, configuration_json,
        page_path, user_agent, ip_address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      payload.source,
      'new',
      payload.locale,
      payload.name,
      payload.contact,
      payload.organization,
      payload.inquiryType,
      payload.team ?? '',
      payload.quantity ?? null,
      payload.dueDate ?? '',
      payload.useCase ?? '',
      payload.message,
      jsonStringify(payload.configuration),
      payload.pagePath,
      payload.userAgent,
      payload.ipAddress,
      now,
      now
    );

  return getInquiry(id);
}

function getNewsTranslations(newsId: string) {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_news_translations WHERE news_id = ?')
    .all(newsId) as NewsTranslationRow[];

  return Object.fromEntries(rows.map((row) => [row.locale, mapNewsTranslationRow(row)]));
}

function upsertNewsTranslations(newsId: string, payload: NewsPayload) {
  const now = nowIso();

  for (const locale of locales) {
    const translation = payload.translations[locale];

    if (!translation) {
      continue;
    }

    getCmsDb()
      .prepare(
        `INSERT INTO cms_news_translations (
          news_id, locale, title, category_label, excerpt, body_json, tags_json,
          seo_title, seo_description, og_image_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(news_id, locale) DO UPDATE SET
          title = excluded.title,
          category_label = excluded.category_label,
          excerpt = excluded.excerpt,
          body_json = excluded.body_json,
          tags_json = excluded.tags_json,
          seo_title = excluded.seo_title,
          seo_description = excluded.seo_description,
          og_image_path = excluded.og_image_path,
          updated_at = excluded.updated_at`
      )
      .run(
        newsId,
        locale,
        translation.title,
        translation.categoryLabel,
        translation.excerpt,
        jsonStringify(translation.body),
        jsonStringify(translation.tags),
        translation.seoTitle,
        translation.seoDescription,
        translation.ogImagePath,
        now,
        now
      );
  }
}

function getCollectionTranslations(collectionId: string) {
  const rows = getCmsDb()
    .prepare('SELECT * FROM cms_collection_translations WHERE collection_id = ?')
    .all(collectionId) as CollectionTranslationRow[];

  return Object.fromEntries(rows.map((row) => [row.locale, mapCollectionTranslationRow(row)]));
}

function upsertCollectionTranslations(collectionId: string, payload: CollectionPayload) {
  const now = nowIso();

  for (const locale of locales) {
    const translation = payload.translations[locale];

    if (!translation) {
      continue;
    }

    getCmsDb()
      .prepare(
        `INSERT INTO cms_collection_translations (
          collection_id, locale, title, caption, story, category_label, sport_category_label,
          seo_title, seo_description, og_image_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(collection_id, locale) DO UPDATE SET
          title = excluded.title,
          caption = excluded.caption,
          story = excluded.story,
          category_label = excluded.category_label,
          sport_category_label = excluded.sport_category_label,
          seo_title = excluded.seo_title,
          seo_description = excluded.seo_description,
          og_image_path = excluded.og_image_path,
          updated_at = excluded.updated_at`
      )
      .run(
        collectionId,
        locale,
        translation.title,
        translation.caption,
        translation.story,
        translation.categoryLabel,
        translation.sportCategoryLabel,
        translation.seoTitle,
        translation.seoDescription,
        translation.ogImagePath,
        now,
        now
      );
  }
}

function mapPageRow(row: PageRow) {
  return {
    pageKey: row.page_key,
    section: row.section,
    sortOrder: row.sort_order,
    content: {
      ko: jsonParse(row.content_ko, {}),
      en: jsonParse(row.content_en, {})
    },
    seo: {
      ko: jsonParse(row.seo_ko, {}),
      en: jsonParse(row.seo_en, {})
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNewsRow(row: NewsRow, translations: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    imagePath: row.image_path,
    publishedAt: row.published_at,
    isFeatured: Boolean(row.is_featured),
    isVisible: Boolean(row.is_visible),
    sortOrder: row.sort_order,
    translations,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNewsTranslationRow(row: NewsTranslationRow) {
  return {
    title: row.title,
    categoryLabel: row.category_label,
    excerpt: row.excerpt,
    body: jsonParse(row.body_json, {}),
    tags: jsonParse<string[]>(row.tags_json, []),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImagePath: row.og_image_path
  };
}

function mapPublicNewsRow(row: NewsRow & NewsTranslationRow) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    imagePath: row.image_path,
    publishedAt: row.published_at,
    isFeatured: Boolean(row.is_featured),
    sortOrder: row.sort_order,
    locale: row.locale,
    ...mapNewsTranslationRow(row)
  };
}

function mapCollectionRow(row: CollectionRow, translations: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    sportCategory: row.sport_category,
    imagePath: row.image_path,
    gallery: jsonParse(row.gallery_json, []),
    specs: jsonParse(row.specs_json, {}),
    isVisible: Boolean(row.is_visible),
    sortOrder: row.sort_order,
    translations,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCollectionTranslationRow(row: CollectionTranslationRow) {
  return {
    title: row.title,
    caption: row.caption,
    story: row.story,
    categoryLabel: row.category_label,
    sportCategoryLabel: row.sport_category_label,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImagePath: row.og_image_path
  };
}

function mapPublicCollectionRow(row: CollectionRow & CollectionTranslationRow) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    sportCategory: row.sport_category,
    imagePath: row.image_path,
    gallery: jsonParse(row.gallery_json, []),
    specs: jsonParse(row.specs_json, {}),
    sortOrder: row.sort_order,
    locale: row.locale,
    ...mapCollectionTranslationRow(row)
  };
}

function mapInquiryRow(row: InquiryRow) {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    locale: row.locale,
    name: row.name,
    contact: row.contact,
    organization: row.organization,
    inquiryType: row.inquiry_type,
    team: row.team,
    quantity: row.quantity,
    dueDate: row.due_date,
    useCase: row.use_case,
    message: row.message,
    configuration: jsonParse(row.configuration_json, {}),
    pagePath: row.page_path,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEmailEventRow(row: EmailEventRow) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    eventType: row.event_type,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
    createdAt: row.created_at
  };
}

function mapMediaRow(row: MediaRow) {
  return {
    id: row.id,
    filename: row.filename,
    path: row.path,
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    altKo: row.alt_ko,
    altEn: row.alt_en,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
