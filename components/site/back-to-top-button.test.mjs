import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./back-to-top-button.tsx', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../../app/[locale]/(site)/layout.tsx', import.meta.url), 'utf8');

test('public site layout includes a localized back-to-top control', () => {
  assert.match(layoutSource, /import \{BackToTopButton\}/);
  assert.match(layoutSource, /<BackToTopButton label=\{locale === 'ko' \? '맨 위로' : 'Back to top'\} \/>/);
});

test('back-to-top control appears after scrolling and returns instantly', () => {
  assert.match(source, /window\.scrollY > Math\.max\(480, window\.innerHeight \* 0\.66\)/);
  assert.match(source, /window\.addEventListener\('scroll', updateVisibility, \{passive: true\}\)/);
  assert.match(source, /window\.scrollTo\(\{/);
  assert.match(source, /behavior: 'instant'/);
  assert.doesNotMatch(source, /behavior: 'smooth'/);
  assert.match(source, /tabIndex=\{isVisible \? 0 : -1\}/);
  assert.match(source, /aria-label=\{label\}/);
});
