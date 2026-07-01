import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const cardSourceUrl = new URL('./achievement-record-card.tsx', import.meta.url);
const cardSource = existsSync(cardSourceUrl) ? readFileSync(cardSourceUrl, 'utf8') : '';
const pentagonSource = readFileSync(new URL('./achievement-pentagon-stats.tsx', import.meta.url), 'utf8');
const adminPageSource = readFileSync(new URL('../../app/admin/(dashboard)/pages/[pageKey]/page.tsx', import.meta.url), 'utf8');
const renderSource = `${source}\n${cardSource}`;
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('achievement first records render as three static images without hover panels or pagination', () => {
  assert.ok(source.includes('<AchievementRecordGallery'), 'page should render first records through the static image gallery');
  assert.ok(cardSource.includes('achievement-record-gallery'), 'first records should use a named static gallery');
  assert.ok(cardSource.includes('records.slice(0, 3)'), 'gallery should be limited to the three record images');
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

test('achievement first record CMS items only expose image fields', () => {
  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const firstRecordsField = achievementPage?.fields.find((field) => field.path === 'copy.firstRecords');
  const firstRecordItemPaths = firstRecordsField?.itemFields.map((field) => field.path) ?? [];

  assert.deepEqual(firstRecordItemPaths, ['image']);
  assert.ok(
    adminPageSource.includes("itemFields?.length === 1 && itemFields[0]?.path === 'image'"),
    'image-only CMS arrays should not show hidden legacy title fields as item headings'
  );
});

test('achievement first record fallback data only carries images', () => {
  const fallbackBlock = source.match(/firstRecords: \[[\s\S]*?\],\n    marketFeatures:/)?.[0] ?? '';

  assert.match(fallbackBlock, /image: 'legacy_achievement_01\.png'/);
  assert.match(fallbackBlock, /image: 'legacy_achievement_02\.png'/);
  assert.match(fallbackBlock, /image: 'legacy_achievement_03\.png'/);
  assert.doesNotMatch(fallbackBlock, /frontTitle|backTitle|hoverText/);
});

test('achievement first record gallery uses one responsive static layout for desktop and mobile', () => {
  const firstRecordsSection = source.match(
    /<section className="overflow-hidden bg-bg[\s\S]*?<section className="bg-\[#f4efe6\]/
  )?.[0] ?? '';

  assert.ok(firstRecordsSection.includes('aria-label={copy.firstHeading}'), 'static gallery should keep an accessible section label');
  assert.ok(cardSource.includes('md:grid-cols-3'), 'gallery should become three columns on desktop');
  assert.ok(!firstRecordsSection.includes('achievement-record-mobile-list'), 'first records should not keep a separate mobile interactive list');
  assert.doesNotMatch(
    firstRecordsSection,
    /<DraggableScroll[\s\S]*?copy\.firstRecords[\s\S]*?<\/DraggableScroll>/,
    'first records must not use a draggable or animated scroll surface'
  );
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
