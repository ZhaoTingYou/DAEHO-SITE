import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./use-location-search.ts', import.meta.url), 'utf8');

test('location search subscription reacts to history push and replace navigation', () => {
  assert.match(source, /history\.pushState = notifyAfterHistoryChange/);
  assert.match(source, /history\.replaceState = notifyAfterHistoryChange/);
  assert.match(source, /window\.addEventListener\('popstate'/);
  assert.match(source, /listeners\.forEach/);
});
