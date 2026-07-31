import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./admin-session.ts', import.meta.url), 'utf8');

test('admin session cookie is not forced to Secure for local HTTP production containers', () => {
  assert.match(source, /secure: shouldUseSecureAdminCookie\(\)/);
  assert.match(source, /function shouldUseSecureAdminCookie\(\)/);
  assert.match(source, /CMS_ADMIN_COOKIE_SECURE/);
  assert.match(source, /NEXT_PUBLIC_SITE_URL/);
  assert.match(source, /localhost|127\\.0\\.0\\.1|\\[::1\\]/);
});

test('admin UI and API sessions use separate least-privilege cookie paths', () => {
  assert.match(source, /const adminSessionCookiePath = '\/admin';/);
  assert.match(source, /const adminApiSessionCookiePath = '\/api\/admin';/);
  assert.match(source, /path: adminSessionCookiePath/);
  assert.match(source, /path: adminApiSessionCookiePath/);

  const clearSessionStart = source.indexOf('export async function clearAdminSession');
  assert.notEqual(clearSessionStart, -1, 'clearAdminSession should exist');

  const clearSessionSource = source.slice(clearSessionStart, source.indexOf('\n}\n', clearSessionStart) + 3);
  assert.match(clearSessionSource, /cookieStore\.set\(adminSessionCookie, ''/);
  assert.match(clearSessionSource, /cookieStore\.set\(adminApiSessionCookie, ''/);
  assert.match(clearSessionSource, /path: adminSessionCookiePath/);
  assert.match(clearSessionSource, /path: adminApiSessionCookiePath/);
  assert.match(clearSessionSource, /maxAge: 0/);
  assert.match(clearSessionSource, /expires: new Date\(0\)/);
});
