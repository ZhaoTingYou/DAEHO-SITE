import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./back-to-top-button.tsx', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../../app/[locale]/(site)/layout.tsx', import.meta.url), 'utf8');

test('public site layout includes a localized back-to-top control', () => {
  assert.match(layoutSource, /import \{SiteFloatingActions\}/);
  assert.match(layoutSource, /backToTopLabel=\{locale === 'ko' \? '맨 위로' : 'Back to top'\}/);
});

test('back-to-top control starts a controlled return on the first pointer press', () => {
  assert.match(source, /window\.scrollY > Math\.max\(480, window\.innerHeight \* 0\.66\)/);
  assert.match(source, /window\.addEventListener\('scroll', updateVisibility, \{passive: true\}\)/);
  assert.match(source, /scrollAnimationFrame\.current = requestAnimationFrame\(animate\)/);
  assert.match(source, /const easedProgress = 1 - Math\.pow\(1 - progress, 3\)/);
  assert.match(source, /window\.scrollTo\(0, Math\.round\(startY \* \(1 - easedProgress\)\)\)/);
  assert.match(source, /cancelAnimationFrame\(scrollAnimationFrame\.current\)/);
  assert.match(source, /onPointerDown=\{handlePointerDown\}/);
  assert.match(source, /onTouchStart=\{handleTouchStart\}/);
  assert.doesNotMatch(source, /preventDefault\(\)/);
  assert.match(source, /touch-none/);
  assert.match(source, /tabIndex=\{isVisible \? 0 : -1\}/);
  assert.match(source, /aria-label=\{label\}/);
});

test('back-to-top control keeps a click fallback without restarting a pointer-triggered scroll', () => {
  assert.match(source, /const handleClick = \(\) => \{/);
  assert.match(source, /Date\.now\(\) - lastPointerTriggerAt\.current > 500/);
  assert.match(source, /onClick=\{handleClick\}/);
  assert.match(source, /now - lastPointerTriggerAt\.current < 250/);
});
