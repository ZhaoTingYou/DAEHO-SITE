import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  ContactFaqEditorValidationError,
  contactFaqCategoryUsage,
  moveContactFaqEditorItem,
  pairContactFaqEditorDrafts,
  parseContactFaqEditorSubmission
} from './contact-faq-editor-core.mjs';

const koContact = readJson('../../messages/ko.json').contact;
const enContact = readJson('../../messages/en.json').contact;

test('pairs legacy locale content into one aligned bilingual editor draft', () => {
  const draft = pairContactFaqEditorDrafts(koContact, {
    ...enContact,
    faqs: enContact.faqs.map((item) => ({...item, category: 'sports'}))
  });

  assert.deepEqual(draft.categories[0], {
    id: 'consultation',
    koLabel: '상담 · 견적',
    enLabel: 'Consultation · Quote'
  });
  assert.equal(draft.categories.length, 4);
  assert.equal(draft.faqs.length, 20);
  assert.equal(draft.faqs[0].category, 'consultation');
  assert.equal(draft.faqs[0].ko.question, koContact.faqs[0].question);
  assert.equal(draft.faqs[0].en.question, enContact.faqs[0].question);
});

test('pairs dynamic categories by shared Korean order and English category ID', () => {
  const draft = pairContactFaqEditorDrafts({
    faqCategories: [
      {id: 'vip-gifts', label: 'VIP 선물'},
      {id: 'consultation', label: '상담'}
    ],
    faqs: [{category: 'vip-gifts', question: '질문', answer: '답변'}]
  }, {
    faqCategories: [
      {id: 'consultation', label: 'Consultation'},
      {id: 'vip-gifts', label: 'VIP Gifts'}
    ],
    faqs: [{category: 'consultation', question: 'Question', answer: 'Answer'}]
  });

  assert.deepEqual(draft.categories, [
    {id: 'vip-gifts', koLabel: 'VIP 선물', enLabel: 'VIP Gifts'},
    {id: 'consultation', koLabel: '상담', enLabel: 'Consultation'}
  ]);
  assert.equal(draft.faqs[0].category, 'vip-gifts');
});

test('validates and normalizes one bilingual editor payload into aligned locale content', () => {
  const result = parseContactFaqEditorSubmission(JSON.stringify({
    categories: [
      {id: 'consultation', koLabel: ' 상담 · 견적 ', enLabel: ' Consultation · Quote '},
      {id: 'vip-gifts', koLabel: ' VIP 선물 ', enLabel: ' VIP Gifts '}
    ],
    faqs: [{
      category: 'vip-gifts',
      ko: {question: ' 질문 ', answer: ' 답변 '},
      en: {question: ' Question ', answer: ' Answer '}
    }]
  }));

  assert.deepEqual(result.ko.faqCategories, [
    {id: 'consultation', label: '상담 · 견적'},
    {id: 'vip-gifts', label: 'VIP 선물'}
  ]);
  assert.deepEqual(result.en.faqCategories, [
    {id: 'consultation', label: 'Consultation · Quote'},
    {id: 'vip-gifts', label: 'VIP Gifts'}
  ]);
  assert.deepEqual(result.ko.faqCategoryLabels, {
    consultation: '상담 · 견적',
    'vip-gifts': 'VIP 선물'
  });
  assert.deepEqual(result.en.faqs, [{
    category: 'vip-gifts',
    question: 'Question',
    answer: 'Answer'
  }]);
});

test('rejects malformed category and FAQ submissions with stable validation codes', () => {
  const valid = {
    categories: [{id: 'consultation', koLabel: '상담', enLabel: 'Consultation'}],
    faqs: [{
      category: 'consultation',
      ko: {question: '질문', answer: '답변'},
      en: {question: 'Question', answer: 'Answer'}
    }]
  };
  const cases = [
    ['INVALID_JSON', '{'],
    ['CATEGORIES_REQUIRED', {...valid, categories: []}],
    ['CATEGORY_ID_INVALID', {...valid, categories: [{...valid.categories[0], id: 'unsafe id'}]}],
    ['CATEGORY_ID_DUPLICATE', {...valid, categories: [...valid.categories, {...valid.categories[0]}]}],
    ['CATEGORY_LABEL_REQUIRED', {...valid, categories: [{...valid.categories[0], enLabel: ''}]}],
    ['FAQ_CATEGORY_INVALID', {...valid, faqs: [{...valid.faqs[0], category: 'missing'}]}],
    ['FAQ_COPY_REQUIRED', {...valid, faqs: [{...valid.faqs[0], ko: {question: '', answer: '답변'}}]}],
    ['FAQ_QUESTION_DUPLICATE', {...valid, faqs: [...valid.faqs, {...valid.faqs[0]}]}]
  ];

  for (const [code, input] of cases) {
    assert.throws(
      () => parseContactFaqEditorSubmission(typeof input === 'string' ? input : JSON.stringify(input)),
      (error) => error instanceof ContactFaqEditorValidationError && error.code === code,
      code
    );
  }
});

test('counts referenced categories and reorders immutable editor arrays', () => {
  const draft = {
    categories: [{id: 'a'}, {id: 'b'}],
    faqs: [{category: 'a'}, {category: 'b'}, {category: 'a'}]
  };

  assert.equal(contactFaqCategoryUsage(draft, 'a'), 2);
  assert.deepEqual(moveContactFaqEditorItem(draft.categories, 0, 1), [{id: 'b'}, {id: 'a'}]);
  assert.deepEqual(moveContactFaqEditorItem(draft.categories, 0, -1), draft.categories);
  assert.notEqual(moveContactFaqEditorItem(draft.categories, 0, -1), draft.categories);
});

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
