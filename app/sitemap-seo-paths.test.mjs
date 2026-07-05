import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const sitemapSource = readFileSync(new URL('./sitemap.ts', import.meta.url), 'utf8');

test('sitemap includes SEO-focused collection category pages', () => {
  assert.match(sitemapSource, /'\/mastery\/creations\/champion'/);
  assert.match(sitemapSource, /'\/mastery\/creations\/appointment'/);
  assert.match(sitemapSource, /'\/mastery\/creations\/bespoke'/);
});

test('sitemap declares localized alternates and priority for core SEO pages', () => {
  assert.match(sitemapSource, /alternates: \{/);
  assert.match(sitemapSource, /'x-default': localizedAbsoluteUrl\('ko', path\)/);
  assert.match(sitemapSource, /'\/mastery\/creations\/champion': 0\.95/);
  assert.match(sitemapSource, /'\/mastery\/making': 0\.9/);
  assert.match(sitemapSource, /'\/contact': 0\.88/);
});
