import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {createSignedAdminSession} from '../../lib/cms/admin-session-core.mjs';

const require = createRequire(import.meta.url);
const WebSocket = require('next/dist/compiled/ws');
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const chromePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].find((candidate) => candidate && existsSync(candidate));
const ownerIdentity = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'owner@example.com',
  role: 'OWNER',
  sessionVersion: 1,
  expiresAt: null,
  mustChangePassword: false
};
const productionTemplateKeys = [
  ['customer_contacted_email_en', 'email', 'en'],
  ['customer_contacted_email_ko', 'email', 'ko'],
  ['customer_contacted_kakao_ko', 'kakao', 'ko'],
  ['customer_done_email_en', 'email', 'en'],
  ['customer_done_email_ko', 'email', 'ko'],
  ['customer_done_kakao_ko', 'kakao', 'ko'],
  ['customer_in_progress_email_en', 'email', 'en'],
  ['customer_in_progress_email_ko', 'email', 'ko'],
  ['customer_in_progress_kakao_ko', 'kakao', 'ko'],
  ['internal_new_email_ko', 'email', 'ko'],
  ['internal_new_telegram_ko', 'telegram', 'ko'],
  ['internal_status_email_ko', 'email', 'ko']
];

test('notification settings fit a desktop viewport without horizontal scrolling', {
  timeout: 90_000,
  skip: !chromePath
}, async (t) => {
  const sessionSecret = 'test-notification-layout-secret';
  const adminApiKey = 'test-admin-api-key';
  const backend = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');

    if (request.method === 'POST' && request.url === '/api/admin/auth/session') {
      response.end(JSON.stringify({user: ownerIdentity}));
      return;
    }

    if (request.method === 'GET' && request.url === '/api/admin/notifications/health') {
      response.end(JSON.stringify({
        settings: {
          id: '00000000-0000-4000-8000-000000000001',
          internalEmail: 'admin@example.com',
          internalEmailEnabled: true,
          customerEmailEnabled: true,
          kakaoEnabled: true,
          telegramEnabled: true,
          telegramChatId: '123456789',
          telegramMessageThreadId: '1234',
          telegramTokenConfigured: true,
          updatedAt: '2026-09-02T00:00:00.000Z'
        },
        kakaoTemplatesReady: true,
        emailConfigured: true,
        kakaoConfigured: true,
        kakaoVerified: true,
        telegramConfigured: true,
        telegramEncryptionConfigured: true,
        telegramVerified: true,
        workerEnabled: true,
        telegramTemplateReady: true
      }));
      return;
    }

    if (request.method === 'GET' && request.url === '/api/admin/notifications/templates') {
      response.end(JSON.stringify({items: productionTemplateKeys.map(([templateKey, channel, locale], index) => ({
        id: `00000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
        templateKey,
        channel,
        audience: templateKey.startsWith('customer_') ? 'customer' : 'internal',
        eventType: templateKey.includes('_new_') ? 'new_inquiry' : 'status_changed',
        inquiryStatus: templateKey.includes('_new_') ? '' : 'contacted',
        locale,
        version: 1,
        subject: channel === 'email' ? 'Notification subject for a DAEHO customer inquiry' : '',
        body: 'Notification body with {{customerName}}, {{inquiryNumber}}, and {{statusLabel}} variables.',
        providerTemplateCode: channel === 'kakao' ? 'DAEHO_CUSTOMER_NOTIFICATION_V1' : '',
        kakaoTemplateType: 'basic',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: '2026-09-02T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z'
      }))}));
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
  const nextOutput = [];
  nextProcess.stdout.on('data', (chunk) => nextOutput.push(chunk.toString()));
  nextProcess.stderr.on('data', (chunk) => nextOutput.push(chunk.toString()));
  t.after(() => stopProcess(nextProcess));

  const baseUrl = `http://127.0.0.1:${nextPort}`;
  await waitForNext(baseUrl, nextProcess, nextOutput);

  const chromePort = await findFreePort();
  const chromeProfile = await mkdtemp(path.join(os.tmpdir(), 'daeho-notification-layout-'));
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${chromeProfile}`,
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-gpu',
    '--no-first-run',
    '--no-sandbox',
    '--window-size=1280,900',
    'about:blank'
  ], {detached: true, stdio: 'ignore'});
  t.after(async () => {
    await stopProcess(chromeProcess);
    await rm(chromeProfile, {recursive: true, force: true});
  });

  const debuggerUrl = await waitForChrome(chromePort, chromeProcess);
  const cdp = await connectCdp(debuggerUrl);
  t.after(() => cdp.close());
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const sessionValue = createSignedAdminSession(ownerIdentity, sessionSecret, Date.now());
  for (const [name, value] of [
    ['daeho_admin_session', sessionValue],
    ['daeho_admin_api_session', sessionValue],
    ['daeho_admin_locale', 'zh']
  ]) {
    const result = await cdp.send('Network.setCookie', {name, value, url: baseUrl});
    assert.equal(result.success, true);
  }
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', {url: `${baseUrl}/admin/notifications`});
  await waitForLayout(cdp);
  const safariLineBreaking = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const hint = Array.from(document.querySelectorAll('main p')).find((element) =>
        element.textContent?.includes('{{selected_head}}')
      );
      if (!hint) return false;
      const editor = hint.closest('form');
      if (!editor?.parentElement) return false;
      editor.parentElement.style.whiteSpace = 'nowrap';
      return true;
    })()`,
    returnByValue: true
  });
  assert.equal(safariLineBreaking.result?.value, true, 'The production template-variable hint must render.');

  for (const width of [640, 768, 900, 1023, 1024, 1050, 1100, 1200, 1279, 1280, 1366, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    const dimensions = await waitForLayout(cdp);
    assert.ok(
      dimensions.scrollWidth <= dimensions.clientWidth + 1,
      `Notification settings overflow horizontally at ${width}px: ${JSON.stringify(dimensions)}`
    );
    if (width === 1280) {
      assert.ok(
        dimensions.healthCardWidth >= 280,
        `Notification health cards do not reflow for the available desktop content width: ${JSON.stringify(dimensions)}`
      );
    }
  }

  if (process.env.NOTIFICATION_LAYOUT_SCREENSHOT) {
    await cdp.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('main p')).find((element) =>
        element.textContent?.includes('{{selected_head}}')
      )?.scrollIntoView({block: 'center'})`
    });
    const screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await writeFile(process.env.NOTIFICATION_LAYOUT_SCREENSHOT, screenshot.data, 'base64');
  }
});

async function connectCdp(debuggerUrl) {
  const socket = new WebSocket(debuggerUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  let nextId = 1;
  const pending = new Map();
  socket.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (!message.id || !pending.has(message.id)) return;
    const {resolve, reject} = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result ?? {});
  });
  return {
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        socket.send(JSON.stringify({id, method, params}));
      });
    }
  };
}

async function waitForLayout(cdp) {
  const deadline = Date.now() + 30_000;
  let lastDimensions;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body?.scrollWidth ?? 0,
        pathname: location.pathname,
        ready: document.readyState === 'complete' && Boolean(document.querySelector('main')),
        main: (() => {
          const element = document.querySelector('main');
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {left: rect.left, right: rect.right, width: rect.width};
        })(),
        healthCardWidth: (() => {
          const card = document.querySelector('main section > div > div');
          return card?.getBoundingClientRect().width ?? 0;
        })(),
        widest: Array.from(document.querySelectorAll('main *')).map((element) => {
          const rect = element.getBoundingClientRect();
          return {tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width};
        }).sort((a, b) => b.right - a.right).slice(0, 3)
      }))()`,
      returnByValue: true
    });
    const dimensions = result.result?.value;
    lastDimensions = dimensions;
    if (dimensions?.ready && dimensions.pathname === '/admin/notifications') return dimensions;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Notification settings page did not finish rendering: ${JSON.stringify(lastDimensions)}`);
}

async function waitForChrome(port, chromeProcess) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (chromeProcess.exitCode !== null) throw new Error('Chrome exited before opening its debugging port.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      const page = pages.find((target) => target.type === 'page' && target.url === 'about:blank');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome has not opened its debugging port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Chrome did not open its debugging port.');
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
