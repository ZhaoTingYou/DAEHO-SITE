import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const proxySource = readFileSync(new URL('./proxy.ts', import.meta.url), 'utf8');
const localeLayoutSource = readFileSync(new URL('./app/[locale]/layout.tsx', import.meta.url), 'utf8');
const seoSource = readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');

test('root path permanently redirects to the Korean canonical home page', () => {
  assert.match(proxySource, /request\.nextUrl\.pathname === '\/'/);
  assert.match(proxySource, /new URL\('\/ko', request\.url\)/);
  assert.match(proxySource, /NextResponse\.redirect\([^,]+,\s*308\)/s);
});

test('hreflang x-default consistently points to Korean canonical pages', () => {
  assert.match(localeLayoutSource, /'x-default': '\/ko'/);
  assert.match(seoSource, /'x-default': withLocale\('ko', path\)/);
  assert.doesNotMatch(seoSource, /'x-default': path/);
  assert.doesNotMatch(localeLayoutSource, /'x-default': '\/'/);
});
