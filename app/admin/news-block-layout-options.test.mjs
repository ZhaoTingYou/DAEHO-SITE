import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const editorSource = readFileSync(new URL('./_components/news-blocks-editor.tsx', import.meta.url), 'utf8');
const formSource = readFileSync(new URL('./_components/news-form.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('../../lib/cms/public-content.ts', import.meta.url), 'utf8');
const detailPageSource = readFileSync(new URL('../[locale]/(site)/news/[slug]/page.tsx', import.meta.url), 'utf8');

test('News block editor exposes all six layouts as visual choices', () => {
  assert.match(editorSource, /type: 'text' \| 'imageFull' \| 'imageCentered' \| 'imageText' \| 'quote'/);
  assert.match(editorSource, /const blockPresets/);
  assert.match(editorSource, /id: 'text'/);
  assert.match(editorSource, /id: 'imageFull'/);
  assert.match(editorSource, /id: 'imageCentered'/);
  assert.match(editorSource, /id: 'imageTextLeft'/);
  assert.match(editorSource, /id: 'imageTextRight'/);
  assert.match(editorSource, /id: 'quote'/);
  assert.match(editorSource, /function BlockLayoutPreview/);
});

test('News block editor only shows controls that apply to the selected layout', () => {
  assert.match(editorSource, /block\.type === 'imageText' \? \(/);
  assert.match(editorSource, /block\.type !== 'imageCentered' && block\.type !== 'imageFull' \? \(/);
  assert.match(editorSource, /value=\{block\.type === 'imageFull' \? block\.width : 'narrow'\}/);
  assert.match(editorSource, /block\.type === 'text' \|\| block\.type === 'imageFull' \|\| block\.type === 'imageText'/);
  assert.match(editorSource, /block\.type === 'imageFull' \|\| block\.type === 'imageCentered' \|\| block\.type === 'imageText'/);
});

test('centered image blocks survive admin normalization, saving, and public normalization', () => {
  assert.match(formSource, /block\.type === 'imageCentered'/);
  assert.match(actionsSource, /value === 'imageCentered'/);
  assert.match(publicContentSource, /value === 'imageCentered'/);
});

test('News detail renders a centered image without visible copy', () => {
  const centeredBranchStart = detailPageSource.indexOf("if (block.type === 'imageCentered')");
  const imageTextBranchStart = detailPageSource.indexOf("if (block.type === 'imageText')");

  assert.ok(centeredBranchStart > -1);
  assert.ok(imageTextBranchStart > centeredBranchStart);

  const centeredBranch = detailPageSource.slice(centeredBranchStart, imageTextBranchStart);
  assert.match(centeredBranch, /mx-auto max-w-\[760px\]/);
  assert.match(centeredBranch, /<SafeImage/);
  assert.doesNotMatch(centeredBranch, /NewsBlockCopy/);
});
