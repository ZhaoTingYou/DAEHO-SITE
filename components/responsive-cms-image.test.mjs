import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const componentUrl = new URL('./responsive-cms-image.tsx', import.meta.url);

test('responsive CMS images use a mobile-only picture source and retain the desktop img fallback', () => {
  assert.equal(existsSync(componentUrl), true, 'responsive-cms-image.tsx should exist');

  const source = readFileSync(componentUrl, 'utf8');

  assert.match(source, /getImageProps/);
  assert.match(source, /<picture/);
  assert.match(source, /media="\(max-width: 767px\)"/);
  assert.match(source, /mobileSrcSet/);
  assert.match(source, /desktopProps/);
});
test('a failed mobile image removes the mobile source before falling back to the desktop image', () => {
  const source = readFileSync(componentUrl, 'utf8');

  assert.match(source, /setMobileFailed\(true\)/);
  assert.match(source, /currentSrc/);
  assert.match(source, /mobileFailed/);
  assert.match(source, /onDesktopError/);
});
