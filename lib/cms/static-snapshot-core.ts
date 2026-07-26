export type CmsStaticSnapshot = {
  exportedAt?: string;
  schemaVersion?: number;
  tables?: Partial<Record<CmsStaticTable, Array<Record<string, unknown>>>>;
};

type CmsStaticTable =
  | 'cms_pages'
  | 'cms_news'
  | 'cms_news_translations'
  | 'cms_collections'
  | 'cms_collection_translations'
  | 'cms_media'
  | 'cms_inquiries'
  | 'cms_email_events'
  | 'cms_inquiry_status_events'
  | 'cms_notification_settings'
  | 'cms_notification_templates'
  | 'cms_notification_jobs'
  | 'cms_notification_attempts';

type Locale = 'ko' | 'en';

export function listSnapshotPublicNews(snapshot: CmsStaticSnapshot, localeValue: unknown): Array<Record<string, unknown>> {
  const locale = normalizeLocale(localeValue);
  const translations = rows(snapshot, 'cms_news_translations');
  const items: Array<Record<string, unknown>> = [];

  for (const row of rows(snapshot, 'cms_news')
    .filter((row) => booleanValue(row.is_visible, true))
    .sort(compareNewsSourceRows)) {
    const translation = translations.find(
      (entry) => stringValue(entry.news_id) === stringValue(row.id) && stringValue(entry.locale) === locale
    );
    if (translation) {
      items.push(mapPublicNews(row, translation, locale));
    }
  }

  return items;
}

export function listSnapshotPages(snapshot: CmsStaticSnapshot): Array<Record<string, unknown>> {
  return rows(snapshot, 'cms_pages')
    .map((page) => ({
      pageKey: stringValue(page.page_key),
      section: stringValue(page.section),
      sortOrder: numberValue(page.sort_order),
      content: {
        ko: objectJson(page.content_ko),
        en: objectJson(page.content_en)
      },
      seo: {
        ko: objectJson(page.seo_ko),
        en: objectJson(page.seo_en)
      },
      createdAt: stringValue(page.created_at),
      updatedAt: stringValue(page.updated_at)
    }))
    .sort((a, b) => numberValue(a.sortOrder) - numberValue(b.sortOrder) || stringValue(a.pageKey).localeCompare(stringValue(b.pageKey)));
}

export function getSnapshotPage(snapshot: CmsStaticSnapshot, pageKey: string): Record<string, unknown> | null {
  return listSnapshotPages(snapshot).find((page) => page.pageKey === pageKey) ?? null;
}

export function getSnapshotPublicNews(snapshot: CmsStaticSnapshot, slug: string, localeValue: unknown): Record<string, unknown> | null {
  return listSnapshotPublicNews(snapshot, localeValue).find((item) => item.slug === slug) ?? null;
}

export function listSnapshotPublicCollections(snapshot: CmsStaticSnapshot, localeValue: unknown): Array<Record<string, unknown>> {
  const locale = normalizeLocale(localeValue);
  const translations = rows(snapshot, 'cms_collection_translations');
  const items: Array<Record<string, unknown>> = [];

  for (const row of rows(snapshot, 'cms_collections')
    .filter((row) => booleanValue(row.is_visible, true))
    .sort(compareCollectionSourceRows)) {
    const translation = translations.find(
      (entry) => stringValue(entry.collection_id) === stringValue(row.id) && stringValue(entry.locale) === locale
    );
    if (translation) {
      items.push(mapPublicCollection(row, translation, locale));
    }
  }

  return items;
}

export function getSnapshotPublicCollection(snapshot: CmsStaticSnapshot, slug: string, localeValue: unknown): Record<string, unknown> | null {
  return listSnapshotPublicCollections(snapshot, localeValue).find((item) => item.slug === slug) ?? null;
}

export function getSnapshotPublicPage(snapshot: CmsStaticSnapshot, pageKey: string, localeValue: unknown): Record<string, unknown> | null {
  const locale = normalizeLocale(localeValue);
  const page = rows(snapshot, 'cms_pages').find((row) => stringValue(row.page_key) === pageKey);

  if (!page) {
    return null;
  }

  return {
    pageKey: stringValue(page.page_key),
    section: stringValue(page.section),
    locale,
    content: objectJson(page[`content_${locale}`]),
    seo: objectJson(page[`seo_${locale}`]),
    updatedAt: stringValue(page.updated_at)
  };
}

function mapPublicNews(row: Record<string, unknown>, translation: Record<string, unknown>, locale: Locale) {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    category: stringValue(row.category),
    imagePath: stringValue(row.image_path),
    mobileImagePath: stringValue(row.mobile_image_path),
    publishedAt: stringValue(row.published_at),
    isFeatured: booleanValue(row.is_featured, false),
    sortOrder: numberValue(row.sort_order),
    locale,
    title: stringValue(translation.title),
    categoryLabel: stringValue(translation.category_label),
    excerpt: stringValue(translation.excerpt),
    body: objectJson(translation.body_json),
    tags: arrayJson(translation.tags_json),
    seoTitle: stringValue(translation.seo_title),
    seoDescription: stringValue(translation.seo_description),
    ogImagePath: stringValue(translation.og_image_path)
  };
}

function mapPublicCollection(row: Record<string, unknown>, translation: Record<string, unknown>, locale: Locale) {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    category: stringValue(row.category),
    sportCategory: stringValue(row.sport_category),
    imagePath: stringValue(row.image_path),
    gallery: arrayJson(row.gallery_json),
    specs: objectJson(row.specs_json),
    sortOrder: numberValue(row.sort_order),
    locale,
    title: stringValue(translation.title),
    caption: stringValue(translation.caption),
    story: stringValue(translation.story),
    categoryLabel: stringValue(translation.category_label),
    sportCategoryLabel: stringValue(translation.sport_category_label),
    seoTitle: stringValue(translation.seo_title),
    seoDescription: stringValue(translation.seo_description),
    ogImagePath: stringValue(translation.og_image_path)
  };
}

function rows(snapshot: CmsStaticSnapshot, table: CmsStaticTable) {
  const value = snapshot.tables?.[table];
  return Array.isArray(value) ? value : [];
}

function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'ko';
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return fallback;
}

function objectJson(value: unknown) {
  const parsed = parseJson(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function arrayJson(value: unknown) {
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function parseJson(value: unknown, fallback: unknown) {
  if (typeof value !== 'string') {
    return value ?? fallback;
  }
  if (!value.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function compareNewsSourceRows(a: Record<string, unknown>, b: Record<string, unknown>) {
  return (
    numberValue(a.sort_order) - numberValue(b.sort_order) ||
    stringValue(b.published_at).localeCompare(stringValue(a.published_at)) ||
    stringValue(b.created_at).localeCompare(stringValue(a.created_at))
  );
}

function compareCollectionSourceRows(a: Record<string, unknown>, b: Record<string, unknown>) {
  return (
    numberValue(a.sort_order) - numberValue(b.sort_order) ||
    stringValue(b.created_at).localeCompare(stringValue(a.created_at))
  );
}
