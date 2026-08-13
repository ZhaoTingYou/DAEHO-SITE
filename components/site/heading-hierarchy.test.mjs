import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const contactPage = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);
const collectionGallery = readFileSync(
  new URL('../specialty/specialty-collection-gallery.tsx', import.meta.url),
  'utf8'
);

test('contact page introduces the FAQ section with a heading, not a paragraph', () => {
  // h1 다음 단계가 없으면 헤딩 계층이 끊긴다. faqTitle 이 그 자리를 맡는다.
  assert.match(contactPage, /<h2[^>]*>\s*\{text\.faqTitle\}\s*<\/h2>/);
  assert.doesNotMatch(contactPage, /<p[^>]*>\s*\{text\.faqTitle\}\s*<\/p>/);
});

test('collection cards use h2 so category pages do not skip a heading level', () => {
  // champion 카테고리는 h1(카테고리명) 다음이 바로 이 카드라 h2 여야 한다.
  // bespoke 그리드(BespokeCreationCard)는 위에 별도 h2 가 있어 h3 가 맞으므로 건드리지 않는다.
  const start = collectionGallery.indexOf('function CollectionProductGrid(');
  assert.ok(start > -1, 'CollectionProductGrid 를 찾지 못했습니다.');
  const next = collectionGallery.indexOf('\nfunction ', start + 1);
  const productGrid = collectionGallery.slice(start, next > -1 ? next : undefined);
  assert.match(productGrid, /<h2[^>]*>\s*\{item\.title\}\s*<\/h2>/);
  assert.doesNotMatch(productGrid, /<h3[^>]*>\s*\{item\.title\}\s*<\/h3>/);
});

test('every public page keeps exactly one h1', () => {
  for (const [label, source] of [['문의', contactPage]]) {
    const h1Count = (source.match(/<h1[\s>]/g) ?? []).length;
    assert.ok(h1Count <= 1, `${label} 페이지에 h1 이 ${h1Count}개 있습니다.`);
  }
});
