import assert from 'node:assert/strict';
import test from 'node:test';

import {createLoginRateLimiter} from './login-rate-limit-core.mjs';

test('reserves login attempts before authentication so concurrent bursts cannot pass the limit', () => {
  const limiter = createLoginRateLimiter({windowMs: 1_000, ipLimit: 20, usernameLimit: 3});
  const keys = {ip: 'ip-one', username: 'member-one'};

  assert.equal(limiter.reserve(keys, 0), true);
  assert.equal(limiter.reserve(keys, 0), true);
  assert.equal(limiter.reserve(keys, 0), true);
  assert.equal(limiter.reserve(keys, 0), false);
});

test('a successful login releases its reservation and clears that username failure window', () => {
  const limiter = createLoginRateLimiter({windowMs: 1_000, ipLimit: 3, usernameLimit: 2});
  const keys = {ip: 'ip-one', username: 'member-one'};

  assert.equal(limiter.reserve(keys, 0), true);
  assert.equal(limiter.reserve(keys, 0), true);
  limiter.releaseSuccessful(keys);

  assert.equal(limiter.reserve(keys, 0), true);
  assert.equal(limiter.reserve({...keys, username: 'member-two'}, 0), true);
  assert.equal(limiter.reserve({...keys, username: 'member-three'}, 0), false);
  assert.equal(limiter.reserve(keys, 1_001), true);
});
