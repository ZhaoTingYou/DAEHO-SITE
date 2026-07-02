import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./admin-fields.tsx', import.meta.url), 'utf8');

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
