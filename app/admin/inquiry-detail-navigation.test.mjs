import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const inquiriesPage = readFileSync(
  new URL('./(dashboard)/inquiries/page.tsx', import.meta.url),
  'utf8'
);

test('inquiry Open controls use native navigation that Safari cannot leave in a stale client route', () => {
  assert.match(
    inquiriesPage,
    /<a\s+href=\{`\/admin\/inquiries\/\$\{item\.id\}`\}[\s\S]*?\{t\('common\.open'\)\}[\s\S]*?<\/a>/,
    'the Open control must use a native anchor instead of intercepted Next.js client navigation'
  );
});
