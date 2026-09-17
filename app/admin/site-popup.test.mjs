import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = (path) => JSON.parse(readText(path));

test('popup fallback config is structurally identical in both public locales', () => {
  const ko = readJson('../../messages/ko.json').sitePopup;
  const en = readJson('../../messages/en.json').sitePopup;
  const expected = {items: []};

  assert.deepEqual(ko, expected);
  assert.deepEqual(en, expected);
});

test('popup is a managed site-wide page with a dedicated editor', () => {
  const catalog = readJson('../../lib/cms/page-catalog.json');
  const popup = catalog.find(({pageKey}) => pageKey === 'site-popup');

  assert.equal(popup.sourcePath, 'sitePopup');
  assert.deepEqual(popup.fields, []);

  const genericEditor = readText('./(dashboard)/pages/[pageKey]/page.tsx');
  assert.ok(genericEditor.includes("pageKey === 'site-popup'"));
  assert.ok(genericEditor.includes("redirect('/admin/popup')"));
});

test('desktop and mobile admin navigation expose popup settings', () => {
  const shell = readText('./_components/admin-shell.tsx');
  const messages = readText('../../lib/admin-i18n.ts');

  assert.ok(shell.includes("{href: '/admin/popup', labelKey: 'nav.popup', capability: 'content:read'}"));
  assert.ok(messages.includes("'nav.popup'"));
});

test('dedicated popup editor exposes a repeatable announcement collection', () => {
  const page = readText('./(dashboard)/popup/page.tsx');
  const editor = readText('./_components/site-popup-editor.tsx');

  assert.ok(page.includes('action={saveSitePopupAction}'));
  assert.ok(page.includes('<SitePopupEditor'));
  assert.ok(editor.includes('name="popupId"'));
  assert.ok(editor.includes('name={`enabled.${item.id}`}'));
  assert.ok(editor.includes('name={`image.${item.id}`}'));
  assert.ok(editor.includes('uploadName={`imageUpload.${item.id}`}'));
  assert.ok(editor.includes('name={`startsAt.${item.id}`}'));
  assert.ok(editor.includes('name={`endsAt.${item.id}`}'));
  assert.ok(editor.includes('setItems'));
  assert.ok(page.includes('getMediaLibraryItems'));
});

test('popup save validates once and synchronizes both public locales', () => {
  const actions = readText('./actions.ts');
  const repositories = readText('../../lib/cms/repositories.ts');
  const cacheCore = readText('../../lib/cms/public-cache-core.mjs');

  assert.ok(actions.includes('export async function saveSitePopupAction'));
  assert.ok(actions.includes('validateSitePopupSubmission'));
  assert.ok(actions.includes("formData.getAll('popupId')"));
  assert.ok(actions.includes('const config = {items}'));
  assert.ok(actions.includes('content: {ko: config, en: config}'));
  assert.ok(actions.includes('saveSharedPageImage(submission.upload, returnTo, image)'));
  assert.ok(actions.includes("upsertPage('site-popup', payload)"));
  assert.ok(repositories.includes('revalidatePublicPageCache(pageKey)'));
  assert.match(cacheCore, /pageKey === 'common' \|\| pageKey === 'site-popup'/);
});
