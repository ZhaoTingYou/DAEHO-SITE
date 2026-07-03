import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./credibility-compliance-page.tsx', import.meta.url), 'utf8');

test('credibility standard rows keep the copy-to-image distance at half of the previous spacing', () => {
  assert.match(
    source,
    /<div className="max-w-\[734px\]">/,
    'standard row copy width should reduce the visible copy-to-image gap from 152px to 76px'
  );
});
