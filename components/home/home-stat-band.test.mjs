import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./home-stat-band.tsx', import.meta.url), 'utf8');

test('Home stat descriptions keep the approved readable responsive rhythm', () => {
  assert.match(source, /grid-cols-1[\s\S]*sm:grid-cols-2[\s\S]*lg:grid-cols-5/);
  assert.match(source, /lg:px-6/);
  assert.match(
    source,
    /home-stat-band__body[^"\n]*max-w-\[220px\][^"\n]*text-\[16px\][^"\n]*leading-\[1\.55\][^"\n]*sm:min-h-\[75px\]/
  );
  assert.doesNotMatch(source, /md:text-\[13px\]|md:text-\[15px\]/);
});

test('Home stat labels reserve a shared row before aligned descriptions', () => {
  assert.match(source, /home-stat-band__label[^"\n]*sm:min-h-\[33px\]/);
  assert.match(source, /usePrefersReducedMotion/);
  assert.match(source, /text-\[clamp\(42px,4vw,68px\)\]/);
});
