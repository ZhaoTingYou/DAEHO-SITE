import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const collectionFormSource = readFileSync(new URL('./collection-form.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('../actions.ts', import.meta.url), 'utf8');
const galleryFieldUrl = new URL('./collection-gallery-field.tsx', import.meta.url);
const galleryFieldSource = existsSync(galleryFieldUrl) ? readFileSync(galleryFieldUrl, 'utf8') : '';

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);

  let depth = 0;
  let bodyStart = -1;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      bodyStart = bodyStart === -1 ? index : bodyStart;
    } else if (char === '}') {
      depth -= 1;
      if (bodyStart !== -1 && depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Unable to extract ${name}`);
}

test('collection form uses an appendable gallery field capped at six images', () => {
  assert.ok(collectionFormSource.includes('CollectionGalleryField'), 'Collection form should use the dynamic gallery field');
  assert.doesNotMatch(collectionFormSource, /Array\.from\(\{length:\s*6\}\)/, 'Collection gallery should not render a fixed six slots');

  assert.ok(galleryFieldSource.includes('const minCollectionGalleryImages = 1'), 'gallery UI should keep at least one row');
  assert.ok(galleryFieldSource.includes('const maxCollectionGalleryImages = 6'), 'gallery UI should cap rows at six');
  assert.ok(galleryFieldSource.includes('maxImages = maxCollectionGalleryImages'), 'default add control should stop at six rows');
  assert.ok(galleryFieldSource.includes('minImages = minCollectionGalleryImages'), 'default remove control should keep one row');
  assert.ok(galleryFieldSource.includes('rows.length < maxImages'), 'add control should use the configured max row count');
  assert.ok(galleryFieldSource.includes('rows.length > minImages'), 'remove control should use the configured min row count');
});

test('collection form exposes a separate editable detail image strip', () => {
  assert.ok(collectionFormSource.includes('gallery={specs.detailImages}'), 'detail strip images should come from collection specs');
  assert.ok(collectionFormSource.includes('namePrefix="detailGallery"'), 'detail image strip should use separate form field names');
  assert.ok(collectionFormSource.includes('maxImages={3}'), 'detail image strip should be capped to the three public strip slots');
});

test('collection image fields show ratio and size guidance', () => {
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.collectionCover'\)\}/);
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.collectionGallery'\)\}/);
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.collectionDetailGallery'\)\}/);
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.seo'\)\}/);
  assert.match(galleryFieldSource, /imageGuide\?: string/);
  assert.match(galleryFieldSource, /imageGuide=\{imageGuide\}/);
});

test('collection gallery save reads submitted rows and caps them at six images', () => {
  const readGallerySource = extractFunction(actionsSource, 'readGalleryImages');

  assert.ok(readGallerySource.includes('collectionGalleryIndexes(formData)'), 'gallery save should read the indexes submitted by the form');
  assert.ok(readGallerySource.includes('slice(0, maxCollectionGalleryImages)'), 'gallery save should cap submitted rows at six');
  assert.doesNotMatch(readGallerySource, /for \(let index = 0; index < 6/, 'gallery save should not be hard-coded to six fixed slots');
});

test('collection save stores detail strip images separately from the gallery', () => {
  const saveCollectionSource = extractFunction(actionsSource, 'saveCollectionAction');
  const readDetailSource = extractFunction(actionsSource, 'readDetailGalleryImages');

  assert.ok(saveCollectionSource.includes('detailImages: await readDetailGalleryImages(formData, editorPath)'), 'detail images should be saved inside collection specs');
  assert.ok(readDetailSource.includes('detailGallery'), 'detail image reader should read the detailGallery field group');
  assert.ok(readDetailSource.includes('maxCollectionDetailImages'), 'detail image reader should cap detail images separately from the main gallery');
});
