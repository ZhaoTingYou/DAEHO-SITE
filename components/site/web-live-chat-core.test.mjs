import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  createWebLiveChatState,
  reduceWebLiveChatState,
  shouldUsePolling,
  unreadCount,
  visibleTeamMessages
} from './web-live-chat-core.mjs';

test('public history never renders visitor bodies', () => {
  assert.deepEqual(visibleTeamMessages([
    {id: 1, direction: 'visitor', body: 'private follow-up'},
    {id: 2, direction: 'team', body: '팀 답변'},
    {id: 3, direction: 'system', body: 'closed'}
  ]).map((item) => item.id), [2, 3]);
});

test('public history accepts each positive durable ID once', () => {
  assert.deepEqual(visibleTeamMessages([
    {id: 2, direction: 'team', body: 'first'},
    {id: 2, direction: 'team', body: 'duplicate'},
    {id: 0, direction: 'system', body: 'not durable'},
    {id: -1, direction: 'team', body: 'invalid'}
  ]).map((item) => item.body), ['first']);
  assert.equal(unreadCount({
    messages: [
      {id: 2, direction: 'team', body: 'read'},
      {id: 3, direction: 'system', body: 'unread'},
      {id: 4, direction: 'visitor', body: 'private'}
    ],
    lastReadTeamMessageId: 2
  }), 1);
});

test('hover changes only its visual flag and click opens the panel', () => {
  const initial = createWebLiveChatState();
  const hovered = reduceWebLiveChatState(initial, {type: 'hover', active: true});

  assert.equal(hovered.hovered, true);
  assert.equal(hovered.panelOpen, false);
  assert.equal(hovered.launcherExpanded, false);
  assert.equal(reduceWebLiveChatState(hovered, {type: 'toggle'}).panelOpen, true);
});

test('registration form draft is retained while the panel is closed and reopened', () => {
  const opened = reduceWebLiveChatState(createWebLiveChatState(), {type: 'toggle'});
  const drafted = reduceWebLiveChatState(opened, {
    type: 'form_draft',
    patch: {name: '김대호', contact: '010-0000-0000', consent: true}
  });
  const closed = reduceWebLiveChatState(drafted, {type: 'toggle'});
  const reopened = reduceWebLiveChatState(closed, {type: 'toggle'});

  assert.deepEqual(reopened.formDraft, {
    name: '김대호', contact: '010-0000-0000', content: '', consent: true
  });
  assert.equal(reopened.view, 'registration');
});

test('visitor send lifecycle reports status without creating a visitor bubble', () => {
  const drafted = reduceWebLiveChatState(createWebLiveChatState(), {
    type: 'message_draft', body: 'private follow-up'
  });
  const pending = reduceWebLiveChatState(drafted, {type: 'send_pending'});
  const sent = reduceWebLiveChatState(pending, {type: 'send_succeeded'});

  assert.equal(pending.sendStatus, 'pending');
  assert.equal(sent.sendStatus, 'sent');
  assert.equal(sent.messageDraft, '');
  assert.deepEqual(sent.messages, []);
});

test('session payloads map only to the six supported view states', () => {
  const initial = createWebLiveChatState();
  const opened = reduceWebLiveChatState(initial, {type: 'toggle'});
  const unavailable = reduceWebLiveChatState(opened, {
    type: 'session_loaded', session: {available: false, conversation: null, messages: [], unreadCount: 0}
  });
  const waiting = reduceWebLiveChatState(opened, {
    type: 'session_loaded',
    session: {available: true, conversation: {state: 'opening'}, messages: [], unreadCount: 0}
  });
  const active = reduceWebLiveChatState(opened, {
    type: 'session_loaded',
    session: {available: true, conversation: {state: 'active'}, messages: [], unreadCount: 0}
  });

  assert.equal(unavailable.view, 'temporarily_unavailable');
  assert.equal(waiting.view, 'waiting');
  assert.equal(active.view, 'active');
  assert.deepEqual(new Set([
    initial.view, unavailable.view, waiting.view, active.view,
    reduceWebLiveChatState(active, {type: 'conversation_closed'}).view,
    opened.view
  ]), new Set([
    'closed_launcher', 'registration', 'waiting', 'active', 'closed',
    'temporarily_unavailable'
  ]));
});

