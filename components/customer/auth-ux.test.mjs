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

test('username and password recovery stay inside the branded DAEHO experience', () => {
  const login = read('components/customer/login-form.tsx');
  const usernamePage = read('app/[locale]/(site)/recover-username/page.tsx');
  const usernameForm = read('components/customer/recover-username-form.tsx');
  const passwordPage = read('app/[locale]/(site)/reset-password/page.tsx');
  const passwordForm = read('components/customer/reset-password-form.tsx');
  const completeRoute = read('app/api/auth/recovery/password/[id]/complete/route.ts');
  const resetRoute = read('app/api/auth/recovery/password/reset/route.ts');

  assert.match(login, /copy\.recoverUsername/);
  assert.match(login, /copy\.resetPassword/);
  assert.match(usernamePage, /<RecoverUsernameForm/);
  assert.match(passwordPage, /<ResetPasswordForm/);
  assert.match(usernameForm, /fetch\('\/api\/auth\/recovery\/username'/);
  assert.match(passwordForm, /fetch\('\/api\/auth\/recovery\/password\/start'/);
  assert.match(passwordForm, /'idempotency-key': verificationOperationKey/);
  assert.match(completeRoute, /\{idempotency: true\}/);
  assert.match(usernameForm, /if \(!response\?\.ok\) \{\s*setMessage\(/);
  assert.match(
    passwordForm,
    /if \(!response\?\.ok \|\| !payload\.verificationId\) \{\s*return showError\(/
  );
  assert.match(passwordForm, /passwordPolicyIssues/);
  assert.doesNotMatch(usernameForm + passwordForm, /COGNITO_RECOVERY_FUNCTION_URL|CUSTOMER_INTERNAL_API_KEY/);
  assert.match(resetRoute, /createPasswordRecoveryOperation/);
  assert.match(resetRoute, /reservePasswordRecoveryGrant/);
  assert.match(resetRoute, /action: 'signOut'/);
  assert.match(resetRoute, /invalidatePasswordRecoverySessions/);
  assert.match(resetRoute, /action: 'setPassword'/);
  assert.match(resetRoute, /finalizePasswordRecoveryGrant/);
  assert.match(resetRoute, /signOut === 'definiteFailure'/);
  assert.doesNotMatch(passwordForm, /setPassword\(''\);\s*form\.reset\(\);\s*setWorking\(false\);/);
});

test('recovery SMS delivery commits its claim before contacting SOLAPI', () => {
  const worker = read('backend/customer/src/main/java/com/daeho/customer/service/AccountRecoveryDeliveryWorker.java');
  const store = read('backend/customer/src/main/java/com/daeho/customer/repository/JdbcCustomerRepository.java');
  const migration = read('backend/customer/src/main/resources/db/migration/V4__account_recovery.sql');

  assert.doesNotMatch(worker, /@Transactional\s+public void deliverNext/);
  assert.ok(worker.indexOf('inTransaction(this::claimNext)') < worker.indexOf('sender.send('));
  assert.ok(worker.indexOf('sender.send(') < worker.indexOf('attempts.markRecoverySent('));
  assert.match(store, /SET status = 'sending'/);
  assert.match(store, /WHERE id = \? AND status = 'sending'/);
  assert.match(migration, /'pending', 'sending', 'sent', 'delivery_unknown'/);
});
