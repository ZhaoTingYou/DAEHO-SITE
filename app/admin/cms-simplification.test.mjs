import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const pageEditorSource = readFileSync(
  new URL('./(dashboard)/pages/[pageKey]/page.tsx', import.meta.url),
  'utf8'
);
const footerEditorSource = readFileSync(
  new URL('./(dashboard)/footer/page.tsx', import.meta.url),
  'utf8'
);
const pageCatalog = JSON.parse(
  readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8')
);

test('page CMS keeps routing metadata hidden instead of exposing duplicate inputs', () => {
  assert.doesNotMatch(pageEditorSource, /<TextField label=\{t\('common\.section'\)\}/);
  assert.doesNotMatch(pageEditorSource, /<TextField label=\{t\('common\.sortOrder'\)\}/);
  assert.match(pageEditorSource, /<input type="hidden" name="section" value=\{page\.section\}/);
  assert.match(pageEditorSource, /<input type="hidden" name="sortOrder" value=\{page\.sortOrder\}/);
});

test('News page CMS removes retired fields while recording them for persisted-content pruning', () => {
  const news = pageCatalog.find((page) => page.pageKey === 'news');
  const activePaths = new Set(news.fields.map((field) => `${field.groupKey}.${field.path}`));
  const retiredPaths = new Set(news.retiredFields.map((field) => `${field.groupKey}.${field.path}`));
  const retired = [
    'main.masthead.body',
    'main.featured.body',
    'newsUi.detail.author',
    'newsUi.detail.ogImagePath',
    'newsUi.detail.lead',
    'newsUi.detail.paragraphs',
    'newsUi.detail.quote',
    'newsUi.detail.tags',
    'newsUi.detail.ctaTitle',
    'newsUi.detail.ctaHref',
    'newsUi.detail.related'
  ];

  for (const path of retired) {
    assert.equal(activePaths.has(path), false, `${path} should not remain editable`);
    assert.equal(retiredPaths.has(path), true, `${path} should be pruned on save`);
  }
});

test('footer CMS renders only one save and cancel action group', () => {
  assert.equal(footerEditorSource.match(/<SubmitButton>\{t\('footer\.save'\)\}<\/SubmitButton>/g)?.length, 1);
  assert.equal(footerEditorSource.match(/\{t\('common\.cancel'\)\}/g)?.length, 1);
});
