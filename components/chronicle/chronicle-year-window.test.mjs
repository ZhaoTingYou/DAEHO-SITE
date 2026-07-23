import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('./chronicle-year-window.ts', import.meta.url);
const horizontalSource = readFileSync(new URL('./chronicle-horizontal.tsx', import.meta.url), 'utf8');
const globalsSource = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
let getChronicleYearWindow;

if (existsSync(sourceUrl)) {
  const source = readFileSync(sourceUrl, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  ({getChronicleYearWindow} = await import(moduleUrl));
}

test('exposes the Archive year-window calculation', () => {
  assert.equal(typeof getChronicleYearWindow, 'function');
});

test('shows every year when the timeline is shorter than the window', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(4, 2), {start: 0, end: 4});
});

test('keeps a full seven-year window at the beginning', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(14, 0), {start: 0, end: 7});
});

test('centers the active year when surrounding years exist', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(14, 7), {start: 4, end: 11});
});

test('keeps a full seven-year window at the end', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(14, 13), {start: 7, end: 14});
});

test('clamps an active index outside the timeline', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(14, -8), {start: 0, end: 7});
  assert.deepEqual(getChronicleYearWindow(14, 99), {start: 7, end: 14});
});

test('normalizes an even window size to the next smaller odd size', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(14, 7, 6), {start: 5, end: 10});
});

test('returns an empty range when the timeline is empty', () => {
  if (!getChronicleYearWindow) return;
  assert.deepEqual(getChronicleYearWindow(0, 0), {start: 0, end: 0});
});

test('desktop Archive renders the calculated year slice with adjacent controls', () => {
  assert.match(horizontalSource, /getChronicleYearWindow\(yearStops\.length, activeIndex\)/);
  assert.match(horizontalSource, /yearStops\.slice\(start, end\)/);
  assert.match(horizontalSource, /chronicle-year-nav__step chronicle-year-nav__step--previous/);
  assert.match(horizontalSource, /scrollToChronicleYear\(activeIndex - 1\)/);
  assert.match(horizontalSource, /disabled=\{activeIndex <= 0\}/);
  assert.match(horizontalSource, /chronicle-year-nav__step chronicle-year-nav__step--next/);
  assert.match(horizontalSource, /scrollToChronicleYear\(activeIndex \+ 1\)/);
  assert.match(horizontalSource, /disabled=\{activeIndex >= yearStops\.length - 1\}/);
  assert.match(horizontalSource, /aria-current=\{activeIndex === stop\.index \? 'step' : undefined\}/);
});

test('desktop Archive year window has stable rows and overflow cues', () => {
  assert.match(globalsSource, /\.chronicle-year-nav__list\s*\{[\s\S]*?grid-auto-rows: 44px/);
  assert.match(globalsSource, /\.chronicle-year-nav__list\s*\{[\s\S]*?min-height: 308px/);
  assert.match(globalsSource, /\.chronicle-year-nav__window\.has-before::before/);
  assert.match(globalsSource, /\.chronicle-year-nav__window\.has-after::after/);
  assert.match(globalsSource, /\.chronicle-year-nav__step:disabled/);
});
