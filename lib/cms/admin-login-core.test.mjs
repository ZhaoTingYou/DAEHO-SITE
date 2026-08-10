import assert from 'node:assert/strict';
import test from 'node:test';

import {createAdminLoginAttemptKey} from './admin-login-core.mjs';

test('login attempt key combines normalized email and client IP', () => {
  assert.equal(
    createAdminLoginAttemptKey(' OWNER@EXAMPLE.COM ', '203.0.113.10'),
    'owner@example.com|203.0.113.10'
  );
});

test('login attempt key uses a stable local fallback for a missing IP', () => {
  assert.equal(createAdminLoginAttemptKey('owner@example.com', '  '), 'owner@example.com|local');
});
