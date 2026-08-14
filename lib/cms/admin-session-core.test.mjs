import assert from 'node:assert/strict';
import test from 'node:test';

import {createSignedAdminSession, parseSignedAdminSession} from './admin-session-core.mjs';

const issuedAt = Date.parse('2026-08-10T00:00:00Z');
const identity = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'editor@example.com',
  role: 'EDITOR',
  sessionVersion: 3,
  expiresAt: '2026-09-09T00:00:00Z',
  mustChangePassword: true
};

test('signed session preserves the authenticated identity', () => {
  const value = createSignedAdminSession(identity, 'test-secret', issuedAt);
  assert.deepEqual(
    parseSignedAdminSession(value, 'test-secret', Date.parse('2026-08-10T01:00:00Z')),
    identity
  );
});

test('rejects a wrong secret and payload or signature tampering', () => {
  const value = createSignedAdminSession(identity, 'test-secret', issuedAt);
  const [payload, signature] = value.split('.');
  const changedPayload = `${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}`;
  const changedSignature = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;

  assert.equal(parseSignedAdminSession(value, 'wrong-secret', issuedAt), null);
  assert.equal(parseSignedAdminSession(`${changedPayload}.${signature}`, 'test-secret', issuedAt), null);
  assert.equal(parseSignedAdminSession(`${payload}.${changedSignature}`, 'test-secret', issuedAt), null);
});

test('rejects malformed and structurally invalid values', () => {
  const invalidValues = [
    '',
    'one-part',
    'too.many.parts',
    'not-base64url.signature',
    createSignedAdminSession({...identity, role: 'ADMIN'}, 'test-secret', issuedAt),
    createSignedAdminSession({...identity, sessionVersion: 0}, 'test-secret', issuedAt),
    createSignedAdminSession({...identity, expiresAt: 'not-a-date'}, 'test-secret', issuedAt)
  ];

  for (const value of invalidValues) {
    assert.equal(parseSignedAdminSession(value, 'test-secret', issuedAt), null, value);
  }
});

test('expires after eight hours and rejects sessions issued in the future', () => {
  const value = createSignedAdminSession(identity, 'test-secret', issuedAt);

  assert.deepEqual(parseSignedAdminSession(value, 'test-secret', issuedAt + 8 * 60 * 60 * 1000), identity);
  assert.equal(parseSignedAdminSession(value, 'test-secret', issuedAt + 8 * 60 * 60 * 1000 + 1), null);
  assert.equal(parseSignedAdminSession(value, 'test-secret', issuedAt - 1), null);
});
