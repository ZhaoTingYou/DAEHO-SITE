import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {createServer as createHttpServer} from 'node:http';
import {createServer as createNetServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const localeMessages = {
  ko: JSON.parse(readFileSync(new URL('./messages/ko.json', import.meta.url), 'utf8')),
  en: JSON.parse(readFileSync(new URL('./messages/en.json', import.meta.url), 'utf8'))
};

test('Contact renders the categorized C plus C1 FAQ structure with all answer copy in SSR HTML', {timeout: 30_000}, async (t) => {
  const backend = createContactCmsBackend();
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  t.after(() => backend.close());
  const backendAddress = backend.address();
  assert.ok(backendAddress && typeof backendAddress !== 'string');
  const port = await availablePort();
  const server = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('./node_modules/next/dist/bin/next', import.meta.url)),
      'dev',
      '--webpack',
      '-p',
      String(port)
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        CMS_BACKEND_URL: `http://127.0.0.1:${backendAddress.port}`,
        CMS_PREVIEW_STATIC: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let output = '';

  server.stdout.on('data', (chunk) => {
    output += chunk;
  });
  server.stderr.on('data', (chunk) => {
    output += chunk;
  });
  t.after(async () => {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await Promise.race([once(server, 'exit'), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    }
  });

  const response = await waitForPage(`http://127.0.0.1:${port}/ko/contact`, server, () => output);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal((html.match(/data-contact-faq-category=/g) ?? []).length, 4);
  assert.equal((html.match(/data-contact-faq-question=/g) ?? []).length, 20);
  assert.equal((html.match(/aria-controls="contact-faq-/g) ?? []).length, 24);
  assert.match(html, /data-contact-faq-category="consultation"[^>]*aria-expanded="true"/);
  assert.match(html, /data-contact-faq-category="design"[^>]*aria-expanded="false"/);
  assert.match(html, /상담 · 견적/);
  assert.match(html, /디자인 · 소재/);
  assert.match(html, /기업 · 단체/);
  assert.match(html, /스포츠 · MD/);
  assert.match(html, /대호의 커스텀 제작은 상담 → 예산 및 요구사항 확인/);
  assert.match(html, /서울뿐 아니라 전국의 기업, 스포츠 구단, 학교, 기관 및 단체/);
});

async function availablePort() {
  const server = createNetServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  server.close();
  await once(server, 'close');

  if (!address || typeof address === 'string') {
    throw new Error('Could not allocate a local test port');
  }

  return address.port;
}

function createContactCmsBackend() {
  return createHttpServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const match = /^\/api\/cms\/pages\/([^/]+)$/.exec(url.pathname);

    if (!match) {
      response.statusCode = 404;
      response.end(JSON.stringify({error: 'Not found'}));
      return;
    }

    const pageKey = decodeURIComponent(match[1]);
    const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'ko';
    const messages = localeMessages[locale];
    const content = pageKey === 'contact'
      ? {__groups: {main: messages.contact, form: messages.forms.contact}}
      : {};

    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      pageKey,
      section: 'site',
      locale,
      content,
      seo: {},
      updatedAt: '2026-08-14T00:00:00.000Z'
    }));
  });
}

async function waitForPage(url, server, readOutput) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before serving the page.\n${readOutput()}`);
    }

    try {
      const response = await fetch(url);
      if (response.status !== 503) {
        return response;
      }
    } catch {
      // The development server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for the Contact page.\n${readOutput()}`);
}
