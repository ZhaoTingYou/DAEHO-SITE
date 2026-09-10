import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatLiveChatBusinessHours,
  isWithinLiveChatBusinessHours
} from './live-chat-business-hours-core.mjs';

const hours = {
  start: '09:00',
  end: '19:00',
  timeZone: 'Asia/Seoul'
};

test('checks the CMS schedule in Seoul instead of the visitor device time zone', () => {
  assert.equal(
    isWithinLiveChatBusinessHours(hours, new Date('2026-09-11T00:00:00Z')),
    true
  );
  assert.equal(
    isWithinLiveChatBusinessHours(hours, new Date('2026-09-11T10:00:00Z')),
    false
  );
});

test('formats the configured same-day range without changing its values', () => {
  assert.equal(formatLiveChatBusinessHours(hours), '09:00–19:00');
});
