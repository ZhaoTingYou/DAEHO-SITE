import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('customer management exposes audited CMS controls for both rollout stages', () => {
  const editor = read('app/admin/_components/customer-operations.tsx');
  const route = read('app/api/admin/customer/account-features/route.ts');

  assert.match(editor, /customerAccountsEnabled/);
  assert.match(editor, /inquiryAccountRequired/);
  assert.match(editor, /\/api\/admin\/customer\/account-features/);
  assert.match(editor, /method:\s*'PUT'/);
  assert.match(route, /users:manage/);
  assert.match(route, /x-admin-user-id/);
});

test('public login, registration, SMS and inquiry enforcement use CMS runtime settings', () => {
  const guardedPaths = [
    'app/api/auth/session/route.ts',
    'app/api/auth/login/route.ts',
    'app/api/auth/register/route.ts',
    'app/api/customer/verifications/sms/start/route.ts',
    'app/api/customer/verifications/sms/[id]/complete/route.ts',
    'app/api/inquiries/contact/route.ts',
    'app/api/inquiries/golf/route.ts'
  ];

  for (const relativePath of guardedPaths) {
    assert.match(read(relativePath), /accountFeatureSettings|accountsEnabled/);
  }
  assert.doesNotMatch(read('app/api/auth/session/route.ts'), /INQUIRY_ACCOUNT_REQUIRED/);
  assert.doesNotMatch(read('app/api/inquiries/contact/route.ts'), /INQUIRY_ACCOUNT_REQUIRED/);
  assert.doesNotMatch(read('app/api/inquiries/golf/route.ts'), /INQUIRY_ACCOUNT_REQUIRED/);
  assert.match(read('app/[locale]/(site)/login/page.tsx'), /dynamic = 'force-dynamic'/);
  assert.match(read('app/[locale]/(site)/register/page.tsx'), /dynamic = 'force-dynamic'/);
  assert.match(read('app/[locale]/(site)/login/page.tsx'), /await connection\(\)/);
  assert.match(read('app/[locale]/(site)/register/page.tsx'), /await connection\(\)/);
});

test('turning customer accounts off blocks retained sessions from every MY DAEHO surface', () => {
  const protectedPaths = [
    'app/[locale]/(site)/my-daeho/page.tsx',
    'app/api/customer/me/route.ts',
    'app/api/customer/inquiries/route.ts',
    'app/api/customer/inquiries/[id]/route.ts',
    'app/api/customer/legacy-claims/route.ts',
    'app/api/customer/logout-all/route.ts'
  ];

  for (const relativePath of protectedPaths) {
    assert.match(read(relativePath), /accountsEnabled/);
  }
  assert.doesNotMatch(read('app/api/auth/logout/route.ts'), /accountsEnabled/);
});

test('runtime feature lookup times out quickly before applying its safe fallback', () => {
  const repositories = read('lib/cms/repositories.ts');

  assert.match(repositories, /timeoutMs:\s*1_500/);
  assert.match(repositories, /AbortSignal\.timeout\(options\.timeoutMs\)/);
});

test('customer API routes bypass locale redirects after the infrastructure gate', () => {
  const proxy = read('proxy.ts');

  assert.match(proxy, /pathname\.startsWith\('\/api\/customer\/'\)[\s\S]*?NextResponse\.next\(\)/);
});
