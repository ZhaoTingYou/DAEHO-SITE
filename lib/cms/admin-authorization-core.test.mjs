import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminCapabilities,
  generateTemporaryAdminPassword,
  hasAdminCapability,
  isPasswordChangeOnlyPath,
  normalizeAdminEmail
} from './admin-authorization-core.mjs';

test('editor receives content-write but never destructive or private capabilities', () => {
  assert.equal(hasAdminCapability('EDITOR', 'content:read'), true);
  assert.equal(hasAdminCapability('EDITOR', 'content:write'), true);
  assert.equal(hasAdminCapability('EDITOR', 'content:delete'), false);
  assert.equal(hasAdminCapability('EDITOR', 'inquiries:read'), false);
  assert.equal(hasAdminCapability('EDITOR', 'inquiries:write'), false);
  assert.equal(hasAdminCapability('EDITOR', 'analytics:read'), false);
  assert.equal(hasAdminCapability('EDITOR', 'notifications:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'system:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'users:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'account:self'), true);
});

test('owner receives every declared capability', () => {
  const literalCapabilities = [
    'content:read',
    'content:write',
    'content:delete',
    'inquiries:read',
    'inquiries:write',
    'analytics:read',
    'notifications:manage',
    'system:manage',
    'users:manage',
    'account:self'
  ];

  assert.deepEqual(adminCapabilities, literalCapabilities);
  for (const capability of literalCapabilities) {
    assert.equal(hasAdminCapability('OWNER', capability), true, capability);
  }
});

test('normalizes administrator emails with trim plus lowercase', () => {
  assert.equal(normalizeAdminEmail('  LOCALOCA.MASTER@GMAIL.COM  '), 'localoca.master@gmail.com');
  assert.equal(normalizeAdminEmail(null), '');
  assert.equal(normalizeAdminEmail(42), '');
});

test('first-login identities can reach only password change, session restore, and logout paths', () => {
  const allowed = [
    '/admin/account',
    '/admin/api-session',
    '/admin/logout',
    '/api/admin/auth/session',
    '/api/admin/auth/change-own-password'
  ];
  const denied = [
    '/admin',
    '/admin/news',
    '/admin/users',
    '/api/admin/news',
    '/api/admin/users'
  ];

  for (const pathname of allowed) {
    assert.equal(isPasswordChangeOnlyPath(pathname), true, pathname);
  }
  for (const pathname of denied) {
    assert.equal(isPasswordChangeOnlyPath(pathname), false, pathname);
  }
});

test('temporary passwords satisfy the CMS password policy', () => {
  for (let index = 0; index < 100; index += 1) {
    const password = generateTemporaryAdminPassword();
    assert.ok(password.length >= 20);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[^A-Za-z0-9]/);
    assert.doesNotMatch(password, /\s/);
  }
});
