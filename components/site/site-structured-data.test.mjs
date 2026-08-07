import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const structuredDataSource = readFileSync(new URL('./site-structured-data.tsx', import.meta.url), 'utf8');
const localeLayoutSource = readFileSync(new URL('../../app/[locale]/layout.tsx', import.meta.url), 'utf8');

test('site structured data declares preferred Google site name and organization identity', () => {
  assert.match(structuredDataSource, /'@type': 'WebSite'/);
  assert.match(structuredDataSource, /const siteName = '대호'/);
  assert.match(
    structuredDataSource,
    /const siteAlternateNames = \['DAEHO', '대호반지', '대호 우승반지', 'DAEHO championship rings'\]/
  );
  assert.match(structuredDataSource, /name: siteName/);
  assert.match(structuredDataSource, /alternateName: siteAlternateNames/);
  assert.match(structuredDataSource, /'@type': \['Organization', 'LocalBusiness', 'JewelryStore'\]/);
  assert.doesNotMatch(structuredDataSource, /주식회사 대호/);
  assert.match(structuredDataSource, /knowsAbout: \[/);
  assert.match(structuredDataSource, /'우승반지 제작'/);
  assert.match(structuredDataSource, /'대호 우승반지'/);
  assert.match(structuredDataSource, /'championship ring maker'/);
  assert.match(structuredDataSource, /telephone: '\+82-2-765-2737'/);
  assert.match(structuredDataSource, /postalCode: '03139'/);
  assert.ok(structuredDataSource.includes("logo: absoluteSiteUrl('/images/logo.png')"));
});

test('site structured data exposes service entities for high-intent search terms', () => {
  assert.match(structuredDataSource, /const serviceItems = \[/);
  assert.match(structuredDataSource, /name: '우승반지 제작'/);
  assert.match(structuredDataSource, /'Championship Ring Production'/);
  assert.match(structuredDataSource, /url: '\/ko\/mastery\/creations\/champion'/);
  assert.match(structuredDataSource, /'@type': 'Service'/);
  assert.match(structuredDataSource, /hasOfferCatalog/);
  assert.match(structuredDataSource, /makesOffer/);
});

test('site structured data covers every target keyword axis for daeho.works', () => {
  assert.match(structuredDataSource, /name: '맞춤 트로피 제작'/);
  assert.match(structuredDataSource, /name: '행사 기념품 제작'/);
  assert.match(structuredDataSource, /'챔피언십 반지'/);
  assert.match(structuredDataSource, /'스포츠 행사 기념품'/);
  assert.match(structuredDataSource, /'Custom Trophy Production'/);
  assert.match(structuredDataSource, /'Event Commemorative Goods'/);
});

test('site structured data keeps appointment ring terms reserved for daehogold.com', () => {
  // daehogold.com이 임관반지 전문 도메인이므로 daeho.works는 해당 신호를 노출하지 않는다.
  // 단체 기념반지 축으로만 표현해 두 도메인의 키워드 카니발라이제이션을 방지한다.
  assert.doesNotMatch(structuredDataSource, /임관반지/);
  assert.doesNotMatch(structuredDataSource, /Appointment Ring/);
  assert.match(structuredDataSource, /name: '단체 기념반지 제작'/);
});

test('localized public layout renders site structured data on every locale page', () => {
  assert.ok(localeLayoutSource.includes("import {SiteStructuredData} from '@/components/site/site-structured-data';"));
  assert.ok(localeLayoutSource.includes('<SiteStructuredData englishEnabled={englishEnabled} />'));
});

test('website structured data follows the CMS English visibility switch', () => {
  assert.match(structuredDataSource, /SiteStructuredData\(\{englishEnabled\}/);
  assert.match(structuredDataSource, /getPublicLocales\(locales, englishEnabled\)/);
  assert.doesNotMatch(structuredDataSource, /inLanguage: \['ko-KR', 'en-US'\]/);
});
