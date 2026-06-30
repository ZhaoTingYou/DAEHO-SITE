import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');

test('admin direct image uploads store remote object URLs when the backend returns them', () => {
  const uploadReturns = source.match(/return mediaImageFieldValue\(media\);/g) ?? [];

  assert.equal(uploadReturns.length, 2);
  assert.match(source, /function mediaImageFieldValue\(media: \{filename: string; url\?: string\}\)/);
  assert.match(source, /\^https\?:\\\/\\\//);
  assert.match(source, /return \/\^https\?:\\\/\\\/\//);
});
