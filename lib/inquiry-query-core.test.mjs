import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveContactInquiryType,
  resolveGolfInquiryQuery
} from './inquiry-query-core.mjs';

test('contact inquiry query accepts only supported types', () => {
  assert.equal(resolveContactInquiryType('?type=bespoke'), 'bespoke');
  assert.equal(resolveContactInquiryType('?type=unknown'), 'appointment');
  assert.equal(resolveContactInquiryType(''), 'appointment');
});

test('golf inquiry query preserves valid choices and safely falls back', () => {
  const options = {
    headIds: ['ball', 'shield'],
    shaftIds: ['classic', 'modern'],
    styles: ['BASIC', 'COLOUR'],
    defaultEngraving: 'JUDY KIM 2026.05.03'
  };

  assert.deepEqual(
    resolveGolfInquiryQuery('?head=shield&shaft=modern&style=COLOUR&engraving=%20TEAM%20A%20', options),
    {headId: 'shield', shaftId: 'modern', style: 'COLOUR', engraving: 'TEAM A'}
  );
  assert.deepEqual(
    resolveGolfInquiryQuery('?head=missing&shaft=missing&style=OTHER', options),
    {headId: 'ball', shaftId: 'classic', style: 'BASIC', engraving: 'JUDY KIM 2026.05.03'}
  );
});

test('golf inquiry engraving is capped at eighty characters', () => {
  const result = resolveGolfInquiryQuery(`?engraving=${'A'.repeat(100)}`, {
    headIds: ['ball'],
    shaftIds: ['classic'],
    styles: ['BASIC'],
    defaultEngraving: 'DEFAULT'
  });

  assert.equal(result.engraving, 'A'.repeat(80));
});
