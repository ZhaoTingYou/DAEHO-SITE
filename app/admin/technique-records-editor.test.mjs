import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const editorUrl = new URL('./_components/technique-records-editor.tsx', import.meta.url);
const editorSource = existsSync(editorUrl) ? readFileSync(editorUrl, 'utf8') : '';
const pageSource = readFileSync(new URL('./(dashboard)/pages/[pageKey]/page.tsx', import.meta.url), 'utf8');
const i18nSource = readFileSync(new URL('../../lib/admin-i18n.ts', import.meta.url), 'utf8');
const imageGuidesSource = readFileSync(new URL('../../lib/cms/image-guides.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('Technique records use a dedicated bilingual CMS editor', () => {
  assert.equal(existsSync(editorUrl), true);
});

test('Technique editor manages stable rows with add, reorder, and protected deletion controls', () => {
  assert.match(editorSource, /useState/);
  assert.match(editorSource, /crypto\.randomUUID/);
  assert.match(editorSource, /key=\{item\.id\}/);
  assert.match(editorSource, /moveItem/);
  assert.match(editorSource, /window\.confirm/);
  assert.match(editorSource, /items\.length <= 1/);
  assert.match(editorSource, /disabled=\{index === 0\}/);
  assert.match(editorSource, /disabled=\{index === items\.length - 1\}/);
});

test('Technique editor submits one shared image and synchronized locale fields in visual order', () => {
  assert.match(editorSource, /name="techniqueRecords\.ids"/);
  assert.match(editorSource, /name="techniqueRecords\.length"/);
  assert.match(editorSource, /contentField\.\$\{locale\}\.main\.records\.items\.\$\{index\}\.\$\{field\}/);
  assert.match(editorSource, /contentImage\.ko\.main\.records\.items\.\$\{index\}\.image/);
  assert.match(editorSource, /String\(index \+ 1\)\.padStart\(2, '0'\)/);
  assert.equal((editorSource.match(/<ImageUploadField/g) ?? []).length, 1);
  assert.match(editorSource, /type="hidden"[\s\S]*contentFieldName\('en', index, 'image'\)/);
});

test('Mastery Technique replaces only records.items with the full-width bilingual editor', () => {
  assert.match(pageSource, /TechniqueRecordsEditor/);
  assert.match(pageSource, /pairTechniqueRecords/);
  assert.match(pageSource, /pageKey === 'mastery-technique'/);
  assert.match(pageSource, /excludedFieldPaths=\{techniqueEditor \? \['records\.items'\] : \[\]\}/);
  assert.match(pageSource, /<TechniqueRecordsEditor/);
});

test('Technique editor labels exist in all three CMS interface languages', () => {
  for (const key of [
    'techniqueRecords.title',
    'techniqueRecords.hint',
    'techniqueRecords.add',
    'techniqueRecords.moveUp',
    'techniqueRecords.moveDown',
    'techniqueRecords.delete',
    'techniqueRecords.confirmDelete',
    'techniqueRecords.sharedImage',
    'techniqueRecords.ko',
    'techniqueRecords.en',
    'techniqueRecords.minimumOne'
  ]) {
    assert.equal((i18nSource.match(new RegExp(`'${key.replace('.', '\\\.')}'`, 'g')) ?? []).length, 3, `${key} should exist in zh/en/ko`);
  }
});

test('Technique CMS catalog and image guide describe archive rows and 4:3 media', () => {
  const technique = pageCatalog.find((page) => page.pageKey === 'mastery-technique');
  const records = technique?.fields.find((field) => field.path === 'records.items');

  assert.equal(records?.label, '技术记录档案');
  assert.equal(records?.labels?.ko, '기술 기록 아카이브');
  assert.equal(records?.labels?.en, 'Technical record archive');
  assert.match(imageGuidesSource, /techniqueRecord: spec\('4:3', '1600 x 1200'/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|records\.items\.\*\.image': 'techniqueRecord'/);
});
