import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const cardSourceUrl = new URL('./achievement-record-card.tsx', import.meta.url);
const cardSource = existsSync(cardSourceUrl) ? readFileSync(cardSourceUrl, 'utf8') : '';
const renderSource = `${source}\n${cardSource}`;
const pageCatalogSource = readFileSync(new URL('../../lib/cms/page-catalog.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('achievement first record cards expand over the row instead of flipping', () => {
  assert.ok(source.includes('hoverText'), 'first record data should include hoverText for the card back copy');
  assert.ok(source.includes('<AchievementRecordDeck'), 'desktop first records should render through the full-row hover deck');
  assert.ok(cardSource.includes('achievement-record-card__panel'), 'first record cards should reveal an expanded hover panel');
  assert.ok(cardSource.includes('activeRecordIndex'), 'desktop deck should keep an active card while the pointer is inside the expanded panel');
  assert.ok(cardSource.includes('onMouseLeave={closeRecordPanel}'), 'expanded panel should animate closed when leaving the whole deck');
  assert.ok(cardSource.includes('achievement-record-deck__stage'), 'expanded desktop panel should be positioned by the full row stage');
  assert.ok(cardSource.includes('deckPanelStyle'), 'expanded desktop panel should cover the full row rather than a single card');
  assert.ok(!renderSource.includes('rotateY(180deg)'), 'first record cards should not use a flip transform');
  assert.ok(!renderSource.includes('[perspective:1200px]'), 'first record cards should not use 3D perspective');

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
  const expandedPanelContentBlock = renderSource.match(
    /function AchievementRecordPanelContent[\s\S]*?function AchievementRecordPagination/
  )?.[0] ?? '';

  assert.match(frontHeadingBlock, /\{record\.frontTitle\}/);
  assert.doesNotMatch(frontHeadingBlock, /\{record\.hoverText\}/);
  assert.doesNotMatch(expandedPanelContentBlock, /\{record\.backTitle\}/);
  assert.doesNotMatch(expandedPanelContentBlock, /\{firstTitle\}/);
  assert.match(expandedPanelContentBlock, /\{currentPage\}/);
  assert.ok(cardSource.includes('splitAchievementRecordPages(record.hoverText)'), 'card pages should come from the independent hover body');
});

test('achievement first record backs paginate long copy with a right-side next arrow', () => {
  assert.ok(source.includes('<AchievementRecordDeck'), 'page should delegate desktop records to the full-row hover deck');
  assert.ok(source.includes('<AchievementRecordCard'), 'page should keep mobile record cards readable without hover');
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
    'expanded panel should reserve top, centered content, and bottom rows'
  );
  assert.ok(
    cardSource.includes('items-center justify-center px-[clamp(44px,14%,58px)]'),
    'expanded copy should be centered inside symmetrical arrow gutters'
  );
  assert.ok(cardSource.includes('previousPageLabel'), 'multi-page cards should expose a left previous arrow label');
  assert.ok(cardSource.includes('left-3'), 'previous arrow should sit on the left side of the card');
  assert.ok(cardSource.includes('right-3'), 'next arrow should sit on the right side of the card');
  assert.ok(!cardSource.includes('pr-7 text-center'), 'copy must not be offset only to make space for the right arrow');
});

test('achievement expanded desktop panel closes with an exit animation without leaving a red edge', () => {
  assert.ok(cardSource.includes('renderedRecordIndex'), 'desktop panel content should stay mounted while the close animation runs');
  assert.ok(cardSource.includes('achievementRecordPanelExitMs'), 'desktop panel should delay unmounting until the exit transition finishes');
  assert.ok(cardSource.includes('handleDeckPointerMove'), 'moving the pointer into blank deck space should close the expanded panel');
  assert.ok(
    cardSource.includes("closest('.achievement-record-card, .achievement-record-card__panel')"),
    'blank-space detection should keep the panel open while the pointer is on a card or the expanded panel'
  );
  assert.ok(
    cardSource.includes('pointer-events-none translate-y-0 scale-x-100 opacity-0 duration-[680ms]'),
    'desktop closed panels should fade out at their original size'
  );
  assert.ok(cardSource.includes('const achievementRecordPanelExitMs = 680'), 'desktop panel close animation should be slower than the open animation');
  assert.ok(cardSource.includes('duration-[680ms]'), 'closed panels should use the slower close duration');
  assert.ok(cardSource.includes('duration-[420ms]'), 'open panels should keep the current responsive open duration');
  assert.ok(!cardSource.includes('scale-x-[0.985]'), 'closed panels must not shrink before disappearing');
  assert.ok(!cardSource.includes('translate-y-3 scale-x'), 'closed panels must not move or shrink before disappearing');
  assert.ok(!cardSource.includes('[transform:scaleX(0.32)]'), 'closed panels must not leave a wide red scaled edge');
});
