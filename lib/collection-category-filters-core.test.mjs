import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const sourcePath = new URL('./collection-category-filters-core.ts', import.meta.url);

function loadCore() {
  assert.equal(
    existsSync(sourcePath),
    true,
    'the collection category fallback helper should exist'
  );
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}};

  vm.runInNewContext(compiled, sandbox, {filename: sourcePath.pathname});
  return sandbox.module.exports;
}

const staticFilters = [
  {id: 'champion', label: '우승반지', image: 'c1.png'},
  {id: 'appointment', label: '임관반지', image: 'c2.png'},
  {id: 'bespoke', label: '주문제작', image: 'c3.png'}
];

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('empty CMS category filters preserve the complete static selection page', () => {
  const {preserveCollectionCategoryFilters} = loadCore();
  const result = preserveCollectionCategoryFilters([], staticFilters);

  assert.deepEqual(plain(result), staticFilters);
  assert.notStrictEqual(result, staticFilters);
  assert.notStrictEqual(result[0], staticFilters[0]);
});

test('partial CMS category filters keep all fixed categories in their original order', () => {
  const {preserveCollectionCategoryFilters} = loadCore();
  const result = preserveCollectionCategoryFilters(
    [{id: 'champion', label: 'CMS 우승반지'}],
    staticFilters
  );

  assert.deepEqual(
    plain(result),
    [
      {id: 'champion', label: 'CMS 우승반지', image: 'c1.png'},
      {id: 'appointment', label: '임관반지', image: 'c2.png'},
      {id: 'bespoke', label: '주문제작', image: 'c3.png'}
    ]
  );
});
