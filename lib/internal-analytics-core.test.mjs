import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS,
  INTERNAL_ANALYTICS_STORAGE_KEY,
  classifyDevice,
  classifyTrafficSource,
  resolveSessionState,
  sanitizeReferrerHost
} from './internal-analytics-core.mjs';

const seed = {sessionId: '00000000-0000-4000-8000-000000000002'};

test('classifies campaign and referrer traffic with UTM priority', () => {
  assert.deepEqual(
    classifyTrafficSource({
      source: 'instagram',
      medium: 'social',
      campaign: 'always_on',
      content: 'profile_link',
      referrerHost: 'google.com'
    }),
    {
      channel: 'instagram',
      source: 'instagram',
      medium: 'social',
      campaign: 'always_on',
      content: 'profile_link'
    }
  );
  assert.equal(classifyTrafficSource({source: '', medium: '', referrerHost: 'search.naver.com'}).channel, 'naver');
  assert.equal(classifyTrafficSource({source: '', medium: '', referrerHost: ''}).channel, 'direct');
});

test('sanitizes referrers to external hostnames only', () => {
  assert.equal(
    sanitizeReferrerHost('https://www.google.com/search?q=private', 'https://daeho.works/ko'),
    'google.com'
  );
  assert.equal(sanitizeReferrerHost('https://daeho.works/private?name=secret', 'https://daeho.works'), '');
  assert.equal(sanitizeReferrerHost('not a url', 'https://daeho.works'), '');
});

test('classifies device from the mobile hint first and viewport second', () => {
  assert.equal(classifyDevice(1200, true), 'mobile');
  assert.equal(classifyDevice(375, false), 'mobile');
  assert.equal(classifyDevice(768, false), 'tablet');
  assert.equal(classifyDevice(1023, false), 'tablet');
  assert.equal(classifyDevice(1024, false), 'desktop');
});

test('reuses a session for 30 minutes and rotates it afterwards', () => {
  const stored = {sessionId: '00000000-0000-4000-8000-000000000001', lastActivityAt: 1_000};
  assert.equal(resolveSessionState(stored, 1_000 + 29 * 60_000, seed).isNew, false);
  assert.equal(resolveSessionState(stored, 1_000 + 30 * 60_000 + 1, seed).isNew, true);
  assert.equal(INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS, 30 * 60 * 1000);
});

test('rejects malformed stored sessions and uses the injected session id', () => {
  const result = resolveSessionState({sessionId: 'not-a-uuid', lastActivityAt: 'old'}, 10_000, seed);

  assert.deepEqual(result, {
    sessionId: seed.sessionId,
    lastActivityAt: 10_000,
    isNew: true
  });
  assert.equal(INTERNAL_ANALYTICS_STORAGE_KEY, 'daeho_internal_analytics_session_v1');
});
