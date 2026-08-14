import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const fontLinks = readFileSync(new URL('./font-links.tsx', import.meta.url), 'utf8');
const globalsCss = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
const vendorFontUrl = new URL('../../styles/vendor-fonts.css', import.meta.url);

test('font-face CSS is bundled locally instead of using external stylesheets', () => {
  assert.match(globalsCss, /@import "\.\.\/styles\/vendor-fonts\.css";/);
  assert.doesNotMatch(fontLinks, /rel="stylesheet"/);
  assert.doesNotMatch(fontLinks, /fonts\.googleapis\.com/);
  assert.doesNotMatch(fontLinks, /pretendard-dynamic-subset\.css/);
  assert.equal(existsSync(vendorFontUrl), true);
});

test('remaining font-file origins are preconnected', () => {
  assert.match(fontLinks, /https:\/\/fonts\.gstatic\.com/);
  assert.match(fontLinks, /https:\/\/cdn\.jsdelivr\.net/);
  assert.match(fontLinks, /https:\/\/hangeul\.pstatic\.net/);
});

test('local Pretendard uses the pinned variable subset with one face per Unicode range', () => {
  assert.equal(existsSync(vendorFontUrl), true);
  const css = readFileSync(vendorFontUrl, 'utf8');
  const faces = css.match(/@font-face\s*\{[^}]*font-family:\s*'Pretendard'[^}]*\}/g) ?? [];

  assert.equal(faces.length, 92);
  faces.forEach((face) => {
    assert.match(face, /font-weight:\s*45 920/);
    assert.match(face, /font-display:\s*swap/);
    assert.match(face, /unicode-range:/);
    assert.match(face, /pretendard@v1\.3\.9/);
  });
  assert.doesNotMatch(css, /Pretendard Variable/);
  assert.doesNotMatch(css, /\.\.\/\.\.\/\.\.\/packages/);
  assert.match(css, /font-family:\s*'Cormorant Garamond'/);
  assert.match(css, /font-family:\s*'Inter'/);
});
