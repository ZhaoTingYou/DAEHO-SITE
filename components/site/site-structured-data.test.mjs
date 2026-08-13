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
  assert.match(structuredDataSource, /'@type': \['Organization', 'LocalBusiness'\]/);
  assert.doesNotMatch(structuredDataSource, /주식회사 대호/);
  assert.match(structuredDataSource, /knowsAbout: \[/);
  assert.match(structuredDataSource, /'우승반지 제작'/);
  assert.match(structuredDataSource, /'임관반지 제작'/);
  assert.match(structuredDataSource, /'대호 우승반지'/);
  assert.match(structuredDataSource, /'championship ring maker'/);
});

test('site structured data covers every target keyword as an entity signal', () => {
  const targetKeywords = [
    '우승반지 제작',
    '커스텀 트로피',
    '기업 행사 기념품',
    '스포츠 시상식 용품',
    '커스텀 디자인 제작'
  ];

  for (const keyword of targetKeywords) {
    assert.ok(
      structuredDataSource.includes(`'${keyword}'`),
      `타깃 키워드 '${keyword}'가 구조화 데이터에 없습니다.`
    );
  }
});

test('structured data avoids jewelry positioning and legacy 맞춤 wording', () => {
  // 고객사 지침: '맞춤'은 '커스텀'으로 통일하고 주얼리 연관성은 노출하지 않는다.
  // 임관반지 엔티티의 기존 문구는 유지 대상이라 검사에서 제외한다.
  const appointmentEntity = /\{\s*id: 'appointment-rings',[\s\S]*?\},/.exec(structuredDataSource)?.[0] ?? '';
  const auditedSource = structuredDataSource.replace(appointmentEntity, '');

  assert.doesNotMatch(auditedSource, /맞춤/);
  assert.doesNotMatch(auditedSource, /주얼리/);
  assert.doesNotMatch(auditedSource, /[Jj]ewelry/);
});

test('appointment ring entity stays intact while its site-wide priority drops', () => {
  // 임관반지는 daehogold.com의 주력 키워드라 우선순위만 낮추고 엔티티는 유지한다.
  // /ko/mastery/creations/appointment 페이지가 실재하므로 삭제하면 마크업이 실제와 어긋난다.
  assert.match(structuredDataSource, /id: 'appointment-rings'/);
  assert.match(structuredDataSource, /url: '\/ko\/mastery\/creations\/appointment'/);
  assert.doesNotMatch(structuredDataSource, /const organizationDescription =\s*'[^']*임관반지/);
  assert.match(structuredDataSource, /telephone: '\+82-2-765-2737'/);
  assert.match(structuredDataSource, /postalCode: '03139'/);
  assert.ok(structuredDataSource.includes("logo: absoluteSiteUrl('/images/logo.png')"));
});

test('site structured data exposes service entities for high-intent search terms', () => {
  assert.match(structuredDataSource, /const serviceItems = \[/);
  assert.match(structuredDataSource, /name: '우승반지 제작'/);
  assert.match(structuredDataSource, /'Championship Ring Production'/);
  assert.match(structuredDataSource, /url: '\/ko\/mastery\/creations\/champion'/);
  assert.match(structuredDataSource, /id: 'sports-award-goods'/);
  assert.match(structuredDataSource, /name: '스포츠 시상식 용품 제작'/);
  const championshipEntity = /\{\s*id: 'championship-rings',[\s\S]*?\n  \},/.exec(structuredDataSource)?.[0] ?? '';
  assert.doesNotMatch(championshipEntity, /'스포츠 시상식 용품'/);
  assert.match(structuredDataSource, /'@type': 'Service'/);
  assert.match(structuredDataSource, /hasOfferCatalog/);
  assert.match(structuredDataSource, /makesOffer/);
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
