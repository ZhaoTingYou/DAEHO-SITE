import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./admin-fields.tsx', import.meta.url), 'utf8');
const textFieldSource = source.slice(
  source.indexOf('export function TextField'),
  source.indexOf('export function TextAreaField')
);
const imageUploadSource = source.slice(
  source.indexOf('export function ImageUploadField'),
  source.indexOf('export function AppendableArrayItemsField')
);
const appendableArraySource = source.slice(
  source.indexOf('export function AppendableArrayItemsField'),
  source.indexOf('function mediaFieldValue')
);
const pageEditorSource = readFileSync(new URL('../(dashboard)/pages/[pageKey]/page.tsx', import.meta.url), 'utf8');
const editableArraySource = pageEditorSource.slice(
  pageEditorSource.indexOf('function EditableArray({'),
  pageEditorSource.indexOf('function EditableArrayItemFields')
);
const editableArrayItemFieldsSource = pageEditorSource.slice(
  pageEditorSource.indexOf('function EditableArrayItemFields'),
  pageEditorSource.indexOf('function AppendArrayItems')
);
const pageCatalogSource = readFileSync(new URL('../../../lib/cms/page-catalog.ts', import.meta.url), 'utf8');
const imageGuidesSource = readFileSync(new URL('../../../lib/cms/image-guides.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('image upload previews and media library thumbnails use the shared preview background helper', () => {
  assert.match(source, /function mediaPreviewBackground/);
  assert.match(source, /style=\{mediaPreviewBackground\(previewUrl\)\}/);
  assert.match(source, /style=\{mediaPreviewBackground\(mediaPreviewUrl\(item\)\)\}/);
});

test('CMS image upload fields show per-position ratio and size guidance', () => {
  assert.match(source, /imageGuide\?: string/);
  assert.match(source, /\{imageGuide \? \(/);
  assert.match(pageEditorSource, /getPageImageGuide/);
  assert.match(pageEditorSource, /imageGuide=\{getPageImageGuide\(/);
  assert.match(pageEditorSource, /imageGuides=\{Object\.fromEntries/);
  assert.match(pageEditorSource, /getAdminImageGuide\('seo', adminLocale\)/);
});

test('image upload fields keep long filenames inside bilingual CMS panels', () => {
  assert.match(pageEditorSource, /<Panel className="min-w-0 p-5">/);
  assert.match(imageUploadSource, /className="grid min-w-0 gap-1\.5 text-sm/);
  assert.match(imageUploadSource, /className="grid min-w-0 gap-2"/);
  assert.match(imageUploadSource, /className="flex min-w-0 max-w-full flex-wrap items-start gap-2"/);
  assert.match(imageUploadSource, /className="min-h-10 w-full min-w-0 max-w-full flex-none rounded-md border[^\n]+md:w-56"/);
  assert.doesNotMatch(imageUploadSource, /md:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(imageUploadSource, /className=\{`break-all text-xs font-medium leading-5/);
});

test('image array cards constrain long filenames at every nested grid boundary', () => {
  assert.match(editableArraySource, /<section className="grid min-w-0 w-full max-w-full gap-4/);
  assert.match(editableArraySource, /className="grid min-w-0 w-full max-w-full gap-3"/);
  assert.match(editableArraySource, /className="grid min-w-0 w-full max-w-full gap-4 rounded-md/);
  assert.match(editableArrayItemFieldsSource, /<div className="grid min-w-0 w-full max-w-full gap-4">/);
  assert.match(appendableArraySource, /<section className="grid min-w-0 w-full max-w-full gap-4/);
  assert.match(appendableArraySource, /<div className="grid min-w-0 w-full max-w-full gap-4">/);
  assert.match(appendableArraySource, /className="grid min-w-0 w-full max-w-full gap-4 rounded-md/);
});

test('every managed page image field has a CMS image guide mapping', () => {
  const missing = [];

  for (const page of pageCatalog) {
    for (const field of page.fields) {
      const groupKey = field.groupKey ?? 'main';

      if (field.type === 'image') {
        const key = `${page.pageKey}|${groupKey}|${normalizeGuidePath(field.path)}`;
        if (!imageGuidesSource.includes(`'${key}'`)) {
          missing.push(key);
        }
      }

      for (const itemField of field.itemFields ?? []) {
        if (itemField.type !== 'image') {
          continue;
        }

        const key = `${page.pageKey}|${groupKey}|${normalizeGuidePath(`${field.path}.0.${itemField.path}`)}`;
        if (!imageGuidesSource.includes(`'${key}'`)) {
          missing.push(key);
        }
      }
    }
  }

  assert.deepEqual(missing, []);
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
  assert.match(source, /return \[\.\.\.current, Math\.max\(\.\.\.current\) \+ 1\]/);
  assert.match(source, /type="button"[\s\S]*\{addButtonLabel\}/);
  assert.match(source, /contentImageFieldName\(locale, groupKey, fieldPath\)/);
});

test('appendable CMS arrays honor field-specific maximum item counts', () => {
  const achievementPage = pageCatalog.find((page) => page.pageKey === 'heritage-achievement');
  const archiveField = achievementPage?.fields.find((field) => field.path === 'gallery.items');

  assert.equal(archiveField?.maxItems, 20);
  assert.match(pageCatalogSource, /maxItems\?: number/);
  assert.match(pageEditorSource, /maxItems=\{field\.maxItems\}/);
  assert.match(editableArraySource, /maxItems === undefined \|\| value\.length < maxItems/);
  assert.match(appendableArraySource, /const canAddRow = maxItems === undefined \|\| startIndex \+ rows\.length < maxItems/);
  assert.match(appendableArraySource, /disabled=\{!canAddRow\}/);
});

test('CMS text inputs are plain fields without ineffective font and alignment controls', () => {
  assert.doesNotMatch(source, /TextEditor(Font|Align|Locale|Label)/);
  assert.doesNotMatch(source, /textEditor(Fonts|Alignments|Style)/);
  assert.doesNotMatch(source, /editorControls/);
  assert.doesNotMatch(pageCatalogSource, /PageFieldEditorSettings|editor\?:/);
  assert.equal(pageCatalog.some((page) => page.fields.some((field) => field.editor)), false);
  assert.doesNotMatch(pageEditorSource, /editor(Font|Align|Locale|Controls)/);
});

test('plain text inputs cannot overflow their admin card', () => {
  assert.match(textFieldSource, /className="grid min-w-0 max-w-full gap-1\.5/);
  assert.match(textFieldSource, /className="min-h-10 w-full min-w-0 max-w-full rounded-md/);
});

function normalizeGuidePath(path) {
  return path.replace(/\.\d+(?=\.|$)/g, '.*');
}
