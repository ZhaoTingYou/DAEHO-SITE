import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import postcss from 'postcss';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const sourceUrl = new URL('./chronicle-scroll-hint-visibility.ts', import.meta.url);
const componentUrl = new URL('./chronicle-scroll-hint.tsx', import.meta.url);
const globalsUrl = new URL('../../app/globals.css', import.meta.url);
let isChronicleScrollHintVisible;
let ChronicleScrollHint;

if (existsSync(sourceUrl)) {
  const source = readFileSync(sourceUrl, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  ({isChronicleScrollHintVisible} = await import(moduleUrl));
}

if (existsSync(componentUrl)) {
  const source = readFileSync(componentUrl, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  });
  const componentModule = {exports: {}};
  const require = createRequire(componentUrl);
  const evaluate = new Function('require', 'module', 'exports', outputText);

  evaluate(require, componentModule, componentModule.exports);
  ({ChronicleScrollHint} = componentModule.exports);
}

const cssRoot = postcss.parse(readFileSync(globalsUrl, 'utf8'));

function declarationsFor(rule) {
  return Object.fromEntries(
    (rule?.nodes ?? [])
      .filter((node) => node.type === 'decl')
      .map((node) => [node.prop, node.value])
  );
}

test('exposes the Archive scroll-hint visibility decision', () => {
  assert.equal(typeof isChronicleScrollHintVisible, 'function');
});

test('shows the Archive scroll hint only after the intro while the stage is active', () => {
  if (!isChronicleScrollHintVisible) return;

  assert.equal(isChronicleScrollHintVisible(false, true, 0), false);
  assert.equal(isChronicleScrollHintVisible(true, false, 0), false);
  assert.equal(isChronicleScrollHintVisible(true, true, 0), true);
});

test('hides the Archive scroll hint past one percent and restores it at the start', () => {
  if (!isChronicleScrollHintVisible) return;

  assert.equal(isChronicleScrollHintVisible(true, true, 0.01), true);
  assert.equal(isChronicleScrollHintVisible(true, true, 0.010_001), false);
  assert.equal(isChronicleScrollHintVisible(true, true, 0), true);
});

test('renders the Archive scroll hint as decorative content using the Home animation', () => {
  assert.equal(typeof ChronicleScrollHint, 'function');

  const markup = renderToStaticMarkup(createElement(ChronicleScrollHint, {visible: true}));

  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /home-scroll-hint chronicle-scroll-hint__motion/);
  assert.match(markup, />Scroll</);
  assert.match(markup, /chronicle-scroll-hint__line/);
});

test('adds the visible state only when the Archive scroll hint is active', () => {
  if (!ChronicleScrollHint) return;

  const visibleMarkup = renderToStaticMarkup(createElement(ChronicleScrollHint, {visible: true}));
  const hiddenMarkup = renderToStaticMarkup(createElement(ChronicleScrollHint, {visible: false}));

  assert.match(visibleMarkup, /class="chronicle-scroll-hint is-visible"/);
  assert.match(hiddenMarkup, /class="chronicle-scroll-hint"/);
  assert.doesNotMatch(hiddenMarkup, /is-visible/);
});

test('positions the Archive scroll hint in the desktop right-side safe area', () => {
  const rule = cssRoot.nodes.find(
    (node) => node.type === 'rule' && node.selector === '.chronicle-scroll-hint'
  );
  const declarations = declarationsFor(rule);

  assert.equal(declarations.position, 'fixed');
  assert.equal(declarations.top, '50%');
  assert.equal(declarations.right, 'clamp(28px, 3vw, 60px)');
  assert.equal(declarations['pointer-events'], 'none');
});

test('stops the Archive scroll-hint animation for reduced-motion users', () => {
  let motionRule;

  cssRoot.walkAtRules('media', (mediaRule) => {
    if (mediaRule.params !== '(prefers-reduced-motion: reduce)') return;

    mediaRule.walkRules('.chronicle-scroll-hint__motion', (rule) => {
      motionRule = rule;
    });
  });

  const declarations = declarationsFor(motionRule);

  assert.equal(declarations.animation, 'none');
  assert.equal(declarations.transform, 'none');
});
