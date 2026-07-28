import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

import ts from 'typescript';

async function importCore() {
  const sourcePath = new URL('./static-snapshot-core.ts', import.meta.url);
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-cms-snapshot-'));
  const outputPath = path.join(tempDir, 'static-snapshot-core.mjs');
  writeFileSync(outputPath, output.outputText, 'utf8');
  const importedCore = await import(pathToFileURL(outputPath).href);
  rmSync(tempDir, {force: true, recursive: true});
  return importedCore;
}

const snapshot = {
  exportedAt: '2026-06-27T00:00:00.000Z',
  schemaVersion: 1,
  tables: {
    cms_pages: [
      {
        page_key: 'home',
        section: 'site',
        sort_order: 0,
        content_ko: '{"hero":{"title":"홈"}}',
        content_en: '{"hero":{"title":"Home"}}',
        seo_ko: '{"title":"홈 SEO"}',
        seo_en: '{"title":"Home SEO"}',
        updated_at: '2026-06-27T00:00:00.000Z'
      }
    ],
    cms_news: [
      {
        id: 'news-hidden',
        slug: 'hidden',
        category: 'press',
        image_path: 'hidden.png',
        published_at: '2026-01-01',
        is_featured: 0,
        is_visible: 0,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'news-visible',
        slug: 'visible',
        category: 'press',
        image_path: 'visible.png',
        mobile_image_path: 'visible-mobile.png',
        published_at: '2026-06-01',
        is_featured: 1,
        is_visible: 1,
        sort_order: 1,
        created_at: '2026-06-01T00:00:00.000Z'
      }
    ],
    cms_news_translations: [
      {
        news_id: 'news-visible',
        locale: 'ko',
        title: '보이는 뉴스',
        category_label: '소식',
        excerpt: '요약',
        body_json: '{"lead":"리드","paragraphs":["문단"],"quote":"인용"}',
        tags_json: '["태그"]',
        seo_title: '뉴스 SEO',
        seo_description: '뉴스 설명',
        og_image_path: 'og.png'
      },
      {
        news_id: 'news-visible',
        locale: 'en',
        title: 'Visible News',
        category_label: 'News',
        excerpt: 'Excerpt',
        body_json: '{"lead":"Lead"}',
        tags_json: '["Tag"]',
        seo_title: 'News SEO',
        seo_description: 'News description',
        og_image_path: 'og-en.png'
      }
    ],
    cms_collections: [
      {
        id: 'collection-visible',
        slug: 'ring-01',
        category: 'champion',
        sport_category: 'golf',
        image_path: 'ring.png',
        gallery_json: '["ring.png","ring-detail.png"]',
        specs_json: '{"year":"2026","sportCategory":"golf"}',
        is_visible: 1,
        sort_order: 0,
        created_at: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'collection-hidden',
        slug: 'hidden-ring',
        category: 'bespoke',
        sport_category: 'golf',
        image_path: 'hidden-ring.png',
        gallery_json: '[]',
        specs_json: '{}',
        is_visible: 0,
        sort_order: 1,
        created_at: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'collection-appointment',
        slug: 'appointment-ring',
        category: 'appointment',
        sport_category: '',
        image_path: 'appointment-ring.png',
        gallery_json: '[]',
        specs_json: '{"sportCategory":"public-service"}',
        is_visible: 1,
        sort_order: 2,
        created_at: '2026-06-01T00:00:00.000Z'
      }
    ],
    cms_collection_translations: [
      {
        collection_id: 'collection-visible',
        locale: 'ko',
        title: '챔피언 링',
        caption: '캡션',
        story: '스토리',
        category_label: '챔피언',
        sport_category_label: '골프',
        seo_title: '작품 SEO',
        seo_description: '작품 설명',
        og_image_path: 'ring-og.png'
      },
      {
        collection_id: 'collection-appointment',
        locale: 'ko',
        title: '임관반지',
        caption: '이전 설명',
        story: '',
        sport_category_label: '공공 서비스'
      }
    ],
    cms_media: [],
    cms_inquiries: [],
    cms_email_events: []
  }
};

