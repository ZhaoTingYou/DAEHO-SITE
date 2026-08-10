import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {rm} from 'node:fs/promises';
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

test('public CMS reads and full routes are cached while failed responses are retried', {timeout: 150_000}, async (t) => {
  const backendCalls = new Map();
  const pageVersions = new Map([['contact', 1], ['common', 1], ['site-popup', 1]]);
  let newsVersion = 1;
  let newsSlug = 'launch';
  let collectionVersion = 1;
  let collectionSlug = 'ring-one';
  let contactFailuresRemaining = 0;
  const backend = http.createServer((request, response) => {
    const requestUrl = request.url ?? '';
    const callCount = (backendCalls.get(requestUrl) ?? 0) + 1;
    backendCalls.set(requestUrl, callCount);
    response.setHeader('content-type', 'application/json');

    if (request.method === 'POST' && requestUrl === '/api/admin/auth/session') {
      response.end(JSON.stringify({user: ownerIdentity}));
      return;
    }

    const pageWrite = requestUrl.match(/^\/api\/admin\/pages\/([^?]+)$/);
    if (request.method === 'PUT' && pageWrite) {
      const pageKey = pageWrite[1];
      pageVersions.set(pageKey, (pageVersions.get(pageKey) ?? 1) + 1);
      response.end(JSON.stringify({page: {
        pageKey,
        section: 'site',
        sortOrder: 0,
        content: {ko: {}, en: {}},
        seo: {ko: {}, en: {}},
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:01:00.000Z'
      }}));
      return;
    }

    if (request.method === 'GET' && requestUrl === '/api/admin/pages/contact') {
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
      response.end(JSON.stringify({item: adminNews(newsVersion, newsSlug)}));
      return;
    }

    if (request.method === 'PUT' && requestUrl === '/api/admin/news/launch') {
      newsVersion = 2;
      newsSlug = 'launch-v2';
      response.end(JSON.stringify({item: adminNews(newsVersion, newsSlug)}));
      return;
    }

    if (request.method === 'GET' && requestUrl === '/api/admin/collections/ring-one') {
      response.end(JSON.stringify({item: adminCollection(collectionVersion, collectionSlug)}));
      return;
    }

    if (request.method === 'PUT' && requestUrl === '/api/admin/collections/ring-one') {
      collectionVersion = 2;
      collectionSlug = 'ring-one-v2';
      response.end(JSON.stringify({item: adminCollection(collectionVersion, collectionSlug)}));
      return;
    }

    if (request.method === 'POST' && requestUrl === '/api/admin/import?replace=1') {
      pageVersions.set('contact', 3);
      contactFailuresRemaining = 1;
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
      response.end(JSON.stringify({locale: 'ko', items: [{slug: newsSlug, backendCall: callCount, version: newsVersion}]}));
      return;
    }

    const publicNewsItem = requestUrl.match(/^\/api\/cms\/news\/([^?]+)\?locale=ko$/);
    if (publicNewsItem && publicNewsItem[1] === newsSlug) {
      response.end(JSON.stringify({locale: 'ko', item: {slug: newsSlug, backendCall: callCount, version: newsVersion}}));
      return;
    }

    if (requestUrl === '/api/cms/collections?locale=ko') {
      response.end(JSON.stringify({locale: 'ko', items: [{slug: collectionSlug, backendCall: callCount, version: collectionVersion}]}));
      return;
    }

    const publicCollectionItem = requestUrl.match(/^\/api\/cms\/collections\/([^?]+)\?locale=ko$/);
    if (publicCollectionItem && publicCollectionItem[1] === collectionSlug) {
      response.end(JSON.stringify({locale: 'ko', item: {slug: collectionSlug, backendCall: callCount, version: collectionVersion}}));
      return;
    }

    const match = requestUrl.match(/^\/api\/cms\/pages\/([^?]+)\?locale=(ko|en)$/);
    if (match) {
      if (match[1] === 'contact' && match[2] === 'ko' && contactFailuresRemaining > 0) {
        contactFailuresRemaining -= 1;
        response.statusCode = 500;
        response.end(JSON.stringify({error: 'Temporary contact CMS failure'}));
        return;
      }
      const version = pageVersions.get(match[1]) ?? 1;
      response.end(JSON.stringify({
        pageKey: match[1],
        section: 'site',
        locale: match[2],
        content: {
          backendCall: callCount,
          version,
          ...(match[1] === 'contact'
            ? {__groups: {main: {hero: {title: `CONTACT VERSION ${version}`}}}}
            : {})
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
  const nextEnvironment = {
    ...process.env,
    CMS_BACKEND_URL: `http://127.0.0.1:${backendAddress.port}`,
    CMS_ADMIN_SESSION_SECRET: sessionSecret,
    CMS_BACKEND_API_KEY: adminApiKey,
    CMS_PREVIEW_STATIC: 'false',
    NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${nextPort}`,
    NEXT_TELEMETRY_DISABLED: '1'
  };
  await runNextBuild(nextEnvironment);
  const nextProcess = spawn(
    process.execPath,
    ['.next/standalone/server.js'],
    {
      cwd: projectRoot,
      env: {
        ...nextEnvironment,
        HOSTNAME: '127.0.0.1',
        PORT: String(nextPort)
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

  const firstPublicPage = await fetch(`${baseUrl}/ko/contact`);
  const firstPublicHtml = await firstPublicPage.text();
  const warmPublicPage = await fetch(`${baseUrl}/ko/contact`);
  assert.equal(firstPublicPage.status, 200);
  assert.match(firstPublicHtml, /CONTACT VERSION 1/);
  assert.match(await warmPublicPage.text(), /CONTACT VERSION 1/);
  assert.equal(warmPublicPage.headers.get('x-nextjs-cache'), 'HIT');

  await fetch(`${baseUrl}/api/cms/pages/archive?locale=ko`);
  await fetch(`${baseUrl}/api/cms/pages/archive?locale=ko`);
  assert.equal(backendCalls.get('/api/cms/pages/archive?locale=ko'), 1);

  for (const path of [
    '/api/cms/news?locale=ko',
    '/api/cms/news/launch?locale=ko',
    '/api/cms/collections?locale=ko',
    '/api/cms/collections/ring-one?locale=ko'
  ]) {
    const callsBeforeFirstRequest = backendCalls.get(path) ?? 0;
    assert.equal((await fetch(`${baseUrl}${path}`)).status, 200);
    const callsAfterFirstRequest = backendCalls.get(path) ?? 0;
    assert.equal((await fetch(`${baseUrl}${path}`)).status, 200);
    assert.ok(
      callsAfterFirstRequest <= callsBeforeFirstRequest + 1,
      `${path} should make at most one CMS request when first read at runtime`
    );
    assert.equal(
      backendCalls.get(path) ?? 0,
      callsAfterFirstRequest,
      `${path} should use its public CMS data cache on the repeated read`
    );
  }

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

  const rssBeforeSave = await (await fetch(`${baseUrl}/rss.xml`)).text();
  const sitemapBeforeSave = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
  assert.match(rssBeforeSave, /\/ko\/news\/launch/);
  assert.match(sitemapBeforeSave, /\/ko\/news\/launch/);
  assert.match(sitemapBeforeSave, /\/ko\/mastery\/creations\/champion/);
  assert.match(sitemapBeforeSave, /\/ko\/mastery\/creations\/ring-one/);
  const newsListCallsBeforeSave = backendCalls.get('/api/cms/news?locale=ko') ?? 0;

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

  const pageImmediatelyAfterSave = await fetch(`${baseUrl}/ko/contact`);
  assert.equal(pageImmediatelyAfterSave.status, 200);
  assert.match(await pageImmediatelyAfterSave.text(), /CONTACT VERSION 2/);
  const warmPageAfterSave = await fetch(`${baseUrl}/ko/contact`);
  assert.match(await warmPageAfterSave.text(), /CONTACT VERSION 2/);
  assert.equal(warmPageAfterSave.headers.get('x-nextjs-cache'), 'HIT');

  const afterSave = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  assert.equal(afterSave.status, 200);
  assert.equal((await afterSave.json()).content.version, 2);
  assert.equal(backendCalls.get('/api/cms/pages/contact?locale=ko'), 2);
  await fetch(`${baseUrl}/api/cms/pages/archive?locale=ko`);
  assert.equal(
    backendCalls.get('/api/cms/pages/archive?locale=ko'),
    1,
    'saving contact must not invalidate an unrelated public page'
  );

  const commonCallsBeforeSave = backendCalls.get('/api/cms/pages/common?locale=ko') ?? 0;
  const commonSaveResponse = await fetch(`${baseUrl}/api/admin/pages/common`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      section: 'settings',
      sortOrder: 0,
      content: {ko: {}, en: {}},
      seo: {ko: {}, en: {}}
    })
  });
  assert.equal(commonSaveResponse.status, 200);
  const commonAfterSave = await fetch(`${baseUrl}/api/cms/pages/common?locale=ko`);
  assert.equal((await commonAfterSave.json()).content.version, 2);
  assert.equal(backendCalls.get('/api/cms/pages/common?locale=ko'), commonCallsBeforeSave + 1);

  const newsSaveResponse = await fetch(`${baseUrl}/api/admin/news/launch`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      slug: 'launch-v2',
      category: 'press',
      translations: {
        ko: {title: '새 소식'},
        en: {title: 'New launch'}
      }
    })
  });
  assert.equal(newsSaveResponse.status, 200);

  const newsListAfterSave = await fetch(`${baseUrl}/api/cms/news?locale=ko`);
  const oldNewsDetailAfterSave = await fetch(`${baseUrl}/api/cms/news/launch?locale=ko`);
  const newsDetailAfterSave = await fetch(`${baseUrl}/api/cms/news/launch-v2?locale=ko`);
  assert.equal((await newsListAfterSave.json()).items[0].version, 2);
  assert.equal(oldNewsDetailAfterSave.status, 404);
  assert.equal((await newsDetailAfterSave.json()).item.version, 2);
  assert.equal(backendCalls.get('/api/cms/news?locale=ko'), newsListCallsBeforeSave + 1);
  assert.equal(backendCalls.get('/api/cms/news/launch?locale=ko'), 2);
  assert.equal(backendCalls.get('/api/cms/news/launch-v2?locale=ko'), 1);
  const rssAfterSave = await (await fetch(`${baseUrl}/rss.xml`)).text();
  const sitemapAfterNewsSave = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
  assert.match(rssAfterSave, /\/ko\/news\/launch-v2/);
  assert.doesNotMatch(rssAfterSave, /\/ko\/news\/launch</);
  assert.match(sitemapAfterNewsSave, /\/ko\/news\/launch-v2/);
  const oldNewsPage = await fetch(`${baseUrl}/ko/news/launch`);
  const oldNewsPageHtml = await oldNewsPage.text();
  assert.notEqual(oldNewsPage.status, 500);
  assert.match(oldNewsPageHtml, /noindex/);
  assert.equal((await fetch(`${baseUrl}/ko/news/launch-v2`)).status, 200);
  const collectionListCallsBeforeSave = backendCalls.get('/api/cms/collections?locale=ko') ?? 0;

  const collectionSaveResponse = await fetch(`${baseUrl}/api/admin/collections/ring-one`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookies,
      origin: baseUrl
    },
    body: JSON.stringify({
      slug: 'ring-one-v2',
      category: 'champion',
      translations: {
        ko: {title: '우승 작품'},
        en: {title: 'Champion work'}
      }
    })
  });
  assert.equal(collectionSaveResponse.status, 200);

  const collectionListAfterSave = await fetch(`${baseUrl}/api/cms/collections?locale=ko`);
  const oldCollectionDetailAfterSave = await fetch(`${baseUrl}/api/cms/collections/ring-one?locale=ko`);
  const collectionDetailAfterSave = await fetch(`${baseUrl}/api/cms/collections/ring-one-v2?locale=ko`);
  assert.equal((await collectionListAfterSave.json()).items[0].version, 2);
  assert.equal(oldCollectionDetailAfterSave.status, 404);
  assert.equal((await collectionDetailAfterSave.json()).item.version, 2);
  assert.equal(
    backendCalls.get('/api/cms/collections?locale=ko'),
    collectionListCallsBeforeSave + 1
  );
  assert.equal(backendCalls.get('/api/cms/collections/ring-one?locale=ko'), 2);
  assert.equal(backendCalls.get('/api/cms/collections/ring-one-v2?locale=ko'), 1);
  const sitemapAfterCollectionSave = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
  assert.match(sitemapAfterCollectionSave, /\/ko\/mastery\/creations\/ring-one-v2/);
  const oldCollectionPage = await fetch(`${baseUrl}/ko/mastery/creations/ring-one`);
  const oldCollectionPageHtml = await oldCollectionPage.text();
  assert.notEqual(oldCollectionPage.status, 500);
  assert.match(oldCollectionPageHtml, /noindex/);
  assert.equal((await fetch(`${baseUrl}/ko/mastery/creations/ring-one-v2`)).status, 200);

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

  const responseDuringCmsFailure = await fetch(`${baseUrl}/ko/contact`);
  assert.ok([200, 500].includes(responseDuringCmsFailure.status));
  if (responseDuringCmsFailure.status === 200) {
    assert.match(await responseDuringCmsFailure.text(), /CONTACT VERSION 2/);
  }
  const recoveredPublicPage = await fetch(`${baseUrl}/ko/contact`);
  assert.equal(recoveredPublicPage.status, 200);
  assert.match(await recoveredPublicPage.text(), /CONTACT VERSION 3/);

  const afterImport = await fetch(`${baseUrl}/api/cms/pages/contact?locale=ko`);
  assert.equal((await afterImport.json()).content.version, 3);
  assert.ok((backendCalls.get('/api/cms/pages/contact?locale=ko') ?? 0) >= 4);

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

  const adminPageCallsBefore = backendCalls.get('/api/admin/pages/contact') ?? 0;
  const adminPageHeaders = {cookie: adminCookies, origin: baseUrl};
  assert.equal((await fetch(`${baseUrl}/api/admin/pages/contact`, {headers: adminPageHeaders})).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/admin/pages/contact`, {headers: adminPageHeaders})).status, 200);
  assert.equal(
    backendCalls.get('/api/admin/pages/contact'),
    adminPageCallsBefore + 2,
    'admin reads must remain no-store'
  );
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

async function runNextBuild(environment) {
  await rm(new URL('../../../.next/', import.meta.url), {recursive: true, force: true});
  const output = [];
  const buildProcess = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'build'],
    {
      cwd: projectRoot,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  buildProcess.stdout.on('data', (chunk) => output.push(chunk.toString()));
  buildProcess.stderr.on('data', (chunk) => output.push(chunk.toString()));

  const exitCode = await new Promise((resolve, reject) => {
    buildProcess.once('error', reject);
    buildProcess.once('exit', (code) => resolve(code));
  });

  if (exitCode !== 0) {
    throw new Error(`Production build failed:\n${output.join('')}`);
  }
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

function adminNews(version, slug) {
  return {
    id: 'news-1',
    slug,
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

function adminCollection(version, slug) {
  return {
    id: 'collection-1',
    slug,
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
