import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('login collects a chosen username before entering managed login', () => {
  const page = read('app/[locale]/(site)/login/page.tsx');
  const route = read('app/api/auth/login/route.ts');

  assert.match(page, /action="\/api\/auth\/login"/);
  assert.match(page, /name="loginHint"/);
  assert.match(page, /autoComplete="username"/);
  assert.match(page, /아이디/);
  assert.match(route, /managedLoginParameters/);
  assert.match(route, /loginHint/);
});

test('registration validates password policy locally and never renders Cognito English messages', () => {
  const form = read('components/customer/register-form.tsx');

  assert.match(form, /passwordPolicyIssues/);
  assert.match(form, /passwordPolicyMessage/);
  assert.match(form, /registrationErrorMessage/);
  assert.doesNotMatch(form, /setMessage\(signup\.message/);
  assert.match(form, /aria-describedby="registration-password-policy"/);
  assert.match(form, /usernamePolicyIssues/);
  assert.match(form, /Username: normalizedUsername/);
});
