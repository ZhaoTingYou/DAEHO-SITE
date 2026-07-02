import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./admin-fields.tsx', import.meta.url), 'utf8');
const pageEditorSource = readFileSync(new URL('../(dashboard)/pages/[pageKey]/page.tsx', import.meta.url), 'utf8');
const pageCatalogSource = readFileSync(new URL('../../../lib/cms/page-catalog.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('image upload previews and media library thumbnails use the shared preview background helper', () => {
  assert.match(source, /function mediaPreviewBackground/);
  assert.match(source, /style=\{mediaPreviewBackground\(previewUrl\)\}/);
  assert.match(source, /style=\{mediaPreviewBackground\(mediaPreviewUrl\(item\)\)\}/);
});

test('media library selection stores remote object URLs when media lives in object storage', () => {
  assert.doesNotMatch(source, /const selectedMediaValue = mediaValue\(item\)/);
  assert.match(source, /const nextFieldValue = mediaFieldValue\(item\)/);
  assert.match(source, /filenameInputRef\.current\.value = nextFieldValue/);
  assert.match(source, /filename: nextFieldValue/);
  assert.match(source, /function mediaFieldValue\(item: MediaLibraryItem\)/);
});

test('appendable CMS arrays expose a client-side add button for multiple new image cards', () => {
  assert.match(source, /export function AppendableArrayItemsField/);
  assert.match(source, /setRows\(\(current\) => \[\.\.\.current,/);
  assert.match(source, /type="button"[\s\S]*\{addButtonLabel\}/);
  assert.match(source, /contentImageFieldName\(locale, groupKey, fieldPath\)/);
});

test('text editors expose only approved brand fonts and alignment controls', () => {
  assert.match(source, /value: 'maruburi-semibold'/);
  assert.match(source, /label: 'MaruBuri SemiBold'/);
  assert.match(source, /fontFamily: '"MaruBuri", serif'/);
  assert.match(source, /fontWeight: 600/);
  assert.match(source, /value: 'cormorant-garamond-700'/);
  assert.match(source, /label: 'Cormorant Garamond 700'/);
  assert.match(source, /fontFamily: '"Cormorant Garamond", serif'/);
  assert.match(source, /fontWeight: 700/);
  assert.match(source, /const textEditorAlignments: Array<\{value: TextEditorAlign; label: string\}> = \[/);
  assert.match(source, /\{value: 'left', label: 'L'\}/);
  assert.match(source, /\{value: 'center', label: 'C'\}/);
  assert.match(source, /\{value: 'right', label: 'R'\}/);
});

test('page text fields read their editor font and alignment preset from the catalog', () => {
  assert.match(pageCatalogSource, /type PageFieldEditorSettings = \{/);
  assert.match(pageCatalogSource, /editor\?: PageFieldEditorSettings/);
  assert.match(source, /editorFont/);
  assert.match(source, /editorAlign/);
  assert.match(source, /normalizeTextEditorAlign\(editorAlign\)/);
  assert.match(pageEditorSource, /editorFont=\{field\.editor\?\.font\}/);
  assert.match(pageEditorSource, /editorAlign=\{field\.editor\?\.align\}/);
  assert.match(pageEditorSource, /editorFont=\{editor\?\.font\}/);
  assert.match(pageEditorSource, /editorAlign=\{editor\?\.align\}/);
});

test('known centered page positions are declared as centered editor fields', () => {
  assert.equal(findField('home', 'main', 'title')?.editor?.align, 'center');
  assert.equal(findField('home', 'main', 'signature.title')?.editor?.align, 'center');
  assert.equal(findField('news', 'main', 'masthead.title')?.editor?.align, 'center');
  assert.equal(findField('contact', 'main', 'hero.title')?.editor?.align, 'center');
  assert.equal(findField('heritage-achievement', 'main', 'copy.quoteBody')?.editor?.align, 'center');
});

function findField(pageKey, groupKey, path) {
  const page = pageCatalog.find((entry) => entry.pageKey === pageKey);
  return page?.fields.find((field) => (field.groupKey ?? 'main') === groupKey && field.path === path);
}
