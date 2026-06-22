import Database from 'better-sqlite3';
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const root = process.cwd();
const dbPath = process.env.CMS_DB_PATH ?? path.join(root, 'data', 'cms.sqlite');
const schemaPath = path.join(root, 'database', 'cms-schema.sql');
const pageCatalog = JSON.parse(readFileSync(path.join(root, 'lib', 'cms', 'page-catalog.json'), 'utf8'));
const ko = JSON.parse(readFileSync(path.join(root, 'messages', 'ko.json'), 'utf8'));
const en = JSON.parse(readFileSync(path.join(root, 'messages', 'en.json'), 'utf8'));

mkdirSync(path.dirname(dbPath), {recursive: true});

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(readFileSync(schemaPath, 'utf8'));

seedPages();
seedNews();
seedCollections();
seedMedia();

console.log(`CMS database initialized: ${dbPath}`);

function seedPages() {
  const statement = db.prepare(`
    INSERT INTO cms_pages (
      page_key, section, sort_order, content_ko, content_en,
      seo_ko, seo_en, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(page_key) DO UPDATE SET
      section = excluded.section,
      sort_order = excluded.sort_order,
      content_ko = excluded.content_ko,
      content_en = excluded.content_en,
      seo_ko = excluded.seo_ko,
      seo_en = excluded.seo_en,
      updated_at = datetime('now')
  `);

  pageCatalog.forEach((page, index) => {
    const contentKo = createPageContentFromCatalog(ko, page);
    const contentEn = createPageContentFromCatalog(en, page);

    statement.run(
      page.pageKey,
      page.section ?? 'site',
      page.sortOrder ?? index,
      JSON.stringify(contentKo),
      JSON.stringify(contentEn),
      JSON.stringify(createSeoFromContent(getPrimaryPageContent(contentKo), page)),
      JSON.stringify(createSeoFromContent(getPrimaryPageContent(contentEn), page))
    );
  });
}

function createPageContentFromCatalog(messages, page) {
  if (!Array.isArray(page.contentGroups) || page.contentGroups.length === 0) {
    return readPath(messages, page.sourcePath) ?? {};
  }

  return {
    __groups: Object.fromEntries(
      page.contentGroups.map((group) => [group.key, readPath(messages, group.sourcePath) ?? {}])
    )
  };
}

function getPrimaryPageContent(content) {
  if (content && typeof content === 'object' && content.__groups && typeof content.__groups === 'object') {
    return content.__groups.main ?? Object.values(content.__groups)[0] ?? {};
  }

  return content;
}

