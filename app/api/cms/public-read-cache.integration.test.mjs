import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {createSignedAdminSession} from '../../../lib/cms/admin-session-core.mjs';

const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
const ownerIdentity = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'owner@example.com',
  role: 'OWNER',
  sessionVersion: 1,
  expiresAt: null,
  mustChangePassword: false
};

test('public CMS reads are cached while failed responses are retried', {timeout: 60_000}, async (t) => {
  const backendCalls = new Map();
  const pageVersions = new Map([['contact', 1]]);
  let newsVersion = 1;
  let collectionVersion = 1;
  const backend = http.createServer((request, response) => {
    const requestUrl = request.url ?? '';
    const callCount = (backendCalls.get(requestUrl) ?? 0) + 1;
    backendCalls.set(requestUrl, callCount);
    response.setHeader('content-type', 'application/json');

    if (request.method === 'POST' && requestUrl === '/api/admin/auth/session') {
      response.end(JSON.stringify({user: ownerIdentity}));
      return;
    }

    if (request.method === 'PUT' && requestUrl === '/api/admin/pages/contact') {
      pageVersions.set('contact', 2);
      response.end(JSON.stringify({page: {
        pageKey: 'contact',
        section: 'site',
        sortOrder: 0,
        content: {ko: {}, en: {}},
        seo: {ko: {}, en: {}},
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:01:00.000Z'
      }}));
      return;
    }

    if (request.method === 'GET' && requestUrl === '/api/admin/news/launch') {
      response.end(JSON.stringify({item: adminNews(newsVersion)}));
      return;
    }

    if (request.method === 'PUT' && requestUrl === '/api/admin/news/launch') {
      newsVersion = 2;
      response.end(JSON.stringify({item: adminNews(newsVersion)}));
      return;
    }

    if (request.method === 'GET' && requestUrl === '/api/admin/collections/champion') {
      response.end(JSON.stringify({item: adminCollection(collectionVersion)}));
      return;
    }

    if (request.method === 'PUT' && requestUrl === '/api/admin/collections/champion') {
      collectionVersion = 2;
      response.end(JSON.stringify({item: adminCollection(collectionVersion)}));
      return;
    }

    if (request.method === 'POST' && requestUrl === '/api/admin/import?replace=1') {
      pageVersions.set('contact', 3);
      response.end(JSON.stringify({replaced: true}));
      return;
    }

    if (requestUrl === '/api/cms/pages/flaky?locale=ko' && callCount === 1) {
      response.statusCode = 500;
      response.end(JSON.stringify({error: 'Temporary CMS failure'}));
      return;
    }

    if (requestUrl === '/api/cms/pages/missing?locale=ko' && callCount === 1) {
      response.statusCode = 404;
      response.end(JSON.stringify({error: 'Not found yet'}));
      return;
    }

    if (requestUrl === '/api/cms/news?locale=ko') {
      response.end(JSON.stringify({locale: 'ko', items: [{slug: 'launch', backendCall: callCount, version: newsVersion}]}));
      return;
    }

    if (requestUrl === '/api/cms/news/launch?locale=ko') {
      response.end(JSON.stringify({locale: 'ko', item: {slug: 'launch', backendCall: callCount, version: newsVersion}}));
      return;
    }

    if (requestUrl === '/api/cms/collections?locale=ko') {
      response.end(JSON.stringify({locale: 'ko', items: [{slug: 'champion', backendCall: callCount, version: collectionVersion}]}));
      return;
    }

    if (requestUrl === '/api/cms/collections/champion?locale=ko') {
      response.end(JSON.stringify({locale: 'ko', item: {slug: 'champion', backendCall: callCount, version: collectionVersion}}));
      return;
    }

    const match = requestUrl.match(/^\/api\/cms\/pages\/([^?]+)\?locale=(ko|en)$/);
    if (match) {
      response.end(JSON.stringify({
        pageKey: match[1],
        section: 'site',
        locale: match[2],
        content: {
          backendCall: callCount,
          version: pageVersions.get(match[1]) ?? 1
        },
        seo: {},
        updatedAt: '2026-08-10T00:00:00.000Z'
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
  const sessionSecret = 'test-public-cache-session-secret';
  const adminApiKey = 'test-public-cache-admin-api-key';
  const nextProcess = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', String(nextPort)],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        CMS_BACKEND_URL: `http://127.0.0.1:${backendAddress.port}`,
        CMS_ADMIN_SESSION_SECRET: sessionSecret,
        CMS_BACKEND_API_KEY: adminApiKey,
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

  const first = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  const second = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).content.backendCall, 1);
  assert.equal((await second.json()).content.backendCall, 1);
  assert.equal(backendCalls.get('/api/cms/pages/contact?locale=ko'), 1);

  for (const path of [
    '/api/cms/news?locale=ko',
    '/api/cms/news/launch?locale=ko',
    '/api/cms/collections?locale=ko',
    '/api/cms/collections/champion?locale=ko'
  ]) {
    assert.equal((await fetch(`${baseUrl}${path}`)).status, 200);
    assert.equal((await fetch(`${baseUrl}${path}`)).status, 200);
    assert.equal(backendCalls.get(path), 1, `${path} should use its public CMS data cache`);
  }

  const publicPage = await fetch(`${baseUrl}/ko/contact`);
  assert.equal(publicPage.status, 200);
  assert.equal(
    [...backendCalls.keys()].some((path) => path.startsWith('/api/admin/pages')),
    false,
    `public rendering must never read CMS content through an admin endpoint: ${[
      ...backendCalls.keys()
    ].filter((path) => path.startsWith('/api/admin/pages')).join(', ')}`
  );
  assert.ok(backendCalls.has('/api/cms/pages/common?locale=ko'));
  assert.ok(backendCalls.has('/api/cms/pages/common?locale=en'));
  assert.ok(backendCalls.has('/api/cms/pages/site-popup?locale=ko'));

  const sessionValue = createSignedAdminSession(ownerIdentity, sessionSecret, Date.now());
  const adminCookies = `daeho_admin_session=${sessionValue}; daeho_admin_api_session=${sessionValue}`;
  const saveResponse = await fetch(`${baseUrl}/api/admin/pages/contact`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      section: 'site',
      sortOrder: 0,
      content: {ko: {}, en: {}},
      seo: {ko: {}, en: {}}
    })
  });
  assert.equal(saveResponse.status, 200);

  const afterSave = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  assert.equal(afterSave.status, 200);
  assert.equal((await afterSave.json()).content.version, 2);
  assert.equal(backendCalls.get('/api/cms/pages/contact?locale=ko'), 2);

  const newsSaveResponse = await fetch(`${baseUrl}/api/admin/news/launch`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      slug: 'launch',
      category: 'press',
      translations: {
        ko: {title: '새 소식'},
        en: {title: 'New launch'}
      }
    })
  });
  assert.equal(newsSaveResponse.status, 200);

  const newsListAfterSave = await fetch(`${baseUrl}/api/cms/news?locale=ko`);
  const newsDetailAfterSave = await fetch(`${baseUrl}/api/cms/news/launch?locale=ko`);
  assert.equal((await newsListAfterSave.json()).items[0].version, 2);
  assert.equal((await newsDetailAfterSave.json()).item.version, 2);
  assert.equal(backendCalls.get('/api/cms/news?locale=ko'), 2);
  assert.equal(backendCalls.get('/api/cms/news/launch?locale=ko'), 2);

  const collectionSaveResponse = await fetch(`${baseUrl}/api/admin/collections/champion`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      slug: 'champion',
      category: 'champion',
      translations: {
        ko: {title: '우승 작품'},
        en: {title: 'Champion work'}
      }
    })
  });
  assert.equal(collectionSaveResponse.status, 200);

  const collectionListAfterSave = await fetch(`${baseUrl}/api/cms/collections?locale=ko`);
  const collectionDetailAfterSave = await fetch(`${baseUrl}/api/cms/collections/champion?locale=ko`);
  assert.equal((await collectionListAfterSave.json()).items[0].version, 2);
  assert.equal((await collectionDetailAfterSave.json()).item.version, 2);
  assert.equal(backendCalls.get('/api/cms/collections?locale=ko'), 2);
  assert.equal(backendCalls.get('/api/cms/collections/champion?locale=ko'), 2);

  const importResponse = await fetch(`${baseUrl}/api/admin/import?replace=1`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({schemaVersion: 1, tables: {}})
  });
  assert.equal(importResponse.status, 200);

  const afterImport = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  assert.equal((await afterImport.json()).content.version, 3);
  assert.equal(backendCalls.get('/api/cms/pages/contact?locale=ko'), 3);

  const failed = await fetch(`${baseUrl}/api/cms/pages/flaky?locale=ko`);
  const recovered = await fetch(`${baseUrl}/api/cms/pages/flaky?locale=ko`);
  assert.equal(failed.status, 500);
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).content.backendCall, 2);
  assert.equal(backendCalls.get('/api/cms/pages/flaky?locale=ko'), 2);

  const missing = await fetch(`${baseUrl}/api/cms/pages/missing?locale=ko`);
  const created = await fetch(`${baseUrl}/api/cms/pages/missing?locale=ko`);
  assert.equal(missing.status, 404);
  assert.equal(created.status, 200);
  assert.equal((await created.json()).content.backendCall, 2);
  assert.equal(backendCalls.get('/api/cms/pages/missing?locale=ko'), 2);
});

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
      // Listener is not ready yet.
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

function adminNews(version) {
  return {
    id: 'news-1',
    slug: 'launch',
    category: 'press',
    imagePath: '',
    mobileImagePath: '',
    publishedAt: '2026-08-10',
    isFeatured: false,
    isVisible: true,
    sortOrder: 0,
    translations: {},
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: `2026-08-10T00:0${version}:00.000Z`
  };
}

function adminCollection(version) {
  return {
    id: 'collection-1',
    slug: 'champion',
    category: 'champion',
    sportCategory: '',
    imagePath: '',
    gallery: [],
    specs: {},
    isVisible: true,
    sortOrder: 0,
    translations: {},
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: `2026-08-10T00:0${version}:00.000Z`
  };
}
