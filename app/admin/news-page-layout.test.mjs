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
