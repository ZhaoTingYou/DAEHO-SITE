import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./web-live-chat-api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}
}).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('owner-scoped message reads retain visitor rows and drop duplicates or malformed rows', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({items: [
    {id: 1, direction: 'visitor', body: 'private', createdAt: '2026-09-01T00:00:00Z'},
    {id: 2, direction: 'team', body: 'answer', createdAt: '2026-09-01T00:01:00Z'},
    {id: 2, direction: 'team', body: 'duplicate', createdAt: '2026-09-01T00:01:00Z'},
    {id: 3, direction: 'system', body: 'closed', createdAt: '2026-09-01T00:02:00Z'},
    {id: 0, direction: 'team', body: 'invalid id', createdAt: '2026-09-01T00:03:00Z'},
    {id: 4, direction: 'team', body: 42, createdAt: '2026-09-01T00:04:00Z'}
  ]});
  try {
    const response = await api.getMessages(0);
    assert.deepEqual(response.items, [
      {id: 1, direction: 'visitor', body: 'private', createdAt: '2026-09-01T00:00:00Z'},
      {id: 2, direction: 'team', body: 'answer', createdAt: '2026-09-01T00:01:00Z'},
      {id: 3, direction: 'system', body: 'closed', createdAt: '2026-09-01T00:02:00Z'}
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid top-level session JSON is rejected instead of cast', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse([]);
  try {
    await assert.rejects(
      api.getSession(),
      (error) => error instanceof api.WebLiveChatApiError
        && error.message === 'Live-chat response had an invalid shape.'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('conversation wrappers reject array, object, number, and null enum values', async () => {
  const originalFetch = globalThis.fetch;
  const startInput = {
    locale: 'ko', name: '김대호', contact: '010-0000-0000', content: '문의',
    consent: true, consentVersion: 'v1', formStartedAt: 1,
    clientMessageKey: '12345678901234567890'
  };
  const sessionResponse = (conversation) => ({
    available: true, conversation, messages: [], unreadCount: 0
  });
  const cases = [
    [() => api.getSession(), sessionResponse({...validConversation(), state: ['active']})],
    [() => api.getSession(), sessionResponse({...validConversation(), locale: {value: 'ko'}})],
    [() => api.startConversation(startInput), {conversation: {...validConversation(), state: 1}}],
    [() => api.startConversation(startInput), {conversation: {...validConversation(), locale: ['ko']}}],
    [() => api.markRead(1), {conversation: {...validConversation(), state: null}}],
    [() => api.markRead(1), {conversation: {...validConversation(), locale: null}}]
  ];
  try {
    for (const [run, payload] of cases) {
      globalThis.fetch = async () => jsonResponse(payload);
      await assert.rejects(run(), (error) => error instanceof api.WebLiveChatApiError);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('owner-scoped session parsing retains initial and follow-up visitor history', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    available: true,
    conversation: null,
    messages: [
      {id: 1, direction: 'visitor', body: 'private', createdAt: '2026-09-01T00:00:00Z'},
      {id: 2, direction: 'team', body: 'public', createdAt: '2026-09-01T00:01:00Z'}
    ],
    unreadCount: 1
  });
  try {
    const session = await api.getSession();
    assert.deepEqual(session.messages, [
      {id: 1, direction: 'visitor', body: 'private', createdAt: '2026-09-01T00:00:00Z'},
      {id: 2, direction: 'team', body: 'public', createdAt: '2026-09-01T00:01:00Z'}
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('conversation and write response shapes are validated at every endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const cases = [
    [
      () => api.startConversation({
        locale: 'ko', name: '김대호', contact: '010-0000-0000', content: '문의',
        consent: true, consentVersion: 'v1', formStartedAt: 1,
        clientMessageKey: '12345678901234567890'
      }),
      {conversation: {state: 'active'}}
    ],
    [() => api.sendVisitorMessage('hello', '12345678901234567890'), {messageId: 0, status: 'sent'}],
    [() => api.getMessages(0), {items: 'not-an-array'}],
    [() => api.markRead(1), {conversation: null}]
  ];
  try {
    for (const [run, payload] of cases) {
      globalThis.fetch = async () => jsonResponse(payload);
      await assert.rejects(run(), (error) => error instanceof api.WebLiveChatApiError);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('send response accepts only sent and in-progress delivery states', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const status of ['sent', 'in_progress']) {
      globalThis.fetch = async () => jsonResponse({messageId: 7, status});
      assert.deepEqual(
        await api.sendVisitorMessage('hello', '12345678901234567890'),
        {messageId: 7, status}
      );
    }

    for (const status of ['queued', 'delivered', '']) {
      globalThis.fetch = async () => jsonResponse({messageId: 7, status});
      await assert.rejects(
        api.sendVisitorMessage('hello', '12345678901234567890'),
        (error) => error instanceof api.WebLiveChatApiError
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('non-2xx and oversized responses fail explicitly', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => jsonResponse({message: 'denied'}, {status: 403});
    await assert.rejects(
      api.getSession(),
      (error) => error instanceof api.WebLiveChatApiError
        && error.status === 403
        && error.message === 'denied'
    );

    globalThis.fetch = async () => new Response('{}', {
      status: 200,
      headers: {'Content-Length': String(256 * 1024 + 1)}
    });
    await assert.rejects(
      api.getSession(),
      (error) => error instanceof api.WebLiveChatApiError
        && error.message === 'Live-chat response was too large.'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client message keys are exported secure browser-generated values within server bounds', () => {
  const keys = new Set(Array.from({length: 32}, () => api.createClientMessageKey()));

  assert.equal(keys.size, 32);
  for (const key of keys) {
    assert.match(key, /^[A-Za-z0-9_-]{20,100}$/);
  }
  assert.match(source, /globalThis\.crypto\.getRandomValues/);
});

test('mutation retries require and reuse the caller-retained idempotency key exactly', async () => {
  const originalFetch = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (_path, init) => {
    writes.push(JSON.parse(init.body));
    return jsonResponse({messageId: 9, status: 'sent'});
  };
  const key = api.createClientMessageKey();
  try {
    await api.sendVisitorMessage('same logical message', key);
    await api.sendVisitorMessage('same logical message', key);
    assert.deepEqual(writes.map(({clientMessageKey}) => clientMessageKey), [key, key]);

    await assert.rejects(api.sendVisitorMessage('missing'), TypeError);
    await assert.rejects(api.sendVisitorMessage('short', 'x'.repeat(19)), TypeError);
    await assert.rejects(api.sendVisitorMessage('long', 'x'.repeat(101)), TypeError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('conversation start also requires the caller-retained key on every retry', async () => {
  const originalFetch = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (_path, init) => {
    writes.push(JSON.parse(init.body));
    return jsonResponse({conversation: validConversation()});
  };
  const key = api.createClientMessageKey();
  const input = {
    locale: 'ko', name: '김대호', contact: '010-0000-0000', content: '문의',
    consent: true, consentVersion: 'v1', formStartedAt: 1, clientMessageKey: key
  };
  try {
    await api.startConversation(input);
    await api.startConversation(input);
    assert.deepEqual(writes.map(({clientMessageKey}) => clientMessageKey), [key, key]);

    const withoutKey = {...input};
    delete withoutKey.clientMessageKey;
    await assert.rejects(api.startConversation(withoutKey), TypeError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: {'Content-Type': 'application/json', ...init.headers}
  });
}

function validConversation() {
  return {
    state: 'active', locale: 'ko', createdAt: '2026-09-01T00:00:00Z',
    closedAt: null, lastReadTeamMessageId: 0
  };
}
