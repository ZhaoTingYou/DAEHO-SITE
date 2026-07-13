import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const globals = readFileSync(new URL('./app/globals.css', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('./styles/mobile.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('./components/site/site-header.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('./components/site/site-footer.tsx', import.meta.url), 'utf8');

test('public mobile pages share fixed typography and spacing tokens', () => {
  assert.match(globals, /@import "\.\.\/styles\/mobile\.css"/);
  assert.match(mobile, /--mobile-page-gutter: 20px/);
  assert.match(mobile, /--mobile-section-space: 80px/);
  assert.match(mobile, /--mobile-header-height: 64px/);
  assert.match(mobile, /\.mobile-display[\s\S]+font-size: 44px/);
  assert.match(mobile, /\.mobile-copy[\s\S]+font-size: 16px/);
  assert.doesNotMatch(mobile, /font-size:[^;]*(vw|dvw)/);
});

test('public mobile shell uses a compact safe-area header and scrollable menu', () => {
  assert.match(header, /mobile-site-header/);
  assert.match(header, /mobile-menu-panel/);
  assert.match(header, /h-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\)\]/);
  assert.match(header, /top-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\)\]/);
  assert.match(header, /overflow-y-auto/);
  assert.match(footer, /mobile-site-footer/);
  assert.match(footer, /pt-16 pb-0 md:py-\[clamp\(56px,7vw,96px\)\]/);
  assert.doesNotMatch(footer, /px-container pt-16 pb-12/);
  assert.match(mobile, /\.mobile-site-footer \{[\s\S]*padding-bottom: calc\(32px \+ env\(safe-area-inset-bottom\)\);/);
  assert.doesNotMatch(mobile, /\.mobile-site-footer \{[\s\S]*padding-top:/);
});
