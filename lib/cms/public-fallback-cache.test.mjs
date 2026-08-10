import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const localeMessages = readFileSync(new URL('../locale-messages.ts', import.meta.url), 'utf8');
const publicContent = readFileSync(new URL('./public-content.ts', import.meta.url), 'utf8');
const seo = readFileSync(new URL('../seo.ts', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../../app/sitemap.ts', import.meta.url), 'utf8');

test('rendered CMS errors and not-found responses cannot become successful ISR fallbacks', () => {
  for (const source of [localeMessages, publicContent, seo]) {
    assert.match(source, /isStaticCmsPreviewEnabled/);
    assert.match(source, /if \(!isStaticCmsPreviewEnabled\(\)\) \{\s+throw/);
  }

  assert.match(localeMessages, /Public CMS page \$\{pageKey\} was not found/);
  assert.match(publicContent, /Public CMS news item \$\{slug\} was not found/);
  assert.match(seo, /Public CMS SEO page \$\{cmsPageKey\} was not found/);
  assert.match(sitemap, /catch \(error\) \{\s+noStore\(\);/);
});
