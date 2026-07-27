import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../../../../../../', import.meta.url));

test('collection detail displays the ring name as its visible page heading', {timeout: 30_000}, async (t) => {
  const port = await availablePort();
  const server = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('../../../../../../node_modules/next/dist/bin/next', import.meta.url)),
      'dev',
      '--webpack',
      '-p',
      String(port)
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        CMS_PREVIEW_STATIC: 'true'
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

  const response = await waitForPage(`http://127.0.0.1:${port}/ko/mastery/creations/ring-01`, server, () => output);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /<h1 class="(?![^"]*\bsr-only\b)[^"]*">Collection 01<\/h1>/,
    'the ring name should be rendered as a visible h1'
  );
});

async function availablePort() {
  const server = createServer();
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

  throw new Error(`Timed out waiting for the collection detail page.\n${readOutput()}`);
}
