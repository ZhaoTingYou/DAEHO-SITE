import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTACT_FAQ_CATEGORY_ORDER,
  groupContactFaqs,
  normalizeContactFaqCategories,
  resolveContactFaqCategory
} from './contact-faq-core.mjs';

const labels = {
  consultation: 'Consultation · Quote',
  design: 'Design · Materials',
  business: 'Business · Organizations',
  sports: 'Sports · Merchandise',
  other: 'Other'
};

const defaultCategories = CONTACT_FAQ_CATEGORY_ORDER.map((id) => ({id, label: labels[id]}));

test('groups FAQ items in the CMS category order without changing item order', () => {
  const items = [
    {category: 'sports', question: 'Sports one', answer: 'A'},
    {category: 'consultation', question: 'Consultation one', answer: 'B'},
    {category: 'design', question: 'Design one', answer: 'C'},
    {category: 'sports', question: 'Sports two', answer: 'D'},
    {category: 'business', question: 'Business one', answer: 'E'}
  ];

  const groups = groupContactFaqs(items, defaultCategories, labels.other);

  assert.deepEqual(CONTACT_FAQ_CATEGORY_ORDER, ['consultation', 'design', 'business', 'sports']);
  assert.deepEqual(groups.map((group) => group.id), ['consultation', 'design', 'business', 'sports']);
  assert.deepEqual(groups.map((group) => group.label), [
    'Consultation · Quote',
    'Design · Materials',
    'Business · Organizations',
    'Sports · Merchandise'
  ]);
  assert.deepEqual(groups[3].items.map((item) => item.question), ['Sports one', 'Sports two']);
});

test('supports newly created CMS categories and keeps unknown references visible in Other', () => {
  const categories = [
    {id: 'consultation', label: 'Consultation'},
    {id: 'vip-gifts', label: 'VIP Gifts'}
  ];
  const groups = groupContactFaqs([
    {category: 'vip-gifts', question: 'VIP?', answer: 'Yes'},
    {category: 'missing', question: 'Unknown?', answer: 'Still visible'}
  ], categories, 'Other');

  assert.deepEqual(groups.map(({id, label}) => ({id, label})), [
    {id: 'vip-gifts', label: 'VIP Gifts'},
    {id: 'other', label: 'Other'}
  ]);
  assert.equal(groups[1].items[0].question, 'Unknown?');
});

test('normalizes dynamic category definitions and synthesizes the four legacy categories', () => {
  assert.deepEqual(normalizeContactFaqCategories(undefined, labels), defaultCategories);
  assert.deepEqual(normalizeContactFaqCategories([
    {id: 'vip-gifts', label: ' VIP Gifts '},
    {id: 'vip-gifts', label: 'Duplicate'},
    {id: 'unsafe id', label: 'Unsafe'},
    {id: 'blank-label', label: '   '}
  ], labels), [
    {id: 'vip-gifts', label: 'VIP Gifts'}
  ]);
});

test('classifies legacy Korean and English questions that do not yet have category fields', () => {
  assert.equal(resolveContactFaqCategory({
    question: '주문제작 비용은 어떻게 결정되나요?',
    answer: ''
  }), 'consultation');
  assert.equal(resolveContactFaqCategory({
    question: 'Can I review a design or proof before production?',
    answer: ''
  }), 'design');
  assert.equal(resolveContactFaqCategory({
    question: 'Can companies or organizations place bulk orders?',
    answer: ''
  }), 'business');
  assert.equal(resolveContactFaqCategory({
    question: 'Can championship rings be developed as products for fan sales?',
    answer: ''
  }), 'sports');
});

test('keeps unrecognized CMS questions in a visible Other chapter instead of dropping them', () => {
  const groups = groupContactFaqs([
    {category: 'unknown', question: 'A newly added question', answer: 'Still visible'}
  ], defaultCategories, labels.other);

  assert.equal(resolveContactFaqCategory({question: 'A newly added question', answer: ''}), 'other');
  assert.deepEqual(groups, [{
    id: 'other',
    label: 'Other',
    items: [{category: 'unknown', question: 'A newly added question', answer: 'Still visible'}]
  }]);
});

test('does not silently reclassify an explicitly invalid category from legacy question text', () => {
  assert.equal(resolveContactFaqCategory({
    category: 'removed-category',
    question: '주문제작 비용은 어떻게 결정되나요?',
    answer: ''
  }, new Set(CONTACT_FAQ_CATEGORY_ORDER)), 'other');
});
