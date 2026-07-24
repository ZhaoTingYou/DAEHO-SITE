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

  assert.ok(shell.includes("{href: '/admin/popup', labelKey: 'nav.popup'}"));
  assert.ok(messages.includes("'nav.popup'"));
});
