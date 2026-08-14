import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = (path) => JSON.parse(readText(path));

test('popup fallback config is structurally identical in both public locales', () => {
  const ko = readJson('../../messages/ko.json').sitePopup;
  const en = readJson('../../messages/en.json').sitePopup;
  const expected = {enabled: false, image: '', startsAt: '', endsAt: ''};

  assert.deepEqual(ko, expected);
  assert.deepEqual(en, expected);
});

test('popup is a managed site-wide page with a dedicated editor', () => {
  const catalog = readJson('../../lib/cms/page-catalog.json');
  const popup = catalog.find(({pageKey}) => pageKey === 'site-popup');

  assert.equal(popup.sourcePath, 'sitePopup');
  assert.deepEqual(popup.fields.map(({path}) => path), ['enabled', 'image', 'startsAt', 'endsAt']);

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

test('dedicated popup editor exposes one shared image and Seoul schedule', () => {
  const page = readText('./(dashboard)/popup/page.tsx');

  assert.ok(page.includes('action={saveSitePopupAction}'));
  assert.ok(page.includes('name="enabled"'));
  assert.ok(page.includes('name="image"'));
  assert.ok(page.includes('uploadName="imageUpload"'));
  assert.ok(page.includes('name="startsAt"'));
  assert.ok(page.includes('name="endsAt"'));
  assert.ok(page.includes('type="datetime-local"'));
  assert.ok(page.includes('sitePopupIsoToDateTimeInput'));
  assert.ok(page.includes('getMediaLibraryItems'));
});

test('popup save validates once and synchronizes both public locales', () => {
  const actions = readText('./actions.ts');
  const repositories = readText('../../lib/cms/repositories.ts');
  const cacheCore = readText('../../lib/cms/public-cache-core.mjs');

  assert.ok(actions.includes('export async function saveSitePopupAction'));
  assert.ok(actions.includes('validateSitePopupSubmission'));
  assert.ok(actions.includes('content: {ko: config, en: config}'));
  assert.ok(actions.includes('saveSharedPageImage(upload, returnTo, image)'));
  assert.ok(actions.includes("upsertPage('site-popup', payload)"));
  assert.ok(repositories.includes('revalidatePublicPageCache(pageKey)'));
  assert.match(cacheCore, /pageKey === 'common' \|\| pageKey === 'site-popup'/);
});
