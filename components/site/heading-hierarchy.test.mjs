import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const contactPage = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);
const contactFaqSection = readFileSync(
  new URL('../contact/contact-faq-section.tsx', import.meta.url),
  'utf8'
);

test('contact page introduces the FAQ section with a heading, not a paragraph', () => {
  // h1 다음 단계가 없으면 헤딩 계층이 끊긴다. faqTitle 이 그 자리를 맡는다.
  assert.match(contactPage, /<ContactFaqSection[\s\S]*title=\{text\.faqTitle\}/);
  assert.match(contactFaqSection, /<h2[^>]*>[\s\S]*\{title\}[\s\S]*<\/h2>/);
  assert.doesNotMatch(contactPage, /<p[^>]*>\s*\{text\.faqTitle\}\s*<\/p>/);
});

test('contact page delegates exactly one h1 to SectionIntro', () => {
  assert.match(
    contactPage,
    /<SectionIntro[^>]*headingLevel="h1"[^>]*>/,
    '문의 페이지의 대표 SectionIntro가 h1을 렌더해야 합니다.'
  );
  assert.equal(
    (contactPage.match(/headingLevel="h1"/g) ?? []).length,
    1,
    '문의 페이지에는 h1을 요청하는 SectionIntro가 하나여야 합니다.'
  );
});

test('organization structured data receives official channels from CMS-backed footer data', () => {
  const structuredData = readFileSync(
    new URL('./site-structured-data.tsx', import.meta.url),
    'utf8'
  );
  const layout = readFileSync(new URL('../../app/[locale]/layout.tsx', import.meta.url), 'utf8');

  assert.match(layout, /getOrganizationSameAs\(messages\.common\.footer\)/);
  assert.match(layout, /<SiteStructuredData englishEnabled=\{englishEnabled\} sameAs=\{organizationSameAs\} \/>/);
  assert.match(structuredData, /sameAs\.length > 0 \? \{sameAs\} : \{\}/);
  assert.doesNotMatch(structuredData, /https:\/\/(?:blog\.naver|instagram|www\.youtube|www\.facebook|daehogold)/);
});
