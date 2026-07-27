import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('./chronicle-year-window.ts', import.meta.url);
const horizontalSource = readFileSync(new URL('./chronicle-horizontal.tsx', import.meta.url), 'utf8');
const globalsSource = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
let getChronicleChromeVisibility;
let getChronicleYearReelLayout;

if (existsSync(sourceUrl)) {
  const source = readFileSync(sourceUrl, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  ({getChronicleChromeVisibility, getChronicleYearReelLayout} = await import(moduleUrl));
}

test('exposes the Archive centered year-reel calculation', () => {
  assert.equal(typeof getChronicleYearReelLayout, 'function');
});

test('keeps the selected year in the middle of a seven-row reel', () => {
  if (!getChronicleYearReelLayout) return;

  assert.deepEqual(getChronicleYearReelLayout(14, 0), {
    activeIndex: 0,
    centerRow: 3,
    visibleRows: 7
  });
  assert.deepEqual(getChronicleYearReelLayout(14, 7), {
    activeIndex: 7,
    centerRow: 3,
    visibleRows: 7
  });
  assert.deepEqual(getChronicleYearReelLayout(14, 13), {
    activeIndex: 13,
    centerRow: 3,
    visibleRows: 7
  });
});

test('clamps an active index outside the timeline', () => {
  if (!getChronicleYearReelLayout) return;

  assert.equal(getChronicleYearReelLayout(14, -8).activeIndex, 0);
  assert.equal(getChronicleYearReelLayout(14, 99).activeIndex, 13);
});

test('normalizes a requested row count to an odd positive value', () => {
  if (!getChronicleYearReelLayout) return;

  assert.deepEqual(getChronicleYearReelLayout(14, 7, 6), {
    activeIndex: 7,
    centerRow: 2,
    visibleRows: 5
  });
  assert.deepEqual(getChronicleYearReelLayout(14, 7, 0), {
    activeIndex: 7,
    centerRow: 0,
    visibleRows: 1
  });
});

test('uses a stable layout for an empty timeline', () => {
  if (!getChronicleYearReelLayout) return;

  assert.deepEqual(getChronicleYearReelLayout(0, 8), {
    activeIndex: 0,
    centerRow: 3,
    visibleRows: 7
  });
});

test('desktop Archive renders one complete year reel with adjacent controls', () => {
  assert.match(
    horizontalSource,
    /getChronicleYearReelLayout\(yearStops\.length, activeIndex\)/
  );
  assert.match(horizontalSource, /yearStops\.map\(\(stop\) =>/);
  assert.doesNotMatch(horizontalSource, /yearStops\.slice\(start, end\)/);
  assert.match(horizontalSource, /'--chronicle-active-index': yearReel\.activeIndex/);
  assert.match(horizontalSource, /'--chronicle-center-row': yearReel\.centerRow/);
  assert.match(
    horizontalSource,
    /'--chronicle-reel-offset': `\$\{\(yearReel\.centerRow - yearReel\.activeIndex\) \* 44\}px`/
  );
  assert.match(horizontalSource, /scrollToChronicleYear\(activeIndex - 1\)/);
  assert.match(horizontalSource, /disabled=\{activeIndex <= 0\}/);
  assert.match(horizontalSource, /scrollToChronicleYear\(activeIndex \+ 1\)/);
  assert.match(horizontalSource, /disabled=\{activeIndex >= yearStops\.length - 1\}/);
  assert.match(horizontalSource, /aria-current=\{activeIndex === stop\.index \? 'step' : undefined\}/);
});

test('desktop Archive keeps one indicator fixed while the year reel moves', () => {
  assert.match(
    globalsSource,
    /\.chronicle-year-nav__window::before\s*\{[\s\S]*?top: 50%;[\s\S]*?background: var\(--chronicle-day-accent\)/
  );
  assert.match(
    globalsSource,
    /\.chronicle-year-nav__list\s*\{[\s\S]*?grid-auto-rows: 44px;[\s\S]*?transform: translate3d\(0, var\(--chronicle-reel-offset\), 0\)/
  );
  assert.doesNotMatch(globalsSource, /\.chronicle-year-nav__year::before/);
  assert.match(
    globalsSource,
    /\.chronicle-year-nav__year\.is-active\s*\{[\s\S]*?color: var\(--chronicle-day-accent\)/
  );
  assert.match(globalsSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.chronicle-year-nav__list\s*\{[\s\S]*?transition: none/);
  assert.match(globalsSource, /\.chronicle-year-nav__step:disabled/);
});

test('keeps the year navigation visible when the Archive end navigation appears', () => {
  assert.equal(typeof getChronicleChromeVisibility, 'function');

  if (!getChronicleChromeVisibility) return;

  assert.deepEqual(getChronicleChromeVisibility(true, 0.95), {
    endNavVisible: true,
    yearNavVisible: true
  });
  assert.deepEqual(getChronicleChromeVisibility(false, 0.95), {
    endNavVisible: false,
    yearNavVisible: false
  });
  const endStateYearNavRules =
    globalsSource.match(/\.chronicle-page\.is-end-nav-visible \.chronicle-year-nav\s*\{[\s\S]*?\}/g) ?? [];

  for (const rule of endStateYearNavRules) {
    assert.doesNotMatch(
      rule,
      /(?:opacity\s*:\s*0|visibility\s*:\s*hidden|pointer-events\s*:\s*none)/,
      'the end navigation must not hide or disable the year selector'
    );
  }
});
