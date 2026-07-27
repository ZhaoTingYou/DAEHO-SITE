import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const editorUrl = new URL('./_components/content-locale-editor.tsx', import.meta.url);
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('CMS has one accessible persisted KO and EN content language controller', () => {
  assert.equal(existsSync(editorUrl), true, 'content locale editor should exist');

  const source = readFileSync(editorUrl, 'utf8');

  assert.match(source, /localStorage/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /contentLocaleForKey/);
  assert.match(source, /data-content-locale/);
});

test('localized form validation reveals and focuses an invalid hidden language field', () => {
  const source = readFileSync(editorUrl, 'utf8');

  assert.match(source, /noValidate/);
  assert.match(source, /checkValidity/);
  assert.match(source, /closest\('\[data-content-locale\]'\)/);
  assert.match(source, /setActiveLocale/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /reportValidity/);
});

test('every bilingual CMS editor uses the shared content language controller', () => {
  const pageEditor = read('./(dashboard)/pages/[pageKey]/page.tsx');
  const newsEditor = read('./_components/news-form.tsx');
  const collectionEditor = read('./_components/collection-form.tsx');
  const footerEditor = read('./(dashboard)/footer/page.tsx');
  const techniqueEditor = read('./_components/technique-records-editor.tsx');
  const externalSitesEditor = read('./_components/external-sites-editor.tsx');
  const mediaEditor = read('./(dashboard)/media/page.tsx');

  for (const [label, source] of [
    ['pages', pageEditor],
    ['news', newsEditor],
    ['collections', collectionEditor],
    ['footer', footerEditor]
  ]) {
    assert.match(source, /ContentLocaleForm/, `${label} should use the unified localized form`);
    assert.match(source, /ContentLocalePanel/, `${label} should hide inactive localized panels`);
  }

  assert.match(techniqueEditor, /ContentLocalePanel/);
  assert.match(externalSitesEditor, /ContentLocalePanel/);
  assert.match(mediaEditor, /ContentLocaleProvider/);
  assert.match(mediaEditor, /ContentLocaleSwitcher/);
  assert.match(mediaEditor, /ContentLocalePanel/);
});

test('content language labels exist in every CMS interface language', () => {
  const i18n = read('../../lib/admin-i18n.ts');

  for (const key of ['contentLocale.editorLabel', 'contentLocale.ko', 'contentLocale.en']) {
    assert.equal(
      (i18n.match(new RegExp(`'${key.replace('.', '\\.')}'`, 'g')) ?? []).length,
      3,
      `${key} should exist in Chinese, English, and Korean`
    );
  }
});
