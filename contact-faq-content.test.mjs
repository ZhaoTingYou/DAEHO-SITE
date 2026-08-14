import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const koMessages = readJson('./messages/ko.json');
const enMessages = readJson('./messages/en.json');
const pageCatalog = readJson('./lib/cms/page-catalog.json');
const expectedCounts = {consultation: 5, design: 6, business: 6, sports: 3};

test('Korean and English Contact copy expose twenty complete categorized FAQ items', () => {
  for (const [locale, messages] of [['ko', koMessages], ['en', enMessages]]) {
    const faqs = messages.contact.faqs;
    const counts = Object.fromEntries(Object.keys(expectedCounts).map((category) => [
      category,
      faqs.filter((item) => item.category === category).length
    ]));

    assert.equal(faqs.length, 20, `${locale} must contain all twenty FAQ items`);
    assert.equal(new Set(faqs.map((item) => item.question)).size, 20, `${locale} questions must stay unique`);
    assert.deepEqual(counts, expectedCounts);
    assert.equal(faqs.every((item) => item.question.trim() && item.answer.trim()), true);
  }
});

test('English Contact FAQs are translated and preserve production facts and licensing limits', () => {
  const englishCopy = enMessages.contact.faqs
    .flatMap((item) => [item.question, item.answer])
    .join('\n');

  assert.doesNotMatch(englishCopy, /[가-힣]/);
  assert.match(englishCopy, /approximately three weeks/i);
  assert.match(englishCopy, /up to three months/i);
  assert.match(englishCopy, /licensing agreement/i);
  assert.match(englishCopy, /gold and silver/i);
});

test('Contact FAQ category labels are localized for the public section and CMS fallback', () => {
  assert.deepEqual(koMessages.contact.faqCategories, [
    {id: 'consultation', label: '상담 · 견적'},
    {id: 'design', label: '디자인 · 소재'},
    {id: 'business', label: '기업 · 단체'},
    {id: 'sports', label: '스포츠 · MD'}
  ]);
  assert.deepEqual(enMessages.contact.faqCategories, [
    {id: 'consultation', label: 'Consultation · Quote'},
    {id: 'design', label: 'Design · Materials'},
    {id: 'business', label: 'Business · Organizations'},
    {id: 'sports', label: 'Sports · Merchandise'}
  ]);
  assert.deepEqual(koMessages.contact.faqCategoryLabels, {
    consultation: '상담 · 견적',
    design: '디자인 · 소재',
    business: '기업 · 단체',
    sports: '스포츠 · MD',
    other: '기타'
  });
  assert.deepEqual(enMessages.contact.faqCategoryLabels, {
    consultation: 'Consultation · Quote',
    design: 'Design · Materials',
    business: 'Business · Organizations',
    sports: 'Sports · Merchandise',
    other: 'Other'
  });
});

test('Contact CMS delegates category and FAQ content to the dedicated bilingual editor', () => {
  const contactPage = pageCatalog.find((page) => page.pageKey === 'contact');
  const paths = contactPage.fields.map((field) => field.path);

  assert.equal(paths.includes('faqs'), false);
  assert.equal(paths.includes('faqCategories'), false);
  assert.equal(paths.includes('faqCategoryLabels.other'), true);
  assert.equal(paths.some((path) => path.startsWith('faqCategoryLabels.') && path !== 'faqCategoryLabels.other'), false);
});

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
