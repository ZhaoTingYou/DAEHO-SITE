import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function loadAdminIpAllowlist() {
  const sourcePath = path.join(repoRoot, 'lib/cms/admin-ip-allowlist.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}, process};

  vm.runInNewContext(compiled, sandbox, {filename: sourcePath});
  return sandbox.module.exports;
}

function headers(values) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));

  return {
    get(name) {
      return normalized.get(name.toLowerCase()) ?? null;
    }
  };
}

test('admin IP allowlist stays open when no allowed IPs are configured', () => {
  const {isAdminIpAllowed} = loadAdminIpAllowlist();

  assert.equal(isAdminIpAllowed(headers({}), ''), true);
  assert.equal(isAdminIpAllowed(headers({'x-forwarded-for': '203.0.113.9'}), '   '), true);
});

test('admin IP allowlist supports exact IPv4 values and CIDR ranges', () => {
  const {isAdminIpAllowed} = loadAdminIpAllowlist();
  const config = '203.0.113.10/32, 198.51.100.0/24';

  assert.equal(isAdminIpAllowed(headers({'x-forwarded-for': '203.0.113.10'}), '203.0.113.10'), true);
  assert.equal(isAdminIpAllowed(headers({'x-forwarded-for': '203.0.113.10'}), config), true);
  assert.equal(isAdminIpAllowed(headers({'x-forwarded-for': '198.51.100.88'}), config), true);
  assert.equal(isAdminIpAllowed(headers({'x-forwarded-for': '198.51.101.1'}), config), false);
});

test('admin IP allowlist uses cf-connecting-ip before forwarded and real IP headers', () => {
  const {getClientIpFromHeaders, isAdminIpAllowed} = loadAdminIpAllowlist();
  const requestHeaders = headers({
    'cf-connecting-ip': '203.0.113.10',
    'x-forwarded-for': '198.51.100.88, 10.0.0.5',
    'x-real-ip': '192.0.2.44'
  });

  assert.equal(getClientIpFromHeaders(requestHeaders), '203.0.113.10');
  assert.equal(isAdminIpAllowed(requestHeaders, '203.0.113.10/32'), true);
  assert.equal(isAdminIpAllowed(requestHeaders, '198.51.100.0/24'), false);
});

test('admin IP allowlist trusts the Nginx-overwritten client IP before spoofable headers', () => {
  const {getClientIpFromHeaders, isAdminIpAllowed} = loadAdminIpAllowlist();
  const requestHeaders = headers({
    'x-daeho-client-ip': '192.0.2.44',
    'cf-connecting-ip': '203.0.113.10',
    'x-forwarded-for': '203.0.113.10'
  });

  assert.equal(getClientIpFromHeaders(requestHeaders), '192.0.2.44');
  assert.equal(isAdminIpAllowed(requestHeaders, '192.0.2.44/32'), true);
  assert.equal(isAdminIpAllowed(requestHeaders, '203.0.113.10/32'), false);
});

test('admin protected paths cover admin UI and API routes only', () => {
  const {isAdminProtectedPath} = loadAdminIpAllowlist();

  assert.equal(isAdminProtectedPath('/admin'), true);
  assert.equal(isAdminProtectedPath('/admin/login'), true);
  assert.equal(isAdminProtectedPath('/api/admin/locale'), true);
  assert.equal(isAdminProtectedPath('/api/admin/news/1'), true);
  assert.equal(isAdminProtectedPath('/administrator'), false);
  assert.equal(isAdminProtectedPath('/api/cms/pages'), false);
});

test('Next proxy includes admin API routes in the allowlist gate', () => {
  const source = readFileSync(path.join(repoRoot, 'proxy.ts'), 'utf8');

  assert.match(source, /isAdminIpAllowed/);
  assert.match(source, /isAdminProtectedPath/);
  assert.match(source, /'\/api\/admin\/:path\*'/);
  assert.ok(
    source.indexOf('isAdminProtectedPath(request.nextUrl.pathname)') <
      source.indexOf("request.nextUrl.pathname === '/'"),
    'admin allowlist check should run before normal site routing'
  );
});

test('Nginx overwrites the internal client IP header before proxying to Next', () => {
  for (const [configPath, expectedCount] of [
    ['docker/nginx/default.conf', 1],
    ['docker/nginx/https.conf', 2]
  ]) {
    const source = readFileSync(path.join(repoRoot, configPath), 'utf8');
    const matches = source.match(/proxy_set_header X-Daeho-Client-IP \$remote_addr;/g) ?? [];

    assert.equal(matches.length, expectedCount, configPath);
  }
});
