import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('login is fully rendered by DAEHO and authenticates through the Cognito API', () => {
  const page = read('app/[locale]/(site)/login/page.tsx');
  const form = read('components/customer/login-form.tsx');
  const route = read('app/api/auth/login/route.ts');

  assert.match(page, /<LoginForm/);
  assert.match(form, /name="username"/);
  assert.match(form, /name="password"/);
  assert.match(form, /autoComplete="username"/);
  assert.match(form, /autoComplete="current-password"/);
  assert.match(form, /copy\.usernameLabel/);
  assert.match(form, /noValidate/);
  assert.match(form, /fetch\('\/api\/auth\/login'/);
  assert.match(route, /USER_PASSWORD_AUTH/);
  assert.match(route, /AWSCognitoIdentityProviderService\.InitiateAuth/);
  assert.match(route, /reserveLoginAttempt/);
  assert.doesNotMatch(route, /oauth2\/authorize/);
});

test('registration validates password policy locally and never renders Cognito English messages', () => {
  const form = read('components/customer/register-form.tsx');

  assert.match(form, /passwordPolicyIssues/);
  assert.match(form, /copy\.passwordRules/);
  assert.match(form, /registrationErrorCode/);
  assert.doesNotMatch(form, /setMessage\(signup\.message/);
  assert.match(form, /aria-describedby="registration-password-policy"/);
  assert.match(form, /usernamePolicyIssues/);
  assert.match(form, /Username: normalizedUsername/);
  assert.match(form, /noValidate/);
});

test('customer account copy lives in both locale message files', () => {
  for (const locale of ['ko', 'en']) {
    const messages = JSON.parse(read(`messages/${locale}.json`));
    assert.ok(messages.account.login.usernameLabel);
    assert.ok(messages.account.register.passwordRules.symbol);
    assert.ok(messages.account.dashboard.statuses.in_progress);
    assert.ok(messages.account.inquiryDetail.notFound);
  }
});
