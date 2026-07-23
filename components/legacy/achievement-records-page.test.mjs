import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const cardSourceUrl = new URL('./achievement-record-card.tsx', import.meta.url);
const cardSource = existsSync(cardSourceUrl) ? readFileSync(cardSourceUrl, 'utf8') : '';
const pentagonSource = readFileSync(new URL('./achievement-pentagon-stats.tsx', import.meta.url), 'utf8');
const renderSource = `${source}\n${cardSource}`;
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));
const mobileCssSource = readFileSync(new URL('../../styles/mobile.css', import.meta.url), 'utf8');
const localeMessages = Object.fromEntries(
  ['ko', 'en'].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'))
  ])
);

test('achievement first records render up to four static title-above-image cards without hover panels or pagination', () => {
  assert.ok(source.includes('<AchievementRecordGallery'), 'page should render first records through the static image gallery');
  assert.ok(cardSource.includes('achievement-record-gallery'), 'first records should use a named static gallery');
  assert.ok(cardSource.includes('records.slice(0, 4)'), 'gallery should be limited to the first four record images');
  assert.ok(cardSource.includes('achievement-record-gallery__title'), 'each record should render its editable title above the image');
  assert.ok(cardSource.includes('line-clamp-2'), 'record titles should be clamped to two lines');
  assert.ok(cardSource.includes('min-h-['), 'record titles should reserve a consistent height before the image');
  assert.ok(cardSource.indexOf('achievement-record-gallery__title') < cardSource.indexOf('<figure'), 'the title must precede the image in DOM order');
  assert.ok(cardSource.includes('record.title || `${imageAltPrefix} ${index + 1}`'), 'image alt text should use the displayed title with a section/index fallback');
  assert.ok(!cardSource.includes("'use client'"), 'static first record images should not need a client component');
  assert.ok(!renderSource.includes('AchievementRecordDeck'), 'desktop first records should not use the previous hover deck');
  assert.ok(!renderSource.includes('AchievementRecordCard'), 'mobile first records should not use the previous interactive cards');
  assert.ok(!renderSource.includes('achievement-record-card__panel'), 'the red hover panel should be removed');
  assert.ok(!renderSource.includes('AchievementRecordPagination'), 'the first record gallery should not include arrow pagination');
  assert.ok(!renderSource.includes('splitAchievementRecordPages'), 'hover body pagination should be removed');
  assert.ok(!renderSource.includes('onMouseEnter'), 'first record images should not animate on hover');
  assert.ok(!renderSource.includes('group-hover'), 'first record images should not reveal hover states');
  assert.ok(!renderSource.includes('bg-[#62302F] p-8 text-[#F4E6E1]'), 'first records should not render the old red content block');
});

test('achievement first record CMS items expose the image-above title before the image', () => {
  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const firstRecordsField = achievementPage?.fields.find((field) => field.path === 'copy.firstRecords');
  const firstRecordItemPaths = firstRecordsField?.itemFields.map((field) => field.path) ?? [];

  assert.deepEqual(firstRecordItemPaths, ['frontTitle', 'image']);
  assert.equal(firstRecordsField?.itemFields[0]?.label, '图片上方标题');
  assert.equal(firstRecordsField?.itemFields[1]?.type, 'image');
});

test('achievement runtime locale messages have four localized titled fallback records', () => {
  assert.deepEqual(localeMessages.ko.legacyPages.achievement.copy.firstRecords, [
    {frontTitle: '국내 최초 이니셜 조각 적용', image: 'legacy_achievement_01.png'},
    {frontTitle: '국내 최초 엔티크 블랙 코팅 적용', image: 'legacy_achievement_02.png'},
    {frontTitle: '국내 최초 반지 내부 디자인 적용', image: 'legacy_achievement_03.png'},
    {frontTitle: '국내 최초 기록 04', image: 'legacy_achievement_04.png'}
  ]);
  assert.deepEqual(localeMessages.en.legacyPages.achievement.copy.firstRecords, [
    {frontTitle: 'First domestic application of initial engraving', image: 'legacy_achievement_01.png'},
    {frontTitle: 'First domestic application of antique black coating', image: 'legacy_achievement_02.png'},
    {frontTitle: 'First domestic approach to interior ring design', image: 'legacy_achievement_03.png'},
    {frontTitle: 'DAEHO first record 04', image: 'legacy_achievement_04.png'}
  ]);
});

