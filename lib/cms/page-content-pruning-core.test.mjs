import assert from 'node:assert/strict';
import test from 'node:test';

import {pruneObjectPaths} from './page-content-pruning-core.mjs';

test('pruneObjectPaths removes retired nested values without touching surviving siblings', () => {
  const content = {
    detail: {
      story: 'Work story',
      specs: 'Specifications',
      processTitle: 'Applied process'
    },
    finder: {
      year: 'Year'
    }
  };

  pruneObjectPaths(content, ['detail.specs', 'detail.processTitle', 'detail.processHref']);

  assert.deepEqual(content, {
    detail: {
      story: 'Work story'
    },
    finder: {
      year: 'Year'
    }
  });
});

