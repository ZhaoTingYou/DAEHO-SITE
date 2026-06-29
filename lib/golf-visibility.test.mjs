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

function loadGolfVisibility() {
  const sourcePath = path.join(repoRoot, 'lib/golf-visibility-core.ts');
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

test('golf visibility defaults to hidden and is enabled only by the CMS feature flag', () => {
  const {isGolfEnabled} = loadGolfVisibility();

  assert.equal(isGolfEnabled({}), false);
  assert.equal(isGolfEnabled({common: {features: {golfEnabled: false}}}), false);
  assert.equal(isGolfEnabled({common: {features: {golfEnabled: true}}}), true);
  assert.equal(isGolfEnabled({content: {__groups: {main: {features: {golfEnabled: true}}}}}), true);
  assert.equal(isGolfEnabled({content: {__groups: {main: {features: {golfEnabled: false}}}}}), false);
  assert.equal(readJson('messages/ko.json').common.features.golfEnabled, false);
  assert.equal(readJson('messages/en.json').common.features.golfEnabled, false);
});

test('CMS exposes the golf access switch on the common/footer settings page', () => {
  const pageCatalog = readJson('lib/cms/page-catalog.json');
  const commonPage = pageCatalog.find((page) => page.pageKey === 'common');
  const footerEditor = readText('app/admin/(dashboard)/footer/page.tsx');

  const golfField = commonPage.fields.find((field) => field.path === 'features.golfEnabled');

  assert.equal(golfField?.groupKey, 'main');
  assert.match(footerEditor, /features\.golfEnabled/);
  assert.match(footerEditor, /CheckboxField/);
});

test('public entry points hide golf unless the CMS flag is enabled', () => {
  const header = readText('components/site/site-header.tsx');
  const footer = readText('components/site/site-footer.tsx');
  const sitemap = readText('app/sitemap.ts');

  assert.match(header, /golfEnabled/);
  assert.match(header, /visibleNavItems/);
  assert.match(header, /item\.id !== 'golf'/);
  assert.match(footer, /golfEnabled/);
  assert.match(footer, /golfEnabled \?/);
  assert.match(sitemap, /isGolfEnabledForSite/);
  assert.doesNotMatch(sitemap, /'\/golf',\n\s*'\/golf\/inquiry'/);
});

test('golf pages and inquiry API are blocked when golf access is disabled', () => {
  const golfPage = readText('app/[locale]/(site)/golf/page.tsx');
  const golfInquiryPage = readText('app/[locale]/(site)/golf/inquiry/page.tsx');
  const golfApi = readText('app/api/inquiries/golf/route.ts');
  const proxy = readText('proxy.ts');

  assert.match(golfPage, /notFound\(\)/);
  assert.match(golfPage, /isGolfEnabled/);
  assert.match(golfInquiryPage, /notFound\(\)/);
  assert.match(golfInquiryPage, /isGolfEnabled/);
  assert.match(golfApi, /isGolfEnabledForSite/);
  assert.match(golfApi, /status:\s*404/);
  assert.match(proxy, /isGolfRequestPath/);
  assert.match(proxy, /CMS_BACKEND_URL/);
  assert.match(proxy, /'ko', 'en'/);
  assert.match(proxy, /status:\s*404/);
});
