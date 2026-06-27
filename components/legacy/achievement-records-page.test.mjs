import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('achievement first record cards flip to reveal editable hover copy', () => {
  assert.ok(source.includes('hoverText'), 'first record data should include hoverText for the card back copy');
  assert.ok(source.includes('[perspective:1200px]'), 'first record cards should define a 3D perspective');
  assert.ok(source.includes('group-hover:[transform:rotateY(180deg)]'), 'first record cards should rotate on hover');
  assert.ok(source.includes('[backface-visibility:hidden]'), 'front and back card faces should hide their reverse side');

  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const firstRecordsField = achievementPage?.fields.find((field) => field.path === 'copy.firstRecords');
  const firstRecordItemPaths = firstRecordsField?.itemFields.map((field) => field.path) ?? [];

  assert.ok(firstRecordItemPaths.includes('hoverText'), 'CMS should expose editable hoverText for first record cards');
});
