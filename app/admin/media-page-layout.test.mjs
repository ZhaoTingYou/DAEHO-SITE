import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./(dashboard)/media/page.tsx', import.meta.url), 'utf8');

test('media upload form keeps the upload button reachable on tablet-sized admin screens', () => {
  assert.doesNotMatch(source, /lg:grid-cols-\[1fr_1fr_1fr_1fr_auto\]/);
  assert.match(source, /md:grid-cols-2/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/);
  assert.match(source, /md:col-span-2 xl:col-span-1/);
  assert.match(source, /className="admin-on-dark min-h-10 w-full/);
});
