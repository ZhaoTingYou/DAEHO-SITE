import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const headerSource = readFileSync(new URL('./site-header.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

test('desktop header language and contact controls use compact visual spacing', () => {
  assert.match(headerSource, /justify-end gap-2 font-body/);
  assert.match(headerSource, /items-center gap-1"/);
  assert.match(headerSource, /site-header-language-link/);
  assert.match(globalStyles, /\.site-header-language-link\s*{\s*min-width:\s*26px;/);
  assert.match(globalStyles, /\.site-header-language-link/);
});
