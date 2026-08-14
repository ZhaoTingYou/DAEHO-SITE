import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {migrateContactFaqContents} from './contact-faq-migration-core.mjs';
import * as migrationCore from './contact-faq-migration-core.mjs';

const koContact = readJson('../../messages/ko.json').contact;
const enContact = readJson('../../messages/en.json').contact;
const canonical = {ko: koContact, en: enContact};

test('parses the explicit two-entry English replacement migration mode', () => {
  assert.deepEqual(
    migrationCore.parseContactFaqMigrationArguments?.([
      '--apply',
      '--replace-incomplete-en'
    ]),
    {
      apply: true,
      migrationOptions: {replaceIncompleteEnglishCount: 2}
    }
  );
});

test('migrates twenty legacy CMS questions while preserving unrelated content and Korean answers', () => {
  const customKoreanAnswer = '운영 중 수정된 한국어 답변';
  const input = {
    ko: groupedContent(koContact.faqs.map((item, index) => ({
      question: item.question,
      answer: index === 0 ? customKoreanAnswer : item.answer
    })), {title: '기념을 영원한 상징으로'}),
    en: groupedContent(koContact.faqs.map(({question, answer}) => ({question, answer})), {
      title: 'Shape the meaning of victory'
    })
  };

  const result = migrateContactFaqContents(input, canonical);
  const koMain = result.content.ko.__groups.main;
  const enMain = result.content.en.__groups.main;

  assert.equal(result.changed, true);
  assert.deepEqual(result.matched, {ko: 20, en: 20});
  assert.equal(koMain.hero.title, '기념을 영원한 상징으로');
  assert.equal(enMain.hero.title, 'Shape the meaning of victory');
  assert.equal(koMain.faqs[0].answer, customKoreanAnswer);
  assert.equal(koMain.faqs[0].category, 'consultation');
  assert.equal(enMain.faqs[0].question, 'How does the custom production process work?');
  assert.doesNotMatch(enMain.faqs.map((item) => `${item.question}\n${item.answer}`).join('\n'), /[가-힣]/);
  assert.deepEqual(koMain.faqCategories, koContact.faqCategories);
  assert.deepEqual(enMain.faqCategories, enContact.faqCategories);
  assert.deepEqual(enMain.faqCategoryLabels, enContact.faqCategoryLabels);
});

test('is idempotent after categories and English translations have been applied', () => {
  const migrated = migrateContactFaqContents({
    ko: groupedContent(koContact.faqs),
    en: groupedContent(enContact.faqs)
  }, canonical);
  const repeated = migrateContactFaqContents(migrated.content, canonical);

  assert.equal(migrated.changed, true);
  assert.equal(repeated.changed, false);
  assert.deepEqual(repeated.content, migrated.content);
});

test('explicitly replaces two incomplete English FAQs with the canonical twenty', () => {
  const input = {
    ko: groupedContent(koContact.faqs),
    en: groupedContent([
      {
        question: 'How are timelines and minimum quantities set?',
        answer: 'Legacy English answer one.'
      },
      {
        question: 'What should I prepare for bespoke work?',
        answer: 'Legacy English answer two.'
      }
    ], {title: 'Keep the English hero'})
  };

  const result = migrateContactFaqContents(input, canonical, {
    replaceIncompleteEnglishCount: 2
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.matched, {ko: 20, en: 2});
  assert.equal(result.content.en.__groups.main.hero.title, 'Keep the English hero');
  assert.equal(result.content.en.__groups.main.faqs.length, 20);
  assert.equal(
    result.content.en.__groups.main.faqs[0].question,
    'How does the custom production process work?'
  );
  assert.doesNotMatch(
    result.content.en.__groups.main.faqs.map((item) => `${item.question}\n${item.answer}`).join('\n'),
    /[가-힣]/
  );
});

test('rejects an incomplete English replacement count other than the authorized two', () => {
  const input = {
    ko: groupedContent(koContact.faqs),
    en: groupedContent([
      {
        question: 'Only one legacy English question',
        answer: 'Only one legacy English answer'
      }
    ])
  };

  assert.throws(
    () => migrateContactFaqContents(input, canonical, {replaceIncompleteEnglishCount: 1}),
    /en FAQ migration requires exactly the known twenty unique questions/
  );
});

test('fails closed on unknown or duplicate questions without mutating the supplied CMS content', () => {
  const unknown = groupedContent(koContact.faqs.map((item, index) => (
    index === 19 ? {...item, question: '운영 중 새로 추가된 질문'} : item
  )));
  const input = {
    ko: unknown,
    en: groupedContent(koContact.faqs.map(({question, answer}) => ({question, answer})))
  };
  const before = structuredClone(input);

  assert.throws(
    () => migrateContactFaqContents(input, canonical),
    /ko FAQ migration requires exactly the known twenty unique questions/
  );
  assert.deepEqual(input, before);

  const duplicate = groupedContent(koContact.faqs.map((item, index) => (
    index === 19 ? koContact.faqs[0] : item
  )));
  assert.throws(
    () => migrateContactFaqContents({ko: duplicate, en: input.en}, canonical),
    /ko FAQ migration requires exactly the known twenty unique questions/
  );
});

test('supports the legacy flat Contact page shape as well as grouped CMS content', () => {
  const result = migrateContactFaqContents({
    ko: {hero: {title: 'KO'}, faqs: koContact.faqs.map(({question, answer}) => ({question, answer}))},
    en: {hero: {title: 'EN'}, faqs: koContact.faqs.map(({question, answer}) => ({question, answer}))}
  }, canonical);

  assert.equal(result.content.ko.hero.title, 'KO');
  assert.equal(result.content.en.hero.title, 'EN');
  assert.equal(result.content.ko.faqs.length, 20);
  assert.equal(result.content.en.faqs[19].category, 'business');
  assert.deepEqual(result.content.ko.faqCategories, koContact.faqCategories);
});

test('realigns locale FAQ order to the shared canonical structure', () => {
  const reversedKo = [...koContact.faqs].reverse();
  const reversedEn = [...enContact.faqs].reverse();
  const result = migrateContactFaqContents({
    ko: groupedContent(reversedKo),
    en: groupedContent(reversedEn)
  }, canonical);

  assert.equal(result.content.ko.__groups.main.faqs[0].question, koContact.faqs[0].question);
  assert.equal(result.content.en.__groups.main.faqs[0].question, enContact.faqs[0].question);
  assert.deepEqual(
    result.content.ko.__groups.main.faqCategories.map(({id}) => id),
    result.content.en.__groups.main.faqCategories.map(({id}) => id)
  );
});

function groupedContent(faqs, hero = {title: 'Keep me'}) {
  return {
    __groups: {
      main: {hero, faqTitle: 'FAQ', faqs},
      form: {submit: 'Keep the form'}
    }
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