test('durable team events deduplicate by positive ID and increment unread only while closed', () => {
  const messageEvent = {
    type: 'durable_event',
    event: {
      type: 'message', id: 42,
      message: {id: 42, direction: 'team', body: '팀 답변', createdAt: '2026-09-01T00:00:00Z'}
    }
  };
  const received = reduceWebLiveChatState(createWebLiveChatState(), messageEvent);
  const duplicate = reduceWebLiveChatState(received, messageEvent);
  const visitor = reduceWebLiveChatState(duplicate, {
    type: 'durable_event',
    event: {type: 'message', id: 43, message: {id: 43, direction: 'visitor', body: 'private'}}
  });

  assert.equal(received.highestDurableEventId, 42);
  assert.equal(received.unread, 1);
  assert.equal(unreadCount(received), 1);
  assert.deepEqual(received.messages.map(({id}) => id), [42]);
  assert.strictEqual(duplicate, received);
  assert.strictEqual(visitor, duplicate);
});

test('mark-read resets through a deterministic durable cursor and open events stay read', () => {
  const first = reduceWebLiveChatState(createWebLiveChatState(), {
    type: 'durable_event',
    event: {
      type: 'message', id: 10,
      message: {id: 10, direction: 'team', body: 'first', createdAt: '2026-09-01T00:00:00Z'}
    }
  });
  const read = reduceWebLiveChatState(first, {type: 'mark_read', messageId: 10});
  const oldReplay = reduceWebLiveChatState(read, {
    type: 'durable_event',
    event: {
      type: 'message', id: 9,
      message: {id: 9, direction: 'team', body: 'old replay', createdAt: '2026-08-31T23:59:00Z'}
    }
  });
  const opened = reduceWebLiveChatState(oldReplay, {type: 'toggle'});
  const second = reduceWebLiveChatState(opened, {
    type: 'durable_event',
    event: {
      type: 'message', id: 11,
      message: {id: 11, direction: 'team', body: 'second', createdAt: '2026-09-01T00:01:00Z'}
    }
  });

  assert.equal(read.unread, 0);
  assert.equal(oldReplay.unread, 0);
  assert.equal(read.lastReadTeamMessageId, 10);
  assert.equal(second.unread, 0);
});

test('closed state is retained until an explicit new consultation resets private and public state', () => {
  const active = reduceWebLiveChatState(
    reduceWebLiveChatState(createWebLiveChatState(), {type: 'toggle'}),
    {
      type: 'session_loaded',
      session: {
        available: true,
        conversation: {state: 'closed', lastReadTeamMessageId: 7},
        messages: [{id: 7, direction: 'system', body: 'closed'}],
        unreadCount: 1
      }
    }
  );
  const drafted = reduceWebLiveChatState(
    reduceWebLiveChatState(active, {type: 'form_draft', patch: {name: '김대호'}}),
    {type: 'message_draft', body: 'retry me'}
  );
  const reset = reduceWebLiveChatState(drafted, {type: 'new_consultation'});

  assert.equal(drafted.view, 'closed');
  assert.equal(reset.view, 'registration');
  assert.equal(reset.conversationState, null);
  assert.deepEqual(reset.messages, []);
  assert.deepEqual(reset.formDraft, {name: '', contact: '', content: '', consent: false});
  assert.equal(reset.messageDraft, '');
  assert.equal(reset.highestDurableEventId, 0);
  assert.equal(reset.unread, 0);
});

test('SSE failures back off and switch to polling on the third consecutive failure', () => {
  const first = reduceWebLiveChatState(createWebLiveChatState(), {type: 'sse_failure'});
  const second = reduceWebLiveChatState(first, {type: 'sse_failure'});
  const third = reduceWebLiveChatState(second, {type: 'sse_failure'});
  const recovered = reduceWebLiveChatState(third, {type: 'sse_connected'});

  assert.deepEqual(
    [first.retryDelayMs, second.retryDelayMs, third.retryDelayMs],
    [1000, 2000, 4000]
  );
  assert.equal(shouldUsePolling(2), false);
  assert.equal(shouldUsePolling(3), true);
  assert.equal(third.polling, true);
  assert.equal(recovered.sseFailures, 0);
  assert.equal(recovered.polling, false);
});

test('API client uses only same-origin live-chat endpoints and credentialed transport', () => {
  const source = readFileSync(new URL('./web-live-chat-api.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./);
  assert.match(source, /credentials: 'same-origin'/);
  assert.match(source, /withCredentials: true/);
  assert.match(source, /globalThis\.crypto\.getRandomValues/);
  assert.match(source, /MAX_RESPONSE_BYTES/);
  assert.match(source, /'Content-Type': 'application\/json'/);
  assert.match(source, /\| \{type: 'heartbeat'; at: string\}/);
  assert.match(source, /API_ROOT = '\/api\/live-chat'/);
  assert.match(source, /\$\{API_ROOT\}\/session/);
  assert.match(source, /\$\{API_ROOT\}\/conversations\/current\/events/);
});
