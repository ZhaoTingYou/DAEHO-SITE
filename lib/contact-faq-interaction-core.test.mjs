import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialContactFaqState,
  reduceContactFaqInteraction
} from './contact-faq-interaction-core.mjs';

test('opens the first FAQ chapter by default with no answer selected', () => {
  assert.deepEqual(createInitialContactFaqState('consultation'), {
    openCategory: 'consultation',
    openQuestion: null,
    expandedCategories: []
  });
  assert.deepEqual(createInitialContactFaqState(null), {
    openCategory: null,
    openQuestion: null,
    expandedCategories: []
  });
});

test('allows the current mobile chapter to close and closes answers when chapters change', () => {
  const withAnswer = {
    openCategory: 'consultation',
    openQuestion: 'consultation-2',
    expandedCategories: ['business']
  };
  const closed = reduceContactFaqInteraction(withAnswer, {
    type: 'toggleCategory',
    category: 'consultation'
  });
  const switched = reduceContactFaqInteraction(withAnswer, {
    type: 'toggleCategory',
    category: 'design'
  });

  assert.deepEqual(closed, {
    openCategory: null,
    openQuestion: null,
    expandedCategories: ['business']
  });
  assert.deepEqual(switched, {
    openCategory: 'design',
    openQuestion: null,
    expandedCategories: ['business']
  });
});

test('expands category question lists independently', () => {
  const initial = createInitialContactFaqState('consultation');
  const consultationOpen = reduceContactFaqInteraction(initial, {
    type: 'toggleCategoryQuestions',
    category: 'consultation',
    hiddenQuestions: ['consultation-3', 'consultation-4']
  });
  const businessOpen = reduceContactFaqInteraction(consultationOpen, {
    type: 'toggleCategoryQuestions',
    category: 'business',
    hiddenQuestions: ['business-3', 'business-4', 'business-5']
  });

  assert.deepEqual(businessOpen.expandedCategories, ['consultation', 'business']);
});

test('collapsing a category list closes an answer that becomes hidden', () => {
  const expanded = {
    openCategory: 'consultation',
    openQuestion: 'consultation-4',
    expandedCategories: ['consultation', 'business']
  };
  const collapsed = reduceContactFaqInteraction(expanded, {
    type: 'toggleCategoryQuestions',
    category: 'consultation',
    hiddenQuestions: ['consultation-3', 'consultation-4']
  });

  assert.deepEqual(collapsed, {
    openCategory: 'consultation',
    openQuestion: null,
    expandedCategories: ['business']
  });
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
