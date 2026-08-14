import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const componentSource = readFileSync(new URL('./faq-structured-data.tsx', import.meta.url), 'utf8');
const coreSource = readFileSync(new URL('../../lib/faq-structured-data-core.mjs', import.meta.url), 'utf8');
const contactPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);
const contactFaqSectionSource = readFileSync(
  new URL('../contact/contact-faq-section.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));
const faqCore = await import('../../lib/faq-structured-data-core.mjs').catch(() => null);

test('faq structured data behavior keeps only complete trimmed entries', () => {
  assert.ok(faqCore, 'FAQ structured-data behavior core is missing.');
  const structuredData = faqCore.createFaqStructuredData([
    {question: '  배송 기간은? ', answer: ' 상담 후 안내합니다.  '},
    {question: '답변 없음', answer: '   '},
    {question: '', answer: '질문 없음'}
  ], 'https://daeho.works/ko/contact#faq');

  assert.deepEqual(structuredData, {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://daeho.works/ko/contact#faq',
    mainEntity: [{
      '@type': 'Question',
      name: '배송 기간은?',
      acceptedAnswer: {'@type': 'Answer', text: '상담 후 안내합니다.'}
    }]
  });
  assert.equal(
    faqCore.createFaqStructuredData([{question: ' ', answer: ' '}], 'https://daeho.works/ko/contact#faq'),
    null
  );
});

test('faq structured data behavior neutralizes a closing script sequence', () => {
  assert.ok(faqCore, 'FAQ structured-data behavior core is missing.');
  const structuredData = faqCore.createFaqStructuredData(
    [{question: '안전한가요?', answer: '</script><script>alert(1)</script>'}],
    'https://daeho.works/ko/contact#faq'
  );
  const json = faqCore.serializeStructuredData(structuredData);

  assert.doesNotMatch(json, /</);
  assert.match(json, /\\u003c\/script>/);
  assert.equal(JSON.parse(json).mainEntity[0].acceptedAnswer.text, '</script><script>alert(1)</script>');
});

test('faq structured data emits a schema.org FAQPage graph', () => {
  assert.match(coreSource, /'@type': 'FAQPage'/);
  assert.match(coreSource, /'@type': 'Question'/);
  assert.match(coreSource, /acceptedAnswer/);
  assert.match(coreSource, /'@type': 'Answer'/);
  assert.match(componentSource, /type="application\/ld\+json"/);
});

test('faq structured data escapes markup and anchors an absolute id', () => {
  // JSON-LD 안의 <가 스크립트 태그를 닫아버리지 않도록 이스케이프해야 한다.
  assert.ok(coreSource.includes(".replace(/</g, '\\\\u003c')"));
  assert.match(componentSource, /new URL\(`\$\{path\}#faq`, metadataBase\)/);
});

test('faq structured data skips entries the page does not render', () => {
  // 질문이나 답변이 비어 있으면 화면에 내용이 없으므로 마크업에서도 빼야 한다.
  assert.match(coreSource, /\.filter\(\(item\) => item\.question && item\.answer\)/);
  assert.match(coreSource, /if \(entries\.length === 0\) \{\s*return null;/);
});

test('contact page renders the faq structured data from the same source as the visible list', () => {
  assert.ok(
    contactPageSource.includes("import {FaqStructuredData} from '@/components/site/faq-structured-data';")
  );
  assert.ok(contactPageSource.includes('<FaqStructuredData faqs={text.faqs} path={`/${locale}/contact`} />'));
  // 화면 목록도 같은 text.faqs 를 쓰므로 CMS 수정이 양쪽에 함께 반영된다.
  assert.match(contactPageSource, /<ContactFaqSection[\s\S]*faqs=\{text\.faqs\}/);
  assert.match(contactFaqSectionSource, /groupContactFaqs\(faqs, categories, otherLabel\)/);
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
