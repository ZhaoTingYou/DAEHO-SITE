import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const structuredDataSource = readFileSync(new URL('./site-structured-data.tsx', import.meta.url), 'utf8');
const localeLayoutSource = readFileSync(new URL('../../app/[locale]/layout.tsx', import.meta.url), 'utf8');

test('site structured data declares preferred Google site name and organization identity', () => {
  assert.match(structuredDataSource, /'@type': 'WebSite'/);
  assert.match(structuredDataSource, /const siteName = '주식회사 대호'/);
  assert.match(structuredDataSource, /const siteAlternateNames = \['DAEHO', '대호', '대호반지', '\(주\)대호 브리아노'\]/);
  assert.match(structuredDataSource, /name: siteName/);
  assert.match(structuredDataSource, /alternateName: siteAlternateNames/);
  assert.match(structuredDataSource, /'@type': 'Organization'/);
  assert.match(structuredDataSource, /legalName: '\(주\)대호 브리아노'/);
  assert.match(structuredDataSource, /telephone: '\+82-2-765-2737'/);
  assert.match(structuredDataSource, /postalCode: '03139'/);
  assert.ok(structuredDataSource.includes("logo: absoluteSiteUrl('/images/logo.png')"));
});

test('localized public layout renders site structured data on every locale page', () => {
  assert.ok(localeLayoutSource.includes("import {SiteStructuredData} from '@/components/site/site-structured-data';"));
  assert.ok(localeLayoutSource.includes('<SiteStructuredData />'));
});