test('snapshot public news matches the Spring public CMS shape', async () => {
  const {getSnapshotPublicNews, listSnapshotPublicNews} = await importCore();
  const items = listSnapshotPublicNews(snapshot, 'ko');

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    id: 'news-visible',
    slug: 'visible',
    category: 'press',
    imagePath: 'visible.png',
    mobileImagePath: 'visible-mobile.png',
    publishedAt: '2026-06-01',
    isFeatured: true,
    sortOrder: 1,
    locale: 'ko',
    title: '보이는 뉴스',
    categoryLabel: '소식',
    excerpt: '요약',
    body: {lead: '리드', paragraphs: ['문단'], quote: '인용'},
    tags: ['태그'],
    seoTitle: '뉴스 SEO',
    seoDescription: '뉴스 설명',
    ogImagePath: 'og.png'
  });
  assert.equal(getSnapshotPublicNews(snapshot, 'hidden', 'ko'), null);
  assert.equal(getSnapshotPublicNews(snapshot, 'visible', 'en').title, 'Visible News');
});

test('legacy news snapshots without a mobile image remain compatible', async () => {
  const {getSnapshotPublicNews} = await importCore();
  const legacySnapshot = structuredClone(snapshot);
  delete legacySnapshot.tables.cms_news[1].mobile_image_path;

  assert.equal(getSnapshotPublicNews(legacySnapshot, 'visible', 'ko').mobileImagePath, '');
});

test('snapshot public collections parses JSON fields and filters hidden rows', async () => {
  const {getSnapshotPublicCollection, listSnapshotPublicCollections} = await importCore();
  const items = listSnapshotPublicCollections(snapshot, 'ko');

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    id: 'collection-visible',
    slug: 'ring-01',
    category: 'champion',
    sportCategory: 'golf',
    imagePath: 'ring.png',
    gallery: ['ring.png', 'ring-detail.png'],
    specs: {year: '2026'},
    sortOrder: 0,
    locale: 'ko',
    title: '챔피언 링',
    story: '스토리',
    sportCategoryLabel: '골프'
  });
  assert.equal(getSnapshotPublicCollection(snapshot, 'hidden-ring', 'ko'), null);
  assert.equal(getSnapshotPublicCollection(snapshot, 'appointment-ring', 'ko'), null);
});

test('snapshot public collections preserve legacy story and sport values through canonical output', async () => {
  const {getSnapshotPublicCollection} = await importCore();
  const legacySnapshot = structuredClone(snapshot);
  legacySnapshot.tables.cms_collections[0].sport_category = '';
  legacySnapshot.tables.cms_collection_translations[0].story = '';

  const item = getSnapshotPublicCollection(legacySnapshot, 'ring-01', 'ko');
  assert.equal(item.sportCategory, 'golf');
  assert.equal(item.story, '캡션');
  assert.deepEqual(item.specs, {year: '2026'});
});

test('snapshot public pages expose localized content and seo', async () => {
  const {getSnapshotPublicPage} = await importCore();

  assert.deepEqual(getSnapshotPublicPage(snapshot, 'home', 'ko'), {
    pageKey: 'home',
    section: 'site',
    locale: 'ko',
    content: {hero: {title: '홈'}},
    seo: {title: '홈 SEO'},
    updatedAt: '2026-06-27T00:00:00.000Z'
  });
  assert.equal(getSnapshotPublicPage(snapshot, 'missing', 'ko'), null);
});

test('snapshot pages expose the admin listPages content shape for locale message overrides', async () => {
  const {listSnapshotPages} = await importCore();

  assert.deepEqual(listSnapshotPages(snapshot), [
    {
      pageKey: 'home',
      section: 'site',
      sortOrder: 0,
      content: {
        ko: {hero: {title: '홈'}},
        en: {hero: {title: 'Home'}}
      },
      seo: {
        ko: {title: '홈 SEO'},
        en: {title: 'Home SEO'}
      },
      createdAt: '',
      updatedAt: '2026-06-27T00:00:00.000Z'
    }
  ]);
});
