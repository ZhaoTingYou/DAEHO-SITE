import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindPasswordRecoveryOperation,
  classifyRecoveryFunctionResponse
} from './recovery-operation-core.mjs';

test('password reset operations are bound to the exact username and new password', () => {
  const first = bindPasswordRecoveryOperation({
    operationKey: 'browser-operation-123456',
    loginName: 'daeho.member',
    password: 'NewPass1!',
    secret: 'a-long-internal-secret-that-is-at-least-32-bytes'
  });

  assert.equal(first, bindPasswordRecoveryOperation({
    operationKey: 'browser-operation-123456',
    loginName: 'daeho.member',
    password: 'NewPass1!',
    secret: 'a-long-internal-secret-that-is-at-least-32-bytes'
  }));
  assert.notEqual(first, bindPasswordRecoveryOperation({
    operationKey: 'browser-operation-123456',
    loginName: 'daeho.member',
    password: 'DifferentPass2!',
    secret: 'a-long-internal-secret-that-is-at-least-32-bytes'
  }));
  assert.notEqual(first, bindPasswordRecoveryOperation({
    operationKey: 'browser-operation-123456',
    loginName: 'other.member',
    password: 'NewPass1!',
    secret: 'a-long-internal-secret-that-is-at-least-32-bytes'
  }));
  assert.equal(first.length, 43);
});

test('only explicit pre-provider Lambda failures release a reset reservation', () => {
  assert.equal(classifyRecoveryFunctionResponse(204), 'success');
  for (const status of [400, 401, 405]) {
    assert.equal(classifyRecoveryFunctionResponse(status), 'definiteFailure');
  }
  for (const status of [0, 202, 404, 429, 500, 502, 503, 504]) {
    assert.equal(classifyRecoveryFunctionResponse(status), 'unknown');
  }
});
