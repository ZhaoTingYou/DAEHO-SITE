import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./home-stat-band.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

test('Home stat descriptions keep the approved readable responsive rhythm', () => {
  assert.match(source, /grid-cols-1[\s\S]*sm:grid-cols-2[\s\S]*xl:grid-cols-5/);
  assert.doesNotMatch(source, /lg:grid-cols-5/);
  assert.match(source, /xl:px-6/);
  assert.match(source, /home-stat-band__body[^`\n]*max-w-\[220px\][^`\n]*xl:w-\[190px\]/);
  assert.match(source, /text-\[16px\][^`\n]*leading-\[1\.55\][^`\n]*sm:min-h-\[75px\]/);
  assert.match(source, /const bodyWhitespaceClass = isKorean \? 'whitespace-pre-line' : 'whitespace-normal'/);
  assert.match(source, /const bodyLocaleClass = isKorean \? '' : 'home-stat-band__body--en'/);
  assert.match(
    globalStyles,
    /\.home-stat-band__body--en\s*\{[\s\S]*?font-family:\s*var\(--font-body\);[\s\S]*?letter-spacing:\s*-0\.025em;[\s\S]*?\}/
  );
  assert.doesNotMatch(source, /md:text-\[13px\]|md:text-\[15px\]/);
});

test('Home stat labels reserve a shared row before aligned descriptions', () => {
  assert.match(source, /grid justify-items-center content-start/);
  assert.match(source, /home-stat-band__label[^"\n]*sm:min-h-\[33px\]/);
  assert.match(source, /usePrefersReducedMotion/);
  assert.match(source, /text-\[clamp\(42px,4vw,68px\)\]/);
});
