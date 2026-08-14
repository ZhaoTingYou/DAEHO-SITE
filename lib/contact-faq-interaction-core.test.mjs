import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialContactFaqState,
  reduceContactFaqInteraction
} from './contact-faq-interaction-core.mjs';

test('opens the first FAQ chapter by default with no answer selected', () => {
  assert.deepEqual(createInitialContactFaqState('consultation'), {
    openCategory: 'consultation',
    openQuestion: null
  });
  assert.deepEqual(createInitialContactFaqState(null), {
    openCategory: null,
    openQuestion: null
  });
});

test('allows the current mobile chapter to close and closes answers when chapters change', () => {
  const withAnswer = {openCategory: 'consultation', openQuestion: 'consultation-2'};
  const closed = reduceContactFaqInteraction(withAnswer, {
    type: 'toggleCategory',
    category: 'consultation'
  });
  const switched = reduceContactFaqInteraction(withAnswer, {
    type: 'toggleCategory',
    category: 'design'
  });

  assert.deepEqual(closed, {openCategory: null, openQuestion: null});
  assert.deepEqual(switched, {openCategory: 'design', openQuestion: null});
});

test('keeps at most one FAQ answer open across every desktop and mobile chapter', () => {
  const initial = createInitialContactFaqState('consultation');
  const firstOpen = reduceContactFaqInteraction(initial, {
    type: 'toggleQuestion',
    question: 'consultation-0'
  });
  const replaced = reduceContactFaqInteraction(firstOpen, {
    type: 'toggleQuestion',
    question: 'sports-1'
  });
  const closed = reduceContactFaqInteraction(replaced, {
    type: 'toggleQuestion',
    question: 'sports-1'
  });

  assert.equal(firstOpen.openQuestion, 'consultation-0');
  assert.equal(replaced.openQuestion, 'sports-1');
  assert.equal(closed.openQuestion, null);
});
