import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function loadModule() {
  const sourcePath = path.join(repoRoot, 'lib/cms/admin-action-error.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}, URLSearchParams};

  vm.runInNewContext(compiled, sandbox, {filename: sourcePath});
  return sandbox.module.exports;
}

test('admin action errors preserve backend error and validation issue details', () => {
  const {getAdminActionErrorMessage} = loadModule();

  assert.equal(
    getAdminActionErrorMessage({
      payload: {
        error: 'Validation failed',
        issues: [
          {path: 'content.ko.title', message: 'Required'},
          {path: ['seo', 'ko', 'title'], message: 'Too long'}
        ]
      }
    }),
    'Validation failed: content.ko.title: Required; seo.ko.title: Too long'
  );

  assert.equal(
    getAdminActionErrorMessage({payload: {error: 'Media item not found'}}),
    'Media item not found'
  );

  assert.equal(getAdminActionErrorMessage(new Error('Network timeout')), 'Network timeout');
});

test('admin action error redirect params are readable and bounded', () => {
  const {
    appendAdminActionError,
    readAdminActionErrorMessage,
    adminActionErrorDetailParam,
    adminActionErrorParam
  } = loadModule();
  const url = appendAdminActionError('/admin/pages/home?tab=main', new Error('x'.repeat(500)));
  const query = Object.fromEntries(new URLSearchParams(url.split('?')[1]));

  assert.equal(url.startsWith('/admin/pages/home?'), true);
  assert.equal(query.tab, 'main');
  assert.equal(query[adminActionErrorParam], '1');
  assert.equal(query[adminActionErrorDetailParam].length <= 323, true);
  assert.equal(readAdminActionErrorMessage(query, 'fallback')?.startsWith('x'), true);
  assert.equal(readAdminActionErrorMessage({error: 'file'}, 'fallback'), 'fallback');
  assert.equal(readAdminActionErrorMessage({}, 'fallback'), null);
});

test('admin pages and server actions are wired to surface CMS action errors', () => {
  const actions = readFileSync(path.join(repoRoot, 'app/admin/actions.ts'), 'utf8');

  assert.match(actions, /appendAdminActionError/);
  assert.match(actions, /redirectWithAdminActionError/);
  assert.match(actions, /isRedirectError/);

  for (const pagePath of [
    'app/admin/(dashboard)/news/page.tsx',
    'app/admin/(dashboard)/news/[id]/page.tsx',
    'app/admin/(dashboard)/collections/page.tsx',
    'app/admin/(dashboard)/collections/[id]/page.tsx',
    'app/admin/(dashboard)/pages/[pageKey]/page.tsx',
    'app/admin/(dashboard)/media/page.tsx',
    'app/admin/(dashboard)/footer/page.tsx'
  ]) {
    const source = readFileSync(path.join(repoRoot, pagePath), 'utf8');
    assert.match(source, /AdminActionAlert/, `${pagePath} should render AdminActionAlert`);
  }
});
