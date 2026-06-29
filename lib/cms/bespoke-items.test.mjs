import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const source = readFileSync(new URL('./bespoke-items.ts', import.meta.url), 'utf8');
const {outputText} = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
});
const compiledModule = {exports: {}};

vm.runInNewContext(outputText, {module: compiledModule, exports: compiledModule.exports});

const {mergeBespokeItems} = compiledModule.exports;

test('mergeBespokeItems overrides existing bespoke work images and appends new CMS work images', () => {
  const baseItems = [
    {
      id: 'ring-03',
      title: 'Collection 03',
      caption: 'Old caption',
      category: 'bespoke',
      categoryLabel: 'Bespoke',
      image: 'collection_ring_03.png',
      hasImage: true
    },
    {
      id: 'ring-06',
      title: 'Collection 06',
      caption: 'Another caption',
      category: 'bespoke',
      categoryLabel: 'Bespoke',
      image: 'collection_ring_06.png',
      hasImage: true
    }
  ];

  const result = mergeBespokeItems(baseItems, [
    {
      id: 'ring-03',
      image: 'cms-ring-03.png',
      title: 'CMS Ring 03'
    },
    {
      id: 'custom-bespoke-01',
      title: 'Custom bespoke 01',
      caption: 'New CMS image',
      image: 'custom-bespoke-01.png'
    }
  ], 'ko');

  assert.equal(result.length, 3);
  assert.equal(result[0].id, 'ring-03');
  assert.equal(result[0].title, 'CMS Ring 03');
  assert.equal(result[0].image, 'cms-ring-03.png');
  assert.equal(result[0].hasImage, true);
  assert.deepEqual(result.map((item) => item.id), ['ring-03', 'ring-06', 'custom-bespoke-01']);
  assert.equal(result[2].category, 'bespoke');
  assert.equal(result[2].categoryLabel, '주문제작');
  assert.equal(result[2].hasImage, true);
});

test('mergeBespokeItems ignores empty append rows from the CMS form', () => {
  const result = mergeBespokeItems([], [
    {id: '', title: '', caption: '', image: ''},
    {id: '   ', image: '   '}
  ], 'en');

  assert.deepEqual(result, []);
});
