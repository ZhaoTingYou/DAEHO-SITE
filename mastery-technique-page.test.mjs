import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const techniquePagePath = new URL('./app/[locale]/(site)/mastery/technique/page.tsx', import.meta.url);
const techniqueRecordsSectionPath = new URL('./components/specialty/technique-records-section.tsx', import.meta.url);
const techniquePageSource = readFileSync(techniquePagePath, 'utf8');
const techniqueRecordsSectionSource = existsSync(techniqueRecordsSectionPath)
  ? readFileSync(techniqueRecordsSectionPath, 'utf8')
  : '';
const makingPageSource = readFileSync(new URL('./app/[locale]/(site)/mastery/making/page.tsx', import.meta.url), 'utf8');
const siteMapSource = readFileSync(new URL('./lib/site-map.ts', import.meta.url), 'utf8');
const footerSource = readFileSync(new URL('./components/site/site-footer.tsx', import.meta.url), 'utf8');
const seoSource = readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');
const sitemapSource = readFileSync(new URL('./app/sitemap.ts', import.meta.url), 'utf8');
const imageGuidesSource = readFileSync(new URL('./lib/cms/image-guides.ts', import.meta.url), 'utf8');
const localeMessagesSource = readFileSync(new URL('./lib/locale-messages.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('./lib/cms/page-catalog.json', import.meta.url), 'utf8'));
const koMessages = JSON.parse(readFileSync(new URL('./messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('./messages/en.json', import.meta.url), 'utf8'));

test('Mastery has a standalone Technique page separate from Making', () => {
  assert.equal(existsSync(techniquePagePath), true);

  assert.match(techniquePageSource, /getPageMetadata\(locale, 'techniqueRecords'\)/);
  assert.match(techniquePageSource, /specialtyPages\.techniqueRecords/);
  assert.doesNotMatch(techniquePageSource, /SpecialtyProcess/);
  assert.match(makingPageSource, /specialtyPages\.technique/);
  assert.match(makingPageSource, /SpecialtyProcess/);
});

test('Mastery navigation orders Technique before Making and Creations', () => {
  const navTechnique = siteMapSource.indexOf("id: 'technique'");
  const navMaking = siteMapSource.indexOf("id: 'making'");
  const navCollection = siteMapSource.indexOf("id: 'collection'");

  assert.ok(navTechnique >= 0, 'site map should include Technique');
  assert.ok(navMaking > navTechnique, 'Making should follow Technique');
  assert.ok(navCollection > navMaking, 'Creations should follow Making');
  assert.match(siteMapSource, /href: '\/mastery\/technique'/);
  assert.match(siteMapSource, /href: '\/mastery\/making'/);
  assert.match(footerSource, /href: '\/mastery\/technique'/);
  assert.match(footerSource, /href: '\/mastery\/making'/);
  assert.equal(koMessages.home.pillars.items.find((item) => item.title === 'MASTERY')?.href, '/mastery/technique');
  assert.equal(enMessages.home.pillars.items.find((item) => item.title === 'MASTERY')?.href, '/mastery/technique');
});

test('CMS common copy cannot keep stale Making labels on the new Technique nav item', () => {
  assert.match(localeMessagesSource, /normalizeMasteryNavigationCopy/);
  assert.match(localeMessagesSource, /items\.technique === items\.making/);
  assert.match(localeMessagesSource, /descriptions\.technique === descriptions\.making/);
  assert.match(localeMessagesSource, /Technique · Seven careful stages/);
});

test('Technique page has CMS, SEO, sitemap, and image guide entries', () => {
  const techniqueDefinition = pageCatalog.find((page) => page.pageKey === 'mastery-technique');

  assert.equal(techniqueDefinition?.href, '/mastery/technique');
  assert.equal(techniqueDefinition?.sourcePath, 'specialtyPages.techniqueRecords');
  assert.deepEqual(
    techniqueDefinition.fields.map((field) => field.path),
    [
      'hero.eyebrow',
      'hero.title',
      'hero.body',
      'hero.image',
      'records.eyebrow',
      'records.title',
      'records.items',
      'standards.eyebrow',
      'standards.title',
      'standards.items',
      'evidence.eyebrow',
      'evidence.title',
      'evidence.rows',
      'cta.title',
      'cta.makingLabel',
      'cta.creationsLabel'
    ]
  );
  assert.match(seoSource, /techniqueRecords: 'mastery-technique'/);
  assert.match(seoSource, /techniqueRecords: '\/mastery\/technique'/);
  assert.match(sitemapSource, /'\/mastery\/technique'/);
  assert.match(sitemapSource, /'\/mastery\/technique': 0\.91/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|hero\.image': 'ultrawide'/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|records\.items\.\*\.image': 'techniqueRecord'/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|standards\.items\.\*\.image': 'square'/);
});

test('Technique copy uses placeholder proof language without unverified absolute claims', () => {
  for (const messages of [koMessages, enMessages]) {
    const content = messages.specialtyPages.techniqueRecords;

    assert.ok(content, 'Technique records copy should exist');
    assert.equal(content.hero.title, 'TECHNIQUE');
    assert.equal(content.records.items.length, 3);
    assert.equal(content.standards.items.length, 4);
    assert.ok(content.records.items.every((item) => /확인 예정|To be confirmed/.test(item.status)));
    assert.ok(content.evidence.rows.every((row) => /기록 준비 중|Record pending/.test(row.proof)));
  }

  assert.doesNotMatch(koMessages.specialtyPages.techniqueRecords.hero.body, /국내 유일|유일하게|확정/);
  assert.doesNotMatch(enMessages.specialtyPages.techniqueRecords.hero.body, /only maker|first in Korea/i);
});

test('Technique records are extracted into a named server component', () => {
  assert.equal(existsSync(techniqueRecordsSectionPath), true, 'TechniqueRecordsSection should have its own module');
  assert.match(techniqueRecordsSectionSource, /export function TechniqueRecordsSection\(/);
  assert.doesNotMatch(techniqueRecordsSectionSource, /['"]use client['"]/, 'records section should remain a server component');
  assert.match(
    techniquePageSource,
    /import \{TechniqueRecordsSection\} from '@\/components\/specialty\/technique-records-section';/
  );
  assert.match(
    techniquePageSource,
    /<TechniqueRecordsSection[\s\S]*?eyebrow=\{content\.records\.eyebrow\}[\s\S]*?title=\{content\.records\.title\}[\s\S]*?records=\{content\.records\.items\}[\s\S]*?\/>/
  );
  assert.doesNotMatch(`${techniquePageSource}\n${techniqueRecordsSectionSource}`, /TechniqueRecordCard/);
});

test('Technique records render arbitrary-length archive rows with a count header', () => {
  assert.match(techniqueRecordsSectionSource, /records:\s*TechniqueRecord\[\]/);
  assert.match(techniqueRecordsSectionSource, /records\.map\(\(item, index\) =>/);
  assert.match(techniqueRecordsSectionSource, /key=\{item\.id \?\? item\.number\}/);
  assert.match(techniqueRecordsSectionSource, /String\(records\.length\)\.padStart\(2, '0'\)/);
  assert.doesNotMatch(`${techniquePageSource}\n${techniqueRecordsSectionSource}`, /\bsticky\b/);
  assert.doesNotMatch(techniqueRecordsSectionSource, /md:grid-cols-3/);
});

test('Technique rows keep image-first mobile order and alternate desktop columns with CSS', () => {
  const mapStart = techniqueRecordsSectionSource.indexOf('records.map');
  const imageStart = techniqueRecordsSectionSource.indexOf('<SafeImage', mapStart);
  const copyStart = techniqueRecordsSectionSource.indexOf('<ScrollText', imageStart);

  assert.ok(mapStart >= 0 && imageStart > mapStart && copyStart > imageStart, 'row DOM should render image before text');
  assert.match(techniqueRecordsSectionSource, /aspect="aspect-\[4\/3\]"/);
  assert.match(techniqueRecordsSectionSource, /alt=\{item\.title\}/);
  assert.match(techniqueRecordsSectionSource, /sizes="\(min-width: 1024px\) 560px, 100vw"/);
  assert.match(techniqueRecordsSectionSource, /index % 2 === 0 \? 'lg:order-1' : 'lg:order-2'/);
  assert.match(techniqueRecordsSectionSource, /index % 2 === 0 \? 'lg:order-2' : 'lg:order-1'/);

  const articleClass = techniqueRecordsSectionSource.match(/<article[\s\S]*?className="([^"]+)"/)?.[1] ?? '';
  assert.ok(articleClass.includes('border-b'), 'archive rows should be border-separated');
  assert.equal(articleClass.split(/\s+/).includes('border'), false, 'archive rows should not use a card border wrapper');
  assert.equal(articleClass.includes('shadow'), false, 'archive rows should not use card shadows');
});

test('Technique row metadata keeps status optional and body copy readable', () => {
  const statusMarkup = techniqueRecordsSectionSource.match(/\{item\.status \? \(([\s\S]*?)\) : null\}/)?.[1] ?? '';

  assert.ok(statusMarkup, 'status should render only when it is non-empty');
  assert.doesNotMatch(statusMarkup, /\bborder\b|<button/, 'status should be quiet text without box or button treatment');
  assert.match(techniqueRecordsSectionSource, /\{item\.scope\}/);
  assert.match(techniqueRecordsSectionSource, /whitespace-pre-line[^"\n]*text-\[16px\][^"\n]*[\s\S]*?\{item\.body\}/);
});
