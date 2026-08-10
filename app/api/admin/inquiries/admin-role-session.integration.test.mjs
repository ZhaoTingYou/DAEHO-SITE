import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {createSignedAdminSession} from '../../../../lib/cms/admin-session-core.mjs';

const projectRoot = fileURLToPath(new URL('../../../..', import.meta.url));
const ownerIdentity = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'owner@example.com',
  role: 'OWNER',
  sessionVersion: 1,
  expiresAt: null,
  mustChangePassword: false
};

test('role session renders admin pages, restores API cookie, and rejects stale versions', {timeout: 60_000}, async (t) => {
  const sessionSecret = 'test-role-session-secret';
  const adminApiKey = 'test-admin-api-key';
  const backend = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');

    if (request.method === 'POST' && request.url === '/api/admin/auth/session') {
      const body = JSON.parse(await readBody(request));
      if (body.userId === ownerIdentity.id && body.sessionVersion === ownerIdentity.sessionVersion) {
        response.end(JSON.stringify({user: ownerIdentity}));
      } else {
        response.statusCode = 401;
        response.end(JSON.stringify({error: 'CMS session is no longer valid.'}));
      }
      return;
    }

    if (request.method === 'GET' && [
      '/api/admin/inquiries',
      '/api/admin/news',
      '/api/admin/collections',
      '/api/admin/media',
      '/api/admin/pages'
    ].includes(request.url)) {
      response.end(JSON.stringify({items: []}));
      return;
    }

    if (request.method === 'GET' && request.url === '/api/admin/status') {
      response.end(JSON.stringify({
        checkedAt: new Date().toISOString(),
        database: {path: 'postgresql'},
        environment: {persistence: 'configured'},
        security: {},
        email: {configured: false, hasSmtpHost: false, hasSender: false, hasRecipient: false, hasSmtpAuth: false},
        latest: {inquiryCreatedAt: '', notificationJobCreatedAt: ''},
        tables: []
      }));
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
  const nextProcess = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', String(nextPort)],
    {
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
    }
  );
  const processOutput = [];
  nextProcess.stdout.on('data', (chunk) => processOutput.push(chunk.toString()));
  nextProcess.stderr.on('data', (chunk) => processOutput.push(chunk.toString()));
  t.after(() => stopProcess(nextProcess));

  const baseUrl = `http://127.0.0.1:${nextPort}`;
  await waitForNext(baseUrl, nextProcess, processOutput);
  const validValue = createSignedAdminSession(ownerIdentity, sessionSecret, Date.now());
  const ownerCookies = `daeho_admin_session=${validValue}; daeho_admin_api_session=${validValue}`;

  assert.equal((await fetch(`${baseUrl}/admin`, {headers: {cookie: ownerCookies}})).status, 200);
  assert.equal((await fetch(`${baseUrl}/admin/account`, {headers: {cookie: ownerCookies}})).status, 200);

  const recovery = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {cookie: `daeho_admin_session=${validValue}`, origin: baseUrl}
  });
  assert.equal(recovery.status, 204);
  assert.match(recovery.headers.get('set-cookie') ?? '', /^daeho_admin_api_session=/);

  const staleValue = createSignedAdminSession(
    {...ownerIdentity, sessionVersion: 2},
    sessionSecret,
    Date.now()
  );
  const stalePage = await fetch(`${baseUrl}/admin/account`, {
    headers: {cookie: `daeho_admin_session=${staleValue}`},
    redirect: 'manual'
  });
  assert.ok([302, 303, 307, 308].includes(stalePage.status));
  assert.match(stalePage.headers.get('location') ?? '', /\/admin\/login/);

  const staleRecovery = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {cookie: `daeho_admin_session=${staleValue}`, origin: baseUrl}
  });
  assert.equal(staleRecovery.status, 401);
});

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
      // The dev server has not opened its listener yet.
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
  if (processGroupExists(child.pid)) {
    signalProcessGroup(child.pid, 'SIGKILL');
  }
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
