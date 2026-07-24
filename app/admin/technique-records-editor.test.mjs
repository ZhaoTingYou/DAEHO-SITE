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

test('Technique editor manages stable carousel slides with add, reorder, and a three-item deletion floor', () => {
  assert.match(editorSource, /useState/);
  assert.match(editorSource, /crypto\.randomUUID/);
  assert.match(editorSource, /key=\{item\.id\}/);
  assert.match(editorSource, /moveItem/);
  assert.match(editorSource, /window\.confirm/);
  assert.match(editorSource, /items\.length <= minimumTechniqueCarouselItems/);
  assert.match(editorSource, /disabled=\{index === 0\}/);
  assert.match(editorSource, /disabled=\{index === items\.length - 1\}/);
});

test('Technique editor submits one shared image and only bilingual title and body fields', () => {
  assert.match(editorSource, /name="techniqueRecords\.ids"/);
  assert.match(editorSource, /name="techniqueRecords\.length"/);
  assert.match(editorSource, /contentField\.\$\{locale\}\.main\.records\.items\.\$\{index\}\.\$\{field\}/);
  assert.match(editorSource, /contentImage\.ko\.main\.records\.items\.\$\{index\}\.image/);
  assert.equal((editorSource.match(/<ImageUploadField/g) ?? []).length, 1);
  assert.match(editorSource, /type="hidden"[\s\S]*contentFieldName\('en', index, 'image'\)/);
  assert.doesNotMatch(editorSource, /fieldScope|fieldStatus|['"]number['"]/);
});

test('Mastery Technique replaces only records.items with the full-width bilingual editor', () => {
  assert.match(pageSource, /TechniqueRecordsEditor/);
  assert.match(pageSource, /pairTechniqueRecords/);
  assert.match(pageSource, /pageKey === 'mastery-technique'/);
  assert.match(pageSource, /excludedFieldPaths=\{techniqueEditor \? \['records\.items'\] : \[\]\}/);
  assert.match(pageSource, /<TechniqueRecordsEditor/);
});

test('Technique CMS exposes a centered bilingual introduction beside the dedicated carousel editor', () => {
  const technique = pageCatalog.find((page) => page.pageKey === 'mastery-technique');
  const introTitle = technique?.fields.find((field) => field.path === 'intro.title');
  const introBody = technique?.fields.find((field) => field.path === 'intro.body');

  assert.equal(introTitle?.editor?.align, 'center');
  assert.equal(introBody?.type, 'textarea');
  assert.equal(introBody?.rows, 4);
  assert.equal(introBody?.editor?.align, 'center');
  assert.match(pageSource, /excludedFieldPaths=\{techniqueEditor \? \['records\.items'\] : \[\]\}/);
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
    'techniqueRecords.minimumThree',
    'techniqueRecords.fieldTitle',
    'techniqueRecords.fieldBody'
  ]) {
    assert.equal((i18nSource.match(new RegExp(`'${key.replace('.', '\\\.')}'`, 'g')) ?? []).length, 3, `${key} should exist in zh/en/ko`);
  }
});

test('Technique CMS catalog and image guide describe bilingual 2:1 carousel slides', () => {
  const technique = pageCatalog.find((page) => page.pageKey === 'mastery-technique');
  const records = technique?.fields.find((field) => field.path === 'records.items');

  assert.equal(records?.label, '工艺轮播');
  assert.equal(records?.labels?.ko, '테크닉 캐러셀');
  assert.equal(records?.labels?.en, 'Technique carousel');
  assert.deepEqual(records?.itemFields.map((field) => field.path), ['title', 'body', 'image']);
  assert.match(imageGuidesSource, /techniqueCarousel: spec\('2:1', '2000 x 1000'/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|records\.items\.\*\.image': 'techniqueCarousel'/);
});
