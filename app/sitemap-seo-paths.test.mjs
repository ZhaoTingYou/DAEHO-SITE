import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const sitemapSource = readFileSync(new URL('./sitemap.ts', import.meta.url), 'utf8');

test('sitemap includes SEO-focused collection category pages', () => {
  assert.match(sitemapSource, /'\/mastery\/creations\/champion'/);
  assert.match(sitemapSource, /'\/mastery\/creations\/appointment'/);
  assert.match(sitemapSource, /'\/mastery\/creations\/bespoke'/);
});
