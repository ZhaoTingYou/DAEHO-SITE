import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./image-src.ts', import.meta.url), 'utf8');
const adminFieldsSource = readFileSync(new URL('../app/admin/_components/admin-fields.tsx', import.meta.url), 'utf8');
const adminActionsSource = readFileSync(new URL('../app/admin/actions.ts', import.meta.url), 'utf8');

test('imageSrc delegates CMS image filenames to the Storage resolver', () => {
  assert.match(source, /import \{storageImageSrc\}/);
  assert.match(source, /return storageImageSrc\(value\)/);
  assert.doesNotMatch(source, /return `\/images\//);
});

test('admin media library stores remote object URLs as image field values', () => {
  assert.match(adminFieldsSource, /function mediaFieldValue\(item: MediaLibraryItem\)/);
  assert.match(adminFieldsSource, /function mediaPreviewUrl\(item: MediaLibraryItem\)/);
  assert.match(adminFieldsSource, /\^https\?:\\\/\\\//);
  assert.match(adminFieldsSource, /filenameInputRef\.current\.value = nextFieldValue/);
  assert.match(adminFieldsSource, /filename: nextFieldValue/);
});

test('admin direct uploads store remote object URLs as image field values', () => {
  assert.match(adminActionsSource, /function mediaImageFieldValue\(/);
  assert.match(adminActionsSource, /return mediaImageFieldValue\(media\);/);
});