test('achievement component keeps only a generic four-image safety fallback', () => {
  assert.ok(source.includes('const fallbackFirstRecordImages = ['), 'the component should retain a four-image safety fallback');
  assert.equal((source.match(/legacy_achievement_0[1-4]\.png/g) ?? []).length, 8, 'the four FIRST RECORDS safety images should coexist with four market image references');
  assert.ok(source.includes("title: `${titlePrefix} ${String(index + 1).padStart(2, '0')}`"), 'the safety fallback should derive neutral titles from the localized section heading');
  assert.doesNotMatch(source, /title: '국내 최초 이니셜 조각 적용'|title: 'First domestic application of initial engraving'/);
  assert.doesNotMatch(source, /backTitle|hoverText/);
});

test('achievement first record gallery uses a one, two, four-column responsive static layout', () => {
  const firstRecordsSection = source.match(
    /<section className="overflow-hidden bg-bg[\s\S]*?<section className="bg-\[#f4efe6\]/
  )?.[0] ?? '';

  assert.ok(firstRecordsSection.includes('aria-label={copy.firstHeading}'), 'static gallery should keep an accessible section label');
  assert.ok(cardSource.includes('md:grid-cols-2'), 'gallery should become two columns on tablets');
  assert.ok(cardSource.includes('lg:grid-cols-4'), 'gallery should become four columns on large desktop screens');
  assert.ok(cardSource.includes('gap-6'), 'gallery should retain approximately 24px gaps');
  assert.ok(cardSource.includes('max-w-[1440px]'), 'gallery width should grow beyond the former three-card layout');
  assert.ok(!firstRecordsSection.includes('achievement-record-mobile-list'), 'first records should not keep a separate mobile interactive list');
  assert.doesNotMatch(
    firstRecordsSection,
    /<DraggableScroll[\s\S]*?copy\.firstRecords[\s\S]*?<\/DraggableScroll>/,
    'first records must not use a draggable or animated scroll surface'
  );
});

test('achievement mobile styles do not override the gallery gap or impose an aspect ratio on title-plus-image cards', () => {
  assert.doesNotMatch(
    mobileCssSource,
    /\.mobile-page-shell \.achievement-record-gallery\s*\{[^}]*gap:\s*0;/,
    'mobile CSS must preserve the gallery gap-6 spacing'
  );
  assert.doesNotMatch(
    mobileCssSource,
    /\.mobile-page-shell \.achievement-record-gallery__item\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3;/,
    'mobile CSS must not flatten the title-plus-portrait card to 4:3'
  );
});

test('achievement first record normalization prefers frontTitle, falls back to title, and never fills configured records from fallback images', () => {
  assert.ok(source.includes("title: record.frontTitle?.trim() || record.title?.trim() || ''"), 'legacy frontTitle should be displayed before the trimmed title compatibility fallback');
  assert.ok(!source.includes('fallbackRecords[index]?.image'), 'configured records should not receive synthesized fallback images');
  assert.ok(source.includes('firstRecords: firstRecords.length > 0 ? firstRecords : fallbackFirstRecords'), 'the complete safety fallback list should only be used when no configured records are valid');
});

test('achievement mobile stat section hides the pentagon diagram', () => {
  const mobileStatsBlock = pentagonSource.match(
    /<Reveal className="md:hidden">[\s\S]*?<\/Reveal>/
  )?.[0] ?? '';

  assert.ok(mobileStatsBlock.includes('items.map'), 'mobile stats should still show the five stat items');
  assert.doesNotMatch(
    mobileStatsBlock,
    /<PentagonDiagram/,
    'the pentagon diagram should be desktop-only because it is too dense on mobile'
  );
});
