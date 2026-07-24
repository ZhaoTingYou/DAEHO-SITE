import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function loadEnglishVisibility() {
  const sourcePath = path.join(repoRoot, 'lib/english-visibility-core.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}};

  vm.runInNewContext(compiled, sandbox, {filename: sourcePath});
  return sandbox.module.exports;
}

test('English visibility defaults to disabled and follows the CMS feature flag', () => {
  const {isEnglishEnabled} = loadEnglishVisibility();

  assert.equal(isEnglishEnabled({}), false);
  assert.equal(isEnglishEnabled({common: {features: {englishEnabled: false}}}), false);
  assert.equal(isEnglishEnabled({common: {features: {englishEnabled: true}}}), true);
  assert.equal(
    isEnglishEnabled({content: {__groups: {main: {features: {englishEnabled: true}}}}}),
    true
  );
  assert.equal(
    isEnglishEnabled({content: {__groups: {main: {features: {englishEnabled: false}}}}}),
    false
  );
});

test('CMS exposes an English website switch that is disabled by default', () => {
  const pageCatalog = readJson('lib/cms/page-catalog.json');
  const commonPage = pageCatalog.find((page) => page.pageKey === 'common');
  const footerEditor = readText('app/admin/(dashboard)/footer/page.tsx');
  const genericPageEditor = readText('app/admin/(dashboard)/pages/[pageKey]/page.tsx');
  const actions = readText('app/admin/actions.ts');
  const englishField = commonPage.fields.find(
    (field) => field.path === 'features.englishEnabled'
  );

  assert.equal(englishField?.groupKey, 'main');
  assert.equal(readJson('messages/ko.json').common.features.englishEnabled, false);
  assert.equal(readJson('messages/en.json').common.features.englishEnabled, false);
  assert.match(footerEditor, /name="englishEnabled\.present"/);
  assert.match(footerEditor, /name="englishEnabled"/);
  assert.match(footerEditor, /CheckboxField/);
  assert.doesNotMatch(
    footerEditor,
    /paths:\s*\[[^\]]*'features\.englishEnabled'/s
  );
  assert.match(actions, /formData\.has\('englishEnabled\.present'\)/);
  assert.match(actions, /features\.englishEnabled/);
  assert.match(actions, /setObjectValueAtPath\(contentKo, englishEnabledPath, englishEnabled\)/);
  assert.match(actions, /setObjectValueAtPath\(contentEn, englishEnabledPath, englishEnabled\)/);
  assert.match(genericPageEditor, /pageKey === 'common'/);
  assert.match(genericPageEditor, /redirect\('\/admin\/footer'\)/);
});

test('disabled English exposes only Korean and preserves the path when falling back', () => {
  const {
    getPublicLocales,
    getKoreanFallbackPath
  } = loadEnglishVisibility();

  const availableLocales = ['ko', 'en'];

  assert.deepEqual(Array.from(getPublicLocales(availableLocales, false)), ['ko']);
  assert.deepEqual(Array.from(getPublicLocales(availableLocales, true)), ['ko', 'en']);
  assert.equal(getKoreanFallbackPath('/en'), '/ko');
  assert.equal(getKoreanFallbackPath('/en/mastery/technique'), '/ko/mastery/technique');
  assert.equal(getKoreanFallbackPath('/ko/news'), '/ko/news');
});

test('public navigation, routes, metadata, and sitemap all follow the English switch', () => {
  const siteLayout = readText('app/[locale]/(site)/layout.tsx');
  const localeLayout = readText('app/[locale]/layout.tsx');
  const header = readText('components/site/site-header.tsx');
  const footer = readText('components/site/site-footer.tsx');
  const proxy = readText('proxy.ts');
  const sitemap = readText('app/sitemap.ts');

  assert.match(siteLayout, /isEnglishEnabledForSite/);
  assert.match(siteLayout, /englishEnabled=\{englishEnabled\}/);
  assert.match(header, /englishEnabled/);
  assert.match(header, /getPublicLocales\(locales, englishEnabled\)/);
  assert.match(footer, /englishEnabled/);
  assert.match(footer, /getPublicLocales\(locales, englishEnabled\)/);
  assert.match(proxy, /isEnglishRequestPath/);
  assert.match(proxy, /getKoreanFallbackPath/);
  assert.match(proxy, /isEnglishEnabledForProxy/);
  assert.doesNotMatch(proxy, /DAEHO_ENGLISH_ENABLED/);
  assert.match(localeLayout, /isEnglishEnabledForSite/);
  assert.match(sitemap, /getPublicLocales\(locales, englishEnabled\)/);
  assert.doesNotMatch(sitemap, /routing\.locales\.map/);
});
