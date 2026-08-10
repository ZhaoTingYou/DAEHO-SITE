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

test('sitemap does not publish demo Creation detail URLs when the CMS is empty', () => {
  assert.equal(
    sitemapSource.includes('koMessages.specialtyPages.collection.gallery.items'),
    false
  );
});

test('sitemap uses one-hour full-route caching and only caches successful CMS results', () => {
  assert.match(sitemapSource, /export const revalidate = 3600/);
  assert.doesNotMatch(sitemapSource, /force-dynamic/);
  assert.match(sitemapSource, /if \(!isProductionBuildPhase\(\)\) \{\s+throw error/);
  assert.match(sitemapSource, /const getCachedSitemap = unstable_cache/);
  assert.match(sitemapSource, /revalidate: publicCmsCacheSeconds/);
  assert.doesNotMatch(sitemapSource, /Serving an uncached fallback sitemap/);
});
