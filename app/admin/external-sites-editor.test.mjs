import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

function readText(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

test('both fallback locales contain aligned disabled defaults', () => {
  const ko = readJson('../../messages/ko.json').common.footer.externalSites.items;
  const en = readJson('../../messages/en.json').common.footer.externalSites.items;
  assert.deepEqual(ko.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.deepEqual(en.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.ok([...ko, ...en].every((item) => item.href === '' && item.enabled === false));
});

test('common page save synchronizes the dedicated external-sites payload', () => {
  const actions = readText('./actions.ts');
  assert.match(actions, /formData\.has\('externalSites\.payload'\)/);
  assert.match(actions, /parseExternalSitesSubmission/);
  assert.match(actions, /pageContentGroupsKey/);
  assert.match(
    actions,
    /const externalSitesPath = `\$\{pageContentGroupsKey\}\.main\.footer\.externalSites\.items`/
  );
  assert.match(actions, /setObjectValueAtPath\(contentKo, externalSitesPath, externalSites\.ko\)/);
  assert.match(actions, /setObjectValueAtPath\(contentEn, externalSitesPath, externalSites\.en\)/);
});
