import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const editorUrl = new URL('./_components/contact-faq-editor.tsx', import.meta.url);
const editorSource = existsSync(editorUrl) ? readFileSync(editorUrl, 'utf8') : '';
const pageSource = readFileSync(new URL('./(dashboard)/pages/[pageKey]/page.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');
const i18nSource = readFileSync(new URL('../../lib/admin-i18n.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('Contact uses one dedicated bilingual FAQ editor', () => {
  assert.equal(existsSync(editorUrl), true);
  assert.match(pageSource, /ContactFaqEditor/);
  assert.match(pageSource, /pairContactFaqEditorDrafts/);
  assert.match(pageSource, /pageKey === 'contact'/);
});

test('FAQ editor supports shared category and FAQ add, edit, reorder, and delete flows', () => {
  assert.match(editorSource, /name="contactFaq\.payload"/);
  assert.match(editorSource, /crypto\.randomUUID/);
  assert.match(editorSource, /addCategory/);
  assert.match(editorSource, /moveCategory/);
  assert.match(editorSource, /removeCategory/);
  assert.match(editorSource, /contactFaqCategoryUsage/);
  assert.match(editorSource, /window\.alert/);
  assert.match(editorSource, /addFaq/);
  assert.match(editorSource, /moveFaq/);
  assert.match(editorSource, /removeFaq/);
  assert.match(editorSource, /koLabel/);
  assert.match(editorSource, /enLabel/);
  assert.match(editorSource, /item\.ko\.question/);
  assert.match(editorSource, /item\.en\.question/);
  assert.match(editorSource, /<select/);
});

test('server action validates the bilingual payload and replaces only Contact FAQ leaves', () => {
  assert.match(actionsSource, /parseContactFaqEditorSubmission/);
  assert.match(actionsSource, /formData\.has\('contactFaq\.payload'\)/);
  assert.match(actionsSource, /const mainPath = `\$\{pageContentGroupsKey\}\.main`/);
  assert.match(actionsSource, /setObjectValueAtPath\(contentKo, `\$\{mainPath\}\.faqCategories`/);
  assert.match(actionsSource, /setObjectValueAtPath\(contentEn, `\$\{mainPath\}\.faqCategories`/);
  assert.match(actionsSource, /setObjectValueAtPath\(contentKo, `\$\{mainPath\}\.faqCategoryLabels`/);
  assert.match(actionsSource, /setObjectValueAtPath\(contentEn, `\$\{mainPath\}\.faqs`/);
});

test('generic Contact catalog does not duplicate the dedicated FAQ fields', () => {
  const contact = pageCatalog.find((page) => page.pageKey === 'contact');
  const faqPaths = new Set(['faqCategories', 'faqs']);

  assert.equal(contact.fields.some((field) => faqPaths.has(field.path)), false);
  assert.equal(contact.fields.some((field) => field.path.startsWith('faqCategoryLabels.') && field.path !== 'faqCategoryLabels.other'), false);
  assert.equal(contact.fields.some((field) => field.path === 'faqCategoryLabels.other'), true);
});

test('Contact FAQ editor labels exist in all three CMS interface languages', () => {
  for (const key of [
    'contactFaq.title',
    'contactFaq.hint',
    'contactFaq.categories',
    'contactFaq.addCategory',
    'contactFaq.categoryId',
    'contactFaq.categoryKo',
    'contactFaq.categoryEn',
    'contactFaq.categoryInUse',
    'contactFaq.minimumCategory',
    'contactFaq.faqs',
    'contactFaq.addFaq',
    'contactFaq.category',
    'contactFaq.koQuestion',
    'contactFaq.koAnswer',
    'contactFaq.enQuestion',
    'contactFaq.enAnswer',
    'contactFaq.moveUp',
    'contactFaq.moveDown',
    'contactFaq.delete',
    'contactFaq.confirmDeleteCategory',
    'contactFaq.confirmDeleteFaq',
    'contactFaq.expand',
    'contactFaq.collapse'
  ]) {
    assert.equal((i18nSource.match(new RegExp(`'${key.replace('.', '\\.')}'`, 'g')) ?? []).length, 3, `${key} should exist in zh/en/ko`);
  }
});
