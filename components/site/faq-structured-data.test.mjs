import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const componentSource = readFileSync(new URL('./faq-structured-data.tsx', import.meta.url), 'utf8');
const contactPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));

test('faq structured data emits a schema.org FAQPage graph', () => {
  assert.match(componentSource, /'@type': 'FAQPage'/);
  assert.match(componentSource, /'@type': 'Question'/);
  assert.match(componentSource, /acceptedAnswer/);
  assert.match(componentSource, /'@type': 'Answer'/);
  assert.match(componentSource, /type="application\/ld\+json"/);
});

test('faq structured data escapes markup and anchors an absolute id', () => {
  // JSON-LD 안의 <가 스크립트 태그를 닫아버리지 않도록 이스케이프해야 한다.
  assert.ok(componentSource.includes(".replace(/</g, '\\\\u003c')"));
  assert.match(componentSource, /new URL\(`\$\{path\}#faq`, metadataBase\)/);
});

test('faq structured data skips entries the page does not render', () => {
  // 질문이나 답변이 비어 있으면 화면에 내용이 없으므로 마크업에서도 빼야 한다.
  assert.match(componentSource, /\.filter\(\(item\) => item\.question && item\.answer\)/);
  assert.match(componentSource, /if \(entries\.length === 0\) \{\s*return null;/);
});

test('contact page renders the faq structured data from the same source as the visible list', () => {
  assert.ok(
    contactPageSource.includes("import {FaqStructuredData} from '@/components/site/faq-structured-data';")
  );
  assert.ok(contactPageSource.includes('<FaqStructuredData faqs={text.faqs} path={`/${locale}/contact`} />'));
  // 화면 목록도 같은 text.faqs 를 쓰므로 CMS 수정이 양쪽에 함께 반영된다.
  assert.match(contactPageSource, /\{text\.faqs\.map\(\(item\) => \(/);
});

test('contact faq messages keep the question and answer shape the markup expects', () => {
  for (const [label, messages] of [['한국어', koMessages], ['영어', enMessages]]) {
    const faqs = messages.contact.faqs;
    assert.ok(Array.isArray(faqs) && faqs.length > 0, `${label} FAQ 항목이 없습니다.`);
    for (const item of faqs) {
      assert.equal(typeof item.question, 'string', `${label} FAQ question 타입이 다릅니다.`);
      assert.equal(typeof item.answer, 'string', `${label} FAQ answer 타입이 다릅니다.`);
      assert.ok(item.question.trim() && item.answer.trim(), `${label} FAQ에 빈 항목이 있습니다.`);
    }
  }
});
