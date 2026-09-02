import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInvalidationQueue,
  createLogicalMutationController,
  createStableStreamController,
  loadMessagePages,
  nextFocusIndex
} from './web-live-chat-widget-core.mjs';

test('message paging advances from the durable cursor until a short page', async () => {
  const rows = Array.from({length: 205}, (_, index) => ({
    id: index + 1,
    direction: index % 2 ? 'system' : 'team',
    body: `row ${index + 1}`
  }));
  const cursors = [];

  const result = await loadMessagePages(async (after) => {
    cursors.push(after);
    return rows.filter(({id}) => id > after).slice(0, 100);
  }, 0);

  assert.deepEqual(cursors, [0, 100, 200]);
  assert.equal(result.items.length, 205);
  assert.equal(result.cursor, 205);
});

test('one native stream survives failures until polling and reopen uses one probe', () => {
  let connects = 0;
  let closes = 0;
  let fail;
  const stream = createStableStreamController((_onEvent, onFailure) => {
    connects += 1;
    fail = onFailure;
    return () => { closes += 1; };
  });
  let failures = 0;

  stream.open({probing: false, onEvent() {}, onFailure() { failures += 1; }});
  fail();
  fail();
  assert.equal(connects, 1);
  assert.equal(closes, 0);
  assert.equal(failures, 2);

  stream.stopForPolling();
  assert.equal(closes, 1);
  stream.open({probing: true, onEvent() {}, onFailure() { failures += 1; }});
  fail();
  assert.equal(connects, 2);
  assert.equal(closes, 2);
});

test('logical mutation controller serializes edits and retries while rejecting stale completion', () => {
  let keyNumber = 0;
  const controller = createLogicalMutationController(() => `key-${++keyNumber}`);
  const first = controller.begin('payload A');

  assert.equal(controller.begin('payload A'), null);
  assert.equal(controller.edit(), false);
  assert.equal(controller.finish(first, 'ambiguous_failure'), true);

  const retry = controller.begin('payload A');
  assert.equal(retry.key, first.key);
  assert.notEqual(retry.generation, first.generation);
  assert.equal(controller.finish(retry, 'definitive_failure'), true);

  const replacement = controller.begin('payload A');
  assert.notEqual(replacement.key, first.key);
  assert.equal(controller.finish(first, 'success'), false);
  assert.equal(controller.finish(replacement, 'accepted'), true);
  assert.equal(controller.edit(), false);
  assert.equal(controller.begin('payload A'), null);
});

test('accepted start remains locked when later history hydration fails', async () => {
  const controller = createLogicalMutationController(() => 'accepted-key');
  const operation = controller.begin('accepted payload');
  assert.equal(controller.finish(operation, 'accepted'), true);

  await assert.rejects(Promise.reject(new Error('history unavailable')));
  assert.equal(controller.isLocked(), true);
  assert.equal(controller.begin('accepted payload'), null);
  assert.equal(controller.edit(), false);
});

test('focus routing contains forward and reverse Tab even from outside the dialog', () => {
  assert.equal(nextFocusIndex(3, -1, false), 0);
  assert.equal(nextFocusIndex(3, -1, true), 2);
  assert.equal(nextFocusIndex(3, 2, false), 0);
  assert.equal(nextFocusIndex(3, 0, true), 2);
  assert.equal(nextFocusIndex(0, -1, false), -1);
});

test('cross-tab hints coalesce into one authoritative refresh', async () => {
  let scheduled;
  let refreshes = 0;
  let cancellations = 0;
  const queue = createInvalidationQueue(
    async () => { refreshes += 1; },
    {
      schedule: (callback) => { scheduled = callback; return callback; },
      cancel: () => { cancellations += 1; }
    }
  );

  queue.invalidate();
  queue.invalidate();
  assert.equal(refreshes, 0);
  assert.equal(cancellations, 1);
  await scheduled();
  assert.equal(refreshes, 1);
});

test('a delayed old-tab hint refreshes the replacement conversation without carrying stale state', async () => {
  let scheduled;
  let authoritativeConversation = 'old-conversation';
  const observed = [];
  const queue = createInvalidationQueue(
    async () => { observed.push(authoritativeConversation); },
    {
      schedule: (callback) => { scheduled = callback; return callback; },
      cancel() {}
    }
  );

  queue.invalidate();
  authoritativeConversation = 'replacement-conversation';
  await scheduled();

  assert.deepEqual(observed, ['replacement-conversation']);
});
