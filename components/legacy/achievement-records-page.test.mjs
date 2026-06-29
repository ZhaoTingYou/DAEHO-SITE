import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const cardSourceUrl = new URL('./achievement-record-card.tsx', import.meta.url);
const cardSource = existsSync(cardSourceUrl) ? readFileSync(cardSourceUrl, 'utf8') : '';
const renderSource = `${source}\n${cardSource}`;
const pageCatalogSource = readFileSync(new URL('../../lib/cms/page-catalog.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('achievement first record cards flip to reveal editable hover copy', () => {
  assert.ok(source.includes('hoverText'), 'first record data should include hoverText for the card back copy');
  assert.ok(renderSource.includes('[perspective:1200px]'), 'first record cards should define a 3D perspective');
  assert.ok(renderSource.includes('group-hover:[transform:rotateY(180deg)]'), 'first record cards should rotate on hover');
  assert.ok(renderSource.includes('[backface-visibility:hidden]'), 'front and back card faces should hide their reverse side');

  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const firstRecordsField = achievementPage?.fields.find((field) => field.path === 'copy.firstRecords');
  const firstRecordItemPaths = firstRecordsField?.itemFields.map((field) => field.path) ?? [];

  assert.ok(firstRecordItemPaths.includes('hoverText'), 'CMS should expose editable hoverText for first record cards');
});

test('achievement first record card fronts only show the visible card title above images', () => {
  const frontHeadingBlock = renderSource.match(
    /<div className="mb-5 flex min-h-\[34px\] flex-col justify-end text-center">[\s\S]*?<div className="achievement-record-card__stage/
  )?.[0] ?? '';

  assert.match(frontHeadingBlock, /\{record\.frontTitle\}/);
  assert.doesNotMatch(frontHeadingBlock, /\{record\.backTitle\}/);
  assert.doesNotMatch(frontHeadingBlock, /\{record\.hoverText\}/);
  assert.doesNotMatch(frontHeadingBlock, /<h3/);
});

test('achievement first record cards keep title and content fields independent', () => {
  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const firstRecordsField = achievementPage?.fields.find((field) => field.path === 'copy.firstRecords');
  const firstRecordItemPaths = firstRecordsField?.itemFields.map((field) => field.path) ?? [];

  assert.ok(firstRecordItemPaths.includes('frontTitle'), 'CMS should expose the visible card title independently');
  assert.ok(firstRecordItemPaths.includes('backTitle'), 'CMS should expose the flipped card title independently');
  assert.ok(firstRecordItemPaths.includes('hoverText'), 'CMS should expose the flipped card body independently');
  assert.equal(firstRecordsField?.itemFields.find((field) => field.path === 'frontTitle')?.fallbackPath, 'body');
  assert.equal(firstRecordsField?.itemFields.find((field) => field.path === 'backTitle')?.fallbackPath, 'title');
  assert.ok(pageCatalogSource.includes('getEditableArrayItemFieldLeaves'), 'saving should include schema-defined array item fields');
  assert.ok(source.includes('normalizeFirstRecords(copy.firstRecords, fallback.firstRecords)'), 'legacy records should keep default body copy without tying it to the visible title');
  assert.ok(!source.includes('hoverText: record.hoverText ?? record.body'), 'hover content must not silently copy the visible title');

  const frontHeadingBlock = renderSource.match(
    /<div className="mb-5 flex min-h-\[34px\] flex-col justify-end text-center">[\s\S]*?<div className="achievement-record-card__stage/
  )?.[0] ?? '';
  const backCardBlock = renderSource.match(
    /<div className="achievement-record-card__back[\s\S]*?<span className="mx-auto h-px/
  )?.[0] ?? '';

  assert.match(frontHeadingBlock, /\{record\.frontTitle\}/);
  assert.doesNotMatch(frontHeadingBlock, /\{record\.hoverText\}/);
  assert.match(backCardBlock, /\{record\.backTitle\}/);
  assert.match(backCardBlock, /\{currentPage\}/);
  assert.ok(cardSource.includes('splitAchievementRecordPages(record.hoverText)'), 'card pages should come from the independent hover body');
});

test('achievement first record backs paginate long copy with a right-side next arrow', () => {
  assert.ok(source.includes('<AchievementRecordCard'), 'page should delegate each record card to the interactive card component');
  assert.ok(cardSource.includes("'use client'"), 'record card pagination needs a client component');
  assert.ok(cardSource.includes('splitAchievementRecordPages'), 'long hover copy should be split into card pages');
  assert.ok(cardSource.includes('setPageIndex'), 'next arrow should switch the visible card page');
  assert.ok(cardSource.includes('aria-label={nextPageLabel}'), 'next arrow should be accessible');
  assert.ok(cardSource.includes('right-3'), 'next arrow should sit on the right side of the card');
  assert.ok(cardSource.includes('p-8'), 'card back should use equal fixed padding on all sides');
});

test('achievement first record card back copy stays centered between arrow gutters', () => {
  assert.ok(
    cardSource.includes('grid-rows-[auto_minmax(0,1fr)_auto]'),
    'card back should reserve top, centered content, and bottom rows'
  );
  assert.ok(
    cardSource.includes('items-center justify-center px-[clamp(44px,14%,58px)]'),
    'flipped copy should be centered inside symmetrical arrow gutters'
  );
  assert.ok(cardSource.includes('previousPageLabel'), 'multi-page cards should expose a left previous arrow label');
  assert.ok(cardSource.includes('left-3'), 'previous arrow should sit on the left side of the card');
  assert.ok(cardSource.includes('right-3'), 'next arrow should sit on the right side of the card');
  assert.ok(!cardSource.includes('pr-7 text-center'), 'copy must not be offset only to make space for the right arrow');
});
