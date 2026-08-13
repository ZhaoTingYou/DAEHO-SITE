import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const contactPage = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);

test('contact page introduces the FAQ section with a heading, not a paragraph', () => {
  // h1 다음 단계가 없으면 헤딩 계층이 끊긴다. faqTitle 이 그 자리를 맡는다.
  assert.match(contactPage, /<h2[^>]*>\s*\{text\.faqTitle\}\s*<\/h2>/);
  assert.doesNotMatch(contactPage, /<p[^>]*>\s*\{text\.faqTitle\}\s*<\/p>/);
});

test('every public page keeps exactly one h1', () => {
  for (const [label, source] of [['문의', contactPage]]) {
    const h1Count = (source.match(/<h1[\s>]/g) ?? []).length;
    assert.ok(h1Count <= 1, `${label} 페이지에 h1 이 ${h1Count}개 있습니다.`);
  }
});

test('organization structured data links the official channels that exist in the footer', () => {
  // 흩어진 공식 채널을 한 사업체로 묶는 신호다. 실제 운영 중인 링크만 넣는다.
  const structuredData = readFileSync(
    new URL('./site-structured-data.tsx', import.meta.url),
    'utf8'
  );
  assert.match(structuredData, /sameAs: \[/);
  for (const url of [
    'https://blog.naver.com/daehovriano',
    'https://instagram.com/dhofficial_1988',
    'https://www.youtube.com/@dhofficial1988',
    'https://daehogold.com/'
  ]) {
    assert.ok(structuredData.includes(`'${url}'`), `sameAs 에 ${url} 이 없습니다.`);
  }
  // 링크가 비어 있던 계정을 넣으면 실제와 어긋난다.
  assert.doesNotMatch(structuredData, /sameAs: \[[^\]]*'https:\/\/twitter\.com\/'/);
});