function seedNews() {
  const koCards = ko.news?.grid?.cards ?? [];
  const enCards = en.news?.grid?.cards ?? [];
  const newsStatement = db.prepare(`
    INSERT INTO cms_news (
      id, slug, category, image_path, published_at, is_featured, is_visible,
      sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      category = excluded.category,
      image_path = excluded.image_path,
      published_at = excluded.published_at,
      is_featured = excluded.is_featured,
      is_visible = excluded.is_visible,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  const translationStatement = db.prepare(`
    INSERT INTO cms_news_translations (
      news_id, locale, title, category_label, excerpt, body_json, tags_json,
      seo_title, seo_description, og_image_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(news_id, locale) DO UPDATE SET
      title = excluded.title,
      category_label = excluded.category_label,
      excerpt = excluded.excerpt,
      body_json = excluded.body_json,
      tags_json = excluded.tags_json,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      og_image_path = excluded.og_image_path,
      updated_at = datetime('now')
  `);

  koCards.forEach((card, index) => {
    const id = card.id;
    const enCard = enCards.find((item) => item.id === id) ?? card;
    newsStatement.run(
      id,
      id,
      card.category ?? 'general',
      card.image ?? '',
      card.date ?? '',
      index === 0 ? 1 : 0,
      index
    );
    seedNewsTranslation(translationStatement, id, 'ko', card, ko.newsUi?.detail);
    seedNewsTranslation(translationStatement, id, 'en', enCard, en.newsUi?.detail);
  });
}

function seedNewsTranslation(statement, id, locale, card, detail) {
  const body = {
    lead: detail?.lead ?? '',
    paragraphs: detail?.paragraphs ?? [],
    quote: detail?.quote ?? '',
    ctaTitle: detail?.ctaTitle ?? ''
  };

  statement.run(
    id,
    locale,
    card.title ?? id,
    card.categoryLabel ?? '',
    card.body ?? '',
    JSON.stringify(body),
    JSON.stringify(detail?.tags ?? []),
    card.title ?? '',
    detail?.lead ?? '',
    'news_detail_hero.png'
  );
}

function seedCollections() {
  const koItems = ko.specialtyPages?.collection?.gallery?.items ?? [];
  const enItems = en.specialtyPages?.collection?.gallery?.items ?? [];
  const collectionStatement = db.prepare(`
    INSERT INTO cms_collections (
      id, slug, category, sport_category, image_path, gallery_json, specs_json,
      is_visible, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      category = excluded.category,
      sport_category = excluded.sport_category,
      image_path = excluded.image_path,
      gallery_json = excluded.gallery_json,
      specs_json = excluded.specs_json,
      is_visible = excluded.is_visible,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  const translationStatement = db.prepare(`
    INSERT INTO cms_collection_translations (
      collection_id, locale, title, caption, story, category_label, sport_category_label,
      seo_title, seo_description, og_image_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(collection_id, locale) DO UPDATE SET
      title = excluded.title,
      caption = excluded.caption,
      story = excluded.story,
      category_label = excluded.category_label,
      sport_category_label = excluded.sport_category_label,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      og_image_path = excluded.og_image_path,
      updated_at = datetime('now')
  `);

  koItems.forEach((item, index) => {
    const id = item.id;
    const enItem = enItems.find((entry) => entry.id === id) ?? item;
    const detailImages = [
      item.image,
      'collection_detail_01.png',
      'collection_detail_02.png',
      'collection_detail_03.png',
      'collection_detail_04.png',
      'collection_detail_05.png'
    ].filter(Boolean);

    collectionStatement.run(
      id,
      id,
      item.category ?? 'collection',
      item.sportCategory ?? '',
      item.image ?? '',
      JSON.stringify(detailImages),
      JSON.stringify({
        year: item.year ?? '',
        sportCategory: item.sportCategory ?? ''
      }),
      index
    );
    seedCollectionTranslation(translationStatement, id, 'ko', item);
    seedCollectionTranslation(translationStatement, id, 'en', enItem);
  });
}

function seedCollectionTranslation(statement, id, locale, item) {
  statement.run(
    id,
    locale,
    item.title ?? id,
    item.caption ?? '',
    item.caption ?? '',
    item.categoryLabel ?? '',
    item.sportCategoryLabel ?? '',
    item.title ?? '',
    item.caption ?? '',
    item.image ?? ''
  );
}

function seedMedia() {
  const imageDir = path.join(root, 'public', 'images');

  if (!existsSync(imageDir)) {
    return;
  }

  const statement = db.prepare(`
    INSERT INTO cms_media (
      id, filename, path, url, mime_type, size_bytes, alt_ko, alt_en,
      storage_provider, storage_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', '', 'public', ?, datetime('now'), datetime('now'))
    ON CONFLICT(path) DO NOTHING
  `);

  for (const filename of readdirSync(imageDir)) {
    if (filename.startsWith('.')) {
      continue;
    }

    const filePath = path.join(imageDir, filename);

    if (!statSync(filePath).isFile()) {
      continue;
    }

    statement.run(
      randomUUID(),
      filename,
      `public/images/${filename}`,
      `/images/${filename}`,
      guessMime(filename),
      statSync(filePath).size,
      filename
    );
  }
}

function guessMime(filename) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  if (extension === '.gif') {
    return 'image/gif';
  }

  return 'application/octet-stream';
}

function readPath(value, pathValue) {
  return pathValue.split('.').reduce((current, segment) => {
    if (current == null) {
      return undefined;
    }

    const key = Array.isArray(current) && /^\d+$/.test(segment) ? Number(segment) : segment;
    return current[key];
  }, value);
}

function createSeoFromContent(content, page) {
  if (!content || typeof content !== 'object') {
    return {
      title: page.title,
      description: '',
      ogImagePath: ''
    };
  }

  return {
    title: readPath(content, 'hero.title') ?? content.title ?? page.title,
    description:
      readPath(content, 'hero.subtitle') ??
      readPath(content, 'hero.body') ??
      content.subtitle ??
      content.notice ??
      '',
    ogImagePath: readPath(content, 'hero.image') ?? content.image ?? ''
  };
}
