import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');

test('admin image uploads save only the storage filename in editable content fields', () => {
  const uploadReturns = source.match(/return media\.filename;/g) ?? [];

  assert.equal(uploadReturns.length, 2);
  assert.doesNotMatch(source, /return media\.url \|\| media\.filename;/);
});
