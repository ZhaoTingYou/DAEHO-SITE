import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {createSignedAdminSession} from '../../../../lib/cms/admin-session-core.mjs';

const projectRoot = fileURLToPath(new URL('../../../..', import.meta.url));
const owner = identity('00000000-0000-4000-8000-000000000001', 'owner@example.com', 'OWNER');
const editor = identity('00000000-0000-4000-8000-000000000002', 'editor@example.com', 'EDITOR');
const firstLoginEditor = {...editor, id: '00000000-0000-4000-8000-000000000003', mustChangePassword: true};

test('editor capabilities are enforced before restricted backend calls', {timeout: 60_000}, async (t) => {
  const backendCalls = [];
  const sessionSecret = 'capability-session-secret';
  const adminApiKey = 'capability-admin-key';
  const identities = new Map([owner, editor, firstLoginEditor].map((item) => [item.id, item]));
  const backend = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.method === 'POST' && request.url === '/api/admin/auth/session') {
      const body = JSON.parse(await readBody(request));
      const current = identities.get(body.userId);
      if (current && current.sessionVersion === body.sessionVersion) {
        response.end(JSON.stringify({user: current}));
      } else {
        response.statusCode = 401;
        response.end(JSON.stringify({error: 'Invalid session'}));
      }
      return;
    }

    backendCalls.push(`${request.method} ${request.url}`);
    if (request.method === 'GET' && request.url === '/api/admin/pages') {
      response.end(JSON.stringify({items: []}));
      return;
    }
    if (request.method === 'PUT' && request.url === '/api/admin/pages/home') {
      response.end(JSON.stringify({page: {pageKey: 'home', section: 'site', sortOrder: 0}}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/news') {
      response.end(JSON.stringify({items: []}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/collections') {
      response.end(JSON.stringify({items: []}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/media') {
      response.end(JSON.stringify({items: []}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/inquiries') {
      response.end(JSON.stringify({items: []}));
      return;
    }
    if (request.method === 'PATCH' && request.url === '/api/admin/inquiries/test-inquiry') {
      response.end(JSON.stringify({inquiry: {id: 'test-inquiry', status: 'contacted'}}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/notifications/settings') {
      response.end(JSON.stringify({settings: {}}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/status') {
      response.end(JSON.stringify({checkedAt: new Date().toISOString()}));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/admin/export') {
      response.end(JSON.stringify({exportedAt: new Date().toISOString(), pages: [], news: [], collections: [], media: []}));
      return;
    }
    if (request.method === 'DELETE' && /^\/api\/admin\/(news|collections|media)\//.test(request.url)) {
      response.end(JSON.stringify({ok: true}));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({error: 'Not found'}));
  });
  await listen(backend);
  t.after(() => closeServer(backend));

  const backendAddress = backend.address();
  assert.ok(backendAddress && typeof backendAddress !== 'string');
  const nextPort = await findFreePort();
  const nextProcess = spawn(process.execPath, [
    'node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', String(nextPort)
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      CMS_ADMIN_API_KEY: adminApiKey,
      CMS_ADMIN_SESSION_SECRET: sessionSecret,
      CMS_BACKEND_API_KEY: adminApiKey,
      CMS_BACKEND_URL: `http://127.0.0.1:${backendAddress.port}`,
      CMS_PREVIEW_STATIC: 'false',
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${nextPort}`,
      NEXT_TELEMETRY_DISABLED: '1'
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const processOutput = [];
  nextProcess.stdout.on('data', (chunk) => processOutput.push(chunk.toString()));
  nextProcess.stderr.on('data', (chunk) => processOutput.push(chunk.toString()));
  t.after(() => stopProcess(nextProcess));

  const baseUrl = `http://127.0.0.1:${nextPort}`;
  await waitForNext(baseUrl, nextProcess, processOutput);
  const editorCookie = apiCookie(editor, sessionSecret);
  const ownerCookie = apiCookie(owner, sessionSecret);
  const editorCases = [
    ['GET', '/api/admin/pages', 200, undefined],
    ['PUT', '/api/admin/pages/home', 200, {section: 'site'}],
    ['GET', '/api/admin/inquiries', 403, undefined],
    ['PATCH', '/api/admin/inquiries/test-inquiry', 403, {status: 'contacted'}],
    ['GET', '/api/admin/notifications/settings', 403, undefined],
    ['GET', '/api/admin/status', 403, undefined],
    ['GET', '/api/admin/export', 403, undefined],
    ['DELETE', '/api/admin/news/news-1', 403, undefined],
    ['DELETE', '/api/admin/collections/collection-1', 403, undefined],
    ['DELETE', '/api/admin/media/media-1', 403, undefined]
  ];

  for (const [method, pathname, expectedStatus, body] of editorCases) {
    const before = backendCalls.length;
    const response = await apiRequest(baseUrl, editorCookie, method, pathname, body);
    assert.equal(response.status, expectedStatus, `${method} ${pathname}`);
    if (expectedStatus === 403) {
      assert.equal(backendCalls.length, before, `${pathname} must not reach Spring`);
    }
  }

  for (const [method, pathname, body] of [
    ['GET', '/api/admin/inquiries', undefined],
    ['DELETE', '/api/admin/news/news-1', undefined]
  ]) {
    const response = await apiRequest(baseUrl, ownerCookie, method, pathname, body);
    assert.equal(response.status, 200, `owner ${method} ${pathname}`);
  }

  const crossSite = await fetch(`${baseUrl}/api/admin/pages/home`, {
    method: 'PUT',
    headers: {'content-type': 'application/json', cookie: editorCookie, origin: 'https://attacker.example'},
    body: JSON.stringify({section: 'site'})
  });
  assert.equal(crossSite.status, 403);

  const firstLoginValue = createSignedAdminSession(firstLoginEditor, sessionSecret, Date.now());
  const firstLoginUiCookie = `daeho_admin_session=${firstLoginValue}`;
  const account = await fetch(`${baseUrl}/admin/account`, {headers: {cookie: firstLoginUiCookie}});
  assert.equal(account.status, 200);

  for (const pathname of ['/admin', '/admin/news']) {
    const before = backendCalls.length;
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: {cookie: firstLoginUiCookie},
      redirect: 'manual'
    });
    assert.ok([302, 303, 307, 308].includes(response.status), pathname);
    assert.match(response.headers.get('location') ?? '', /\/admin\/account\?required=1/);
    assert.equal(backendCalls.length, before, `${pathname} must redirect before loading content`);
  }

  const firstLoginApi = await apiRequest(
    baseUrl,
    `daeho_admin_api_session=${firstLoginValue}`,
    'GET',
    '/api/admin/pages'
  );
  assert.equal(firstLoginApi.status, 403);
});

function identity(id, email, role) {
  return {id, email, role, sessionVersion: 1, expiresAt: null, mustChangePassword: false};
}

function apiCookie(currentIdentity, secret) {
  return `daeho_admin_api_session=${createSignedAdminSession(currentIdentity, secret, Date.now())}`;
}

function apiRequest(baseUrl, cookie, method, pathname, body) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body === undefined ? {} : {'content-type': 'application/json'}),
      cookie,
      origin: baseUrl
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function waitForNext(baseUrl, nextProcess, processOutput) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (nextProcess.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready:\n${processOutput.join('')}`);
    }
    try {
      const response = await fetch(`${baseUrl}/admin/login`);
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Next.js did not become ready:\n${processOutput.join('')}`);
}

async function findFreePort() {
  const server = net.createServer();
  await listen(server);
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const {port} = address;
  await closeServer(server);
  return port;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function stopProcess(child) {
  if (!child.pid) return;
  signalProcessGroup(child.pid, 'SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (processGroupExists(child.pid)) signalProcessGroup(child.pid, 'SIGKILL');
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
}
