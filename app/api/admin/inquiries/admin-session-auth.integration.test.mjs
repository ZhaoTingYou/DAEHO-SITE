import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHmac} from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {createSignedAdminSession} from '../../../../lib/cms/admin-session-core.mjs';

const projectRoot = fileURLToPath(new URL('../../../..', import.meta.url));

test('a signed CMS browser session can preview and update an inquiry status', {timeout: 60_000}, async (t) => {
  const passwordVersion = 'test-password-version';
  const sessionSecret = 'test-session-secret';
  const adminApiKey = 'test-admin-api-key';
  const identity = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'owner@example.com',
    role: 'OWNER',
    sessionVersion: 1,
    expiresAt: null,
    mustChangePassword: false
  };
  const backend = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');

    if (request.method === 'POST' && request.url === '/api/admin/auth/session') {
      const body = JSON.parse(await readBody(request));
      if (body.userId === identity.id && body.sessionVersion === identity.sessionVersion) {
        response.end(JSON.stringify({user: identity}));
      } else {
        response.statusCode = 401;
        response.end(JSON.stringify({error: 'CMS session is no longer valid.'}));
      }
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/admin/inquiries/test-inquiry/status-preview'
    ) {
      response.end(JSON.stringify({
        changed: true,
        previousStatus: 'new',
        nextStatus: 'contacted',
        notifications: []
      }));
      return;
    }

    if (
      request.method === 'PATCH' &&
      request.url === '/api/admin/inquiries/test-inquiry'
    ) {
      response.end(JSON.stringify({
        inquiry: {id: 'test-inquiry', status: 'contacted'},
        statusEvents: [],
        notificationJobs: [],
        notificationAttempts: []
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
        CMS_ADMIN_PASSWORD: 'test-admin-password',
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
  const sessionValue = createSignedAdminSession(identity, sessionSecret, Date.now());

  const endpoint = `${baseUrl}/api/admin/inquiries/test-inquiry/status-preview`;
  const payload = JSON.stringify({status: 'contacted', expectedStatus: 'new'});
  const unauthenticated = await fetch(endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: payload
  });
  assert.equal(unauthenticated.status, 401);

  const apiKeyResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': adminApiKey
    },
    body: payload
  });
  assert.equal(apiKeyResponse.status, 200);

  const sessionResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `daeho_admin_api_session=${sessionValue}`,
      origin: baseUrl
    },
    body: payload
  });
  assert.equal(
    sessionResponse.status,
    200,
    `Expected a valid browser session to be authorized, received ${sessionResponse.status}`
  );
  assert.equal((await sessionResponse.json()).nextStatus, 'contacted');

  const updateResponse = await fetch(
    `${baseUrl}/api/admin/inquiries/test-inquiry`,
    {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `daeho_admin_api_session=${sessionValue}`,
        origin: baseUrl
      },
      body: payload
    }
  );
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).inquiry.status, 'contacted');

  const crossSiteSessionResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `daeho_admin_api_session=${sessionValue}`,
      origin: 'https://attacker.example'
    },
    body: payload
  });
  assert.equal(crossSiteSessionResponse.status, 403);

  const uiOnlySessionResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `daeho_admin_session=${sessionValue}`,
      origin: baseUrl
    },
    body: payload
  });
  assert.equal(uiOnlySessionResponse.status, 401);

  const legacySessionValue = createLegacySessionValue(passwordVersion, sessionSecret);
  const unauthenticatedRecoveryResponse = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {origin: baseUrl}
  });
  assert.equal(unauthenticatedRecoveryResponse.status, 401);

  const crossSiteRecoveryResponse = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {
      cookie: `daeho_admin_session=${legacySessionValue}`,
      origin: 'https://attacker.example'
    }
  });
  assert.equal(crossSiteRecoveryResponse.status, 403);

  const recoveryResponse = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {
      cookie: `daeho_admin_session=${sessionValue}`,
      origin: baseUrl
    }
  });
  assert.equal(
    recoveryResponse.status,
    204,
    'A still-valid role CMS UI session should restore its API session without another login'
  );

  const recoveredSetCookie = recoveryResponse.headers.get('set-cookie') ?? '';
  assert.match(recoveredSetCookie, /^daeho_admin_api_session=/);
  assert.match(recoveredSetCookie, /Path=\/api\/admin/);

  const recoveredApiCookie = recoveredSetCookie.split(';', 1)[0];
  const recoveredSessionResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: recoveredApiCookie,
      origin: baseUrl
    },
    body: payload
  });
  assert.equal(recoveredSessionResponse.status, 200);

  const legacyRecoveryResponse = await fetch(`${baseUrl}/admin/api-session`, {
    method: 'POST',
    headers: {
      cookie: `daeho_admin_session=${legacySessionValue}`,
      origin: baseUrl
    }
  });
  assert.equal(legacyRecoveryResponse.status, 401);
});

function createLegacySessionValue(passwordVersion, sessionSecret) {
  const issuedAt = Date.now().toString();
  const versionToken = Buffer.from(passwordVersion, 'utf8').toString('base64url');
  const signature = createHmac('sha256', sessionSecret)
    .update(`${issuedAt}.${versionToken}`)
    .digest('hex');
  return `${issuedAt}.${versionToken}.${signature}`;
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
