import assert from 'node:assert/strict';
import test from 'node:test';

import {
  profileProvisioningRequest,
  createLoginTransaction,
  decryptSession,
  decryptRegistrationTransaction,
  encryptSession,
  encryptRegistrationTransaction,
  sanitizeReturnTo,
  verifyLoginTransaction
} from './auth-cookie-core.mjs';

const secret = 'test-auth-session-secret-with-at-least-thirty-two-characters';

test('only local site paths can be used after authentication', () => {
  assert.equal(sanitizeReturnTo('/ko/my-daeho?tab=profile'), '/ko/my-daeho?tab=profile');
  assert.equal(sanitizeReturnTo('https://evil.example/steal'), '/ko/my-daeho');
  assert.equal(sanitizeReturnTo('//evil.example/steal'), '/ko/my-daeho');
  assert.equal(sanitizeReturnTo('/\\evil.example/steal'), '/ko/my-daeho');
});

test('profile provisioning is bound to the Cognito-verified Korean phone', () => {
  assert.deepEqual(
    profileProvisioningRequest('cognito-sub', {
      phone_number: '+821012345678',
      phone_number_verified: true,
      registrationGrant: 'must-not-be-used-for-provisioning'
    }),
    {
      path: '/v1/internal/profiles/from-authenticated-phone',
      body: {subject: 'cognito-sub', phone: '+821012345678'}
    }
  );
  assert.equal(profileProvisioningRequest('cognito-sub', {
    phone_number: '+821012345678',
    phone_number_verified: false
  }), null);
  assert.equal(profileProvisioningRequest('cognito-sub', {
    phone_number: '+15551234567',
    phone_number_verified: true
  }), null);
});

test('registration grants are encrypted and expire after fifteen minutes', () => {
  const grant = 'registration-grant-with-more-than-thirty-two-characters';
  const encrypted = encryptRegistrationTransaction(grant, secret, 1000);

  assert.equal(encrypted.includes(grant), false);
  assert.equal(decryptRegistrationTransaction(encrypted, secret, 1899)?.registrationGrant, grant);
  assert.equal(decryptRegistrationTransaction(encrypted, secret, 1901), null);
});

test('login transactions bind PKCE verifier, state and return path', () => {
  const transaction = createLoginTransaction({returnTo: '/en/contact', now: 1_000});
  const cookie = transaction.cookieValue(secret);

  assert.equal(verifyLoginTransaction(cookie, transaction.state, secret, 1_001)?.returnTo, '/en/contact');
  assert.equal(verifyLoginTransaction(cookie, 'wrong-state', secret, 1_001), null);
  assert.equal(verifyLoginTransaction(cookie, transaction.state, secret, 1_000 + 601), null);
  assert.match(transaction.nonce, /^[A-Za-z0-9_-]{20,}$/);
  assert.equal(verifyLoginTransaction(cookie, transaction.state, secret, 1_001)?.nonce, transaction.nonce);
});

test('session tokens are encrypted and expire at the absolute deadline', () => {
  const value = encryptSession({accessToken: 'secret-access-token', expiresAt: 2_000}, secret);

  assert.doesNotMatch(value, /secret-access-token/);
  assert.equal(decryptSession(value, secret, 1_999)?.accessToken, 'secret-access-token');
  assert.equal(decryptSession(value, secret, 2_001), null);
  assert.equal(decryptSession(`${value}tampered`, secret, 1_999), null);
});
