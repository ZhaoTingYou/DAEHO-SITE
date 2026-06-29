import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./image-src.ts', import.meta.url), 'utf8');

test('imageSrc renders CMS image filenames through the public images route', () => {
  assert.match(source, /trimmed\.startsWith\('\/uploads\/'\)/);
  assert.match(source, /trimmed\.startsWith\('uploads\/'\)/);
  assert.doesNotMatch(source, /return `\/\$\{trimmed\}`/);
});
