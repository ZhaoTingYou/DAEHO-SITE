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

test('collection form no longer exposes the retired detail image strip', () => {
  assert.equal(collectionFormSource.includes('gallery={specs.detailImages}'), false);
  assert.equal(collectionFormSource.includes('namePrefix="detailGallery"'), false);
  assert.equal(collectionFormSource.includes('form.detailGallery'), false);
});

test('collection image fields show ratio and size guidance', () => {
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.collectionCover'\)\}/);
  assert.match(collectionFormSource, /imageGuide=\{t\('imageGuide\.collectionGallery'\)\}/);
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

test('collection save no longer reads or stores retired detail strip images', () => {
  const saveCollectionSource = extractFunction(actionsSource, 'saveCollectionAction');

  assert.equal(saveCollectionSource.includes('detailImages'), false);
  assert.equal(actionsSource.includes('readDetailGalleryImages'), false);
  assert.equal(actionsSource.includes('collectionDetailGalleryIndexes'), false);
  assert.equal(actionsSource.includes('maxCollectionDetailImages'), false);
});
