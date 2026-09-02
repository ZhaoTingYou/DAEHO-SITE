import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authLocaleForReturnTo,
  loginErrorCode,
  managedLoginParameters,
  normalizeLoginName,
  passwordPolicyIssues,
  registrationErrorCode,
  usernamePolicyIssues
} from './auth-ui-core.mjs';

test('Korean account routes open Cognito managed login in Korean', () => {
  assert.equal(authLocaleForReturnTo('/ko/my-daeho'), 'ko');
  assert.equal(authLocaleForReturnTo('/ko/contact'), 'ko');
  assert.equal(authLocaleForReturnTo('/en/my-daeho'), 'en');
  assert.equal(authLocaleForReturnTo('https://evil.example/ko'), 'ko');
});

test('login provider failures map to safe localized-copy keys', () => {
  assert.equal(loginErrorCode({type: 'NotAuthorizedException'}), 'invalidCredentials');
  assert.equal(loginErrorCode({type: 'UserNotFoundException'}), 'invalidCredentials');
  assert.equal(loginErrorCode({type: 'PasswordResetRequiredException'}), 'resetRequired');
  assert.equal(loginErrorCode({type: 'TooManyRequestsException'}), 'rateLimit');
  assert.equal(loginErrorCode({type: 'UnexpectedProviderError'}), 'generic');
});

test('managed login parameters localize the page and carry only a normalized username hint', () => {
  assert.deepEqual(
    managedLoginParameters({
      clientId: 'client-id',
      redirectUri: 'https://daeho.works/api/auth/callback',
      returnTo: '/ko/my-daeho',
      state: 'state',
      nonce: 'nonce',
      challenge: 'challenge',
      loginHint: '  Daeho.Member  ',
      reauth: true
    }),
    {
      response_type: 'code',
      client_id: 'client-id',
      redirect_uri: 'https://daeho.works/api/auth/callback',
      scope: 'openid email phone',
      state: 'state',
      nonce: 'nonce',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      lang: 'ko',
      login_hint: 'daeho.member',
      prompt: 'login'
    }
  );
});

test('login names are case-normalized and reject phone numbers or unsafe values', () => {
  assert.equal(normalizeLoginName('  Daeho.Member  '), 'daeho.member');
  assert.equal(normalizeLoginName('01092070465'), '');
  assert.equal(normalizeLoginName('ab'), '');
  assert.equal(normalizeLoginName('member name'), '');
  assert.deepEqual(usernamePolicyIssues('daeho_member'), []);
  assert.deepEqual(usernamePolicyIssues('01092070465'), ['startsWithLetter']);
});

test('password policy reports every missing Cognito requirement before sign-up', () => {
  assert.deepEqual(passwordPolicyIssues('abcdefgh'), ['uppercase', 'number', 'symbol']);
  assert.deepEqual(passwordPolicyIssues('Abcdefg1'), ['symbol']);
  assert.deepEqual(passwordPolicyIssues('Abcdef1!'), []);
});

test('registration errors map provider failures to stable localized-copy keys', () => {
  assert.equal(
    registrationErrorCode({
      type: 'InvalidPasswordException',
      message: 'Password did not conform with policy: Password must have symbol characters'
    }),
    'invalidPassword'
  );
  assert.equal(
    registrationErrorCode({
      type: 'UsernameExistsException',
      message: 'User already exists'
    }),
    'usernameExists'
  );
  assert.equal(
    registrationErrorCode({
      type: 'UserLambdaValidationException',
      message: 'PreSignUp failed with error Registration grant is invalid or expired.'
    }),
    'expiredGrant'
  );
  assert.equal(
    registrationErrorCode({
      type: 'UserLambdaValidationException',
      message: 'PreSignUp failed with error DAEHO_DUPLICATE_PHONE'
    }),
    'duplicatePhone'
  );
  assert.equal(
    registrationErrorCode({message: 'Internal Server Error'}),
    'generic'
  );
});
