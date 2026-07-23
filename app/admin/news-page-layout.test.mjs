import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./(dashboard)/news/page.tsx', import.meta.url), 'utf8');

test('admin news list shows a cover thumbnail for each news row', () => {
  assert.match(source, /import \{imageSrc\} from '@\/lib\/image-src'/);
  assert.match(source, /const previewSrc = imageSrc\(item\.imagePath\)/);
  assert.match(source, /className="news-thumbnail/);
  assert.match(source, /role=\{previewSrc \? 'img' : undefined\}/);
  assert.doesNotMatch(source, /<td className="px-4 py-4 font-numeric text-xs text-\[#647084\]">\{item\.imagePath\}<\/td>/);
});

test('admin news list truncates long labels without widening neighboring columns', () => {
  assert.match(source, /min-w-\[1316px\] table-fixed/);
  assert.match(source, /<colgroup>/);
  assert.match(source, /className="truncate font-semibold text-\[#101827\]"/);
  assert.match(source, /className="min-w-0 flex-1 truncate font-numeric text-xs/);
  assert.match(source, /title=\{item\.imagePath \|\| undefined\}/);
  assert.match(source, /className="whitespace-nowrap px-4 py-4 font-numeric/);
  assert.doesNotMatch(source, /max-w-\[280px\] break-all/);
});
