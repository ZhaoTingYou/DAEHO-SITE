import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const sourcePath = new URL('./achievement-first-records-core.ts', import.meta.url);

function loadFirstRecordsNormalizer() {
  assert.equal(existsSync(sourcePath), true, 'the locale-boundary FIRST RECORDS core helper should exist');
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
  return sandbox.module.exports.normalizeAchievementFirstRecordsFallback;
}

const staticFirstRecords = [
  {frontTitle: '국내 최초 이니셜 조각 적용', image: 'legacy_achievement_01.png'},
  {frontTitle: '국내 최초 엔티크 블랙 코팅 적용', image: 'legacy_achievement_02.png'},
  {frontTitle: '국내 최초 반지 내부 디자인 적용', image: 'legacy_achievement_03.png'},
  {frontTitle: '국내 최초 기록 04', image: 'legacy_achievement_04.png'}
];

function createMessages(firstRecords) {
  return {
    legacyPages: {
      achievement: {
        copy: {firstRecords}
      }
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('empty or non-array FIRST RECORDS use a cloned exact static locale fallback', () => {
  const normalize = loadFirstRecordsNormalizer();

  for (const configuredRecords of [[], undefined, null, {}]) {
    const messages = createMessages(configuredRecords);
    const staticMessages = createMessages(staticFirstRecords);
    const result = normalize(messages, staticMessages);
    const resolvedRecords = result.legacyPages.achievement.copy.firstRecords;

    assert.strictEqual(result, messages);
    assert.deepEqual(plain(resolvedRecords), staticFirstRecords);
    assert.notStrictEqual(resolvedRecords, staticFirstRecords);
    assert.notStrictEqual(resolvedRecords[0], staticFirstRecords[0]);
  }
});

test('FIRST RECORDS with only missing or whitespace images use the exact static locale fallback', () => {
  const normalize = loadFirstRecordsNormalizer();
  const messages = createMessages([
    {frontTitle: 'Blank', image: ''},
    {frontTitle: 'Whitespace', image: '   '},
    {frontTitle: 'Missing'},
    null
  ]);

  normalize(messages, createMessages(staticFirstRecords));

  assert.deepEqual(plain(messages.legacyPages.achievement.copy.firstRecords), staticFirstRecords);
});

test('FIRST RECORDS with one valid configured image remain unpadded', () => {
  const normalize = loadFirstRecordsNormalizer();
  const configuredRecords = [{frontTitle: 'CMS record', image: '  cms-record.png  '}];
  const messages = createMessages(configuredRecords);

  normalize(messages, createMessages(staticFirstRecords));

  assert.strictEqual(messages.legacyPages.achievement.copy.firstRecords, configuredRecords);
  assert.equal(messages.legacyPages.achievement.copy.firstRecords.length, 1);
});
