import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authLocaleForReturnTo,
  managedLoginParameters,
  normalizeLoginName,
  passwordPolicyIssues,
  registrationErrorMessage,
  usernamePolicyIssues
} from './auth-ui-core.mjs';

test('Korean account routes open Cognito managed login in Korean', () => {
  assert.equal(authLocaleForReturnTo('/ko/my-daeho'), 'ko');
  assert.equal(authLocaleForReturnTo('/ko/contact'), 'ko');
  assert.equal(authLocaleForReturnTo('/en/my-daeho'), 'en');
  assert.equal(authLocaleForReturnTo('https://evil.example/ko'), 'ko');
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

test('Korean registration errors never expose Cognito English provider messages', () => {
  assert.equal(
    registrationErrorMessage('ko', {
      type: 'InvalidPasswordException',
      message: 'Password did not conform with policy: Password must have symbol characters'
    }),
    '비밀번호는 8자 이상이며 영문 대문자, 소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.'
  );
  assert.equal(
    registrationErrorMessage('ko', {
      type: 'UsernameExistsException',
      message: 'User already exists'
    }),
    '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.'
  );
  assert.equal(
    registrationErrorMessage('ko', {
      type: 'UserLambdaValidationException',
      message: 'PreSignUp failed with error Registration grant is invalid or expired.'
    }),
    '휴대폰 인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.'
  );
  assert.equal(
    registrationErrorMessage('ko', {message: 'Internal Server Error'}),
    '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  );
});
