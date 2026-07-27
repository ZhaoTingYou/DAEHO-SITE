import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';

const contentLocaleModule = new URL(
  '../../lib/admin-content-locale-core.mjs',
  import.meta.url
);

test('CMS content editor restores and navigates the persisted Korean and English locale choice', async () => {
  assert.equal(
    existsSync(contentLocaleModule),
    true,
    'the shared CMS content-language controller must be present'
  );

  const {contentLocaleForKey, normalizeAdminContentLocale} = await import(contentLocaleModule);

  assert.equal(normalizeAdminContentLocale('en'), 'en');
  assert.equal(normalizeAdminContentLocale('zh'), 'ko');
  assert.equal(contentLocaleForKey('ko', 'ArrowRight'), 'en');
  assert.equal(contentLocaleForKey('en', 'ArrowLeft'), 'ko');
});
