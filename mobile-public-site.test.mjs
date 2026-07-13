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
  assert.match(header, /h-16/);
  assert.match(header, /overflow-y-auto/);
  assert.match(footer, /mobile-site-footer/);
});
