import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./(dashboard)/collections/page.tsx', import.meta.url), 'utf8');

test('Collection admin list truncates long titles, slugs, and image URLs inside fixed columns', () => {
  assert.match(source, /min-w-\[1336px\] table-fixed/);
  assert.match(source, /<colgroup>/);
  assert.match(source, /className="truncate font-semibold text-\[#101827\]"/);
  assert.match(source, /className="mt-1 truncate font-numeric text-xs/);
  assert.match(source, /className="min-w-0 flex-1 truncate font-numeric text-xs/);
  assert.match(source, /title=\{item\.imagePath \|\| undefined\}/);
  assert.doesNotMatch(source, /max-w-\[220px\] break-all/);
});
