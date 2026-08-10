import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  createAdminUserErrorState,
  createAdminUserIdleState,
  createAdminUserSuccessState
} from '../../lib/cms/admin-user-action-core.mjs';

const user = {
  id: 'editor-1',
  email: 'editor@example.com',
  role: 'EDITOR',
  status: 'active',
  sessionVersion: 1,
  expiresAt: '2026-09-09T00:00:00Z',
  mustChangePassword: true,
  lastLoginAt: null,
  createdAt: '2026-08-10T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z'
};

test('create and reset success expose a temporary password only in immediate action state', () => {
  const created = createAdminUserSuccessState('users.created', user, 'Temp-Editor-Passw0rd!');
  const reset = createAdminUserSuccessState('users.reset', user, 'Reset-Editor-Passw0rd!');

  assert.equal(created.status, 'success');
  assert.equal(created.temporaryPassword, 'Temp-Editor-Passw0rd!');
  assert.equal(reset.temporaryPassword, 'Reset-Editor-Passw0rd!');
  assert.equal(created.user, user);
});

test('status and expiration success never invent a temporary password', () => {
  const status = createAdminUserSuccessState('users.statusUpdated', user);
  const expiration = createAdminUserSuccessState('users.expirationUpdated', user);

  assert.equal('temporaryPassword' in status, false);
  assert.equal('temporaryPassword' in expiration, false);
});

test('errors and fresh idle state cannot retain submitted or previous passwords', () => {
  const previous = createAdminUserSuccessState('users.created', user, 'Temp-Editor-Passw0rd!');
  const error = createAdminUserErrorState('users.error');
  const fresh = createAdminUserIdleState();

  assert.equal(JSON.stringify(error).includes(previous.temporaryPassword), false);
  assert.equal('temporaryPassword' in error, false);
  assert.equal('temporaryPassword' in fresh, false);
  assert.deepEqual(fresh, {status: 'idle', messageKey: ''});
});

test('manager renders one-time temporary passwords in a selectable read-only field', () => {
  const source = readFileSync(
    new URL('./_components/admin-users-manager.tsx', import.meta.url),
    'utf8'
  );

  assert.match(source, /state\.temporaryPassword/);
  assert.match(source, /readOnly/);
  assert.match(source, /select\(\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
