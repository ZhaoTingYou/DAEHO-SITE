import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sourceAt(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('public CMS textarea copy preserves manual line breaks across shared renderers', () => {
  const expectations = [
    ['components/section-intro.tsx', 'whitespace-pre-line font-body text-[15px] leading-[1.85] text-text'],
    ['components/legacy/heritage-hero.tsx', 'whitespace-pre-line text-[15px] leading-[1.8]'],
    ['components/specialty/specialty-detail-triplet.tsx', 'whitespace-pre-line font-body text-text'],
    ['components/empty-state.tsx', 'whitespace-pre-line font-body text-base leading-7 text-subtext'],
    ['components/site/site-footer.tsx', 'whitespace-pre-line font-body text-[14px] leading-6 text-subtext'],
    ['app/[locale]/(site)/news/[slug]/page.tsx', 'whitespace-pre-line font-body text-[15px] leading-8 text-text'],
    ['app/[locale]/(site)/mastery/creations/[slug]/page.tsx', 'whitespace-pre-line font-body text-text'],
    ['components/chronicle/chronicle-timeline.tsx', 'whitespace-pre-line font-body text-[14px] leading-7 text-text'],
    ['components/specialty/specialty-collection-gallery.tsx', 'whitespace-pre-line font-body text-subtext']
  ];

  for (const [relativePath, expectedClass] of expectations) {
    assert.ok(
      sourceAt(relativePath).includes(expectedClass),
      `${relativePath} should render CMS textarea copy with whitespace-pre-line`
    );
  }

  assert.match(
    sourceAt('components/specialty/specialty-process.tsx'),
    /<p className="[^"]*whitespace-pre-line[^"]*">\{step\.body\}<\/p>/,
    'components/specialty/specialty-process.tsx should preserve step.body line breaks'
  );

  assert.match(
    sourceAt('components/site/legal-document.tsx'),
    /className="[^"]*whitespace-pre-line[^"]*"[\s\S]*?\{line\}/,
    'components/site/legal-document.tsx should preserve legal section line breaks'
  );

  assert.match(
    sourceAt('app/[locale]/(site)/golf/inquiry/page.tsx'),
    /<p className="[^"]*whitespace-pre-line[^"]*">\{text\.hero\.body\}<\/p>/,
    'app/[locale]/(site)/golf/inquiry/page.tsx should preserve hero body line breaks'
  );

  assert.match(
    sourceAt('components/golf/golf-configurator.tsx'),
    /<p className="[^"]*whitespace-pre-line[^"]*">\s*\{content\.heads\.subtitle\}\s*<\/p>/,
    'components/golf/golf-configurator.tsx should preserve CMS subtitle line breaks'
  );
});

test('News masthead accepts a CMS line break and uses the requested desktop title size', () => {
  const newsPageSource = sourceAt('app/[locale]/(site)/news/page.tsx');
  const pageCatalog = JSON.parse(sourceAt('lib/cms/page-catalog.json'));
  const newsDefinition = pageCatalog.find((page) => page.pageKey === 'news');
  const mastheadTitleField = newsDefinition.fields.find(
    (field) => field.groupKey === 'main' && field.path === 'masthead.title'
  );

  assert.equal(mastheadTitleField.type, 'textarea');
  assert.equal(mastheadTitleField.rows, 2);
  assert.match(
    newsPageSource,
    /const mastheadTitleClass = locale === 'ko'[\s\S]*?'md:text-\[60px\] md:leading-\[1\.15\]'[\s\S]*?: 'md:text-\[clamp\(56px,8vw,104px\)\] md:leading-\[0\.86\]'/
  );
  assert.ok(newsPageSource.includes('mobile-display whitespace-pre-line text-primary ${mastheadTitleClass}'));
});

test('News masthead defaults and existing CMS content use the requested two-line Korean title', () => {
  const expectedTitle = '대호 제작\n사례와 뉴스';
  const koMessages = JSON.parse(sourceAt('messages/ko.json'));
  const staticCmsPreview = JSON.parse(sourceAt('data/cms-preview.json'));
  const staticNewsPage = staticCmsPreview.tables.cms_pages.find((page) => page.page_key === 'news');
  const staticNewsContent = JSON.parse(staticNewsPage.content_ko);
  const migrationSource = sourceAt(
    'backend/cms/src/main/resources/db/migration/V9__news_masthead_line_break.sql'
  );

  assert.equal(koMessages.news.masthead.title, expectedTitle);
  assert.equal(staticNewsContent.__groups.main.masthead.title, expectedTitle);
  assert.match(migrationSource, /대호 제작\\n사례와 뉴스/);
  assert.match(migrationSource, /대호 제작 사례와 뉴스/);
});
