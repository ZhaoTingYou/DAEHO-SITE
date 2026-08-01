import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

test('an admin API request restores a legacy session and retries once after Unauthorized', async (t) => {
  const requests = [];
  let protectedRequestCount = 0;
  const server = http.createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);

    if (request.url === '/admin/api-session') {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.url === '/api/admin/inquiries/test-inquiry/status-preview') {
      protectedRequestCount += 1;
      response.setHeader('content-type', 'application/json');
      if (protectedRequestCount === 1) {
        response.statusCode = 401;
        response.end(JSON.stringify({error: 'Unauthorized'}));
      } else {
        response.end(JSON.stringify({changed: false}));
      }
      return;
    }

    response.statusCode = 404;
    response.end();
  });
  await listen(server);
  t.after(() => closeServer(server));

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}/api/admin/inquiries/test-inquiry/status-preview`;

  let fetchAdminApi;
  try {
    ({fetchAdminApi} = await import('./admin-api-client.mjs'));
  } catch {
    assert.fail('admin API session recovery client is missing');
  }

  const response = await fetchAdminApi(endpoint, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({status: 'contacted', expectedStatus: 'new'})
  });

  assert.equal(response.status, 200);
  assert.deepEqual(requests, [
    'POST /api/admin/inquiries/test-inquiry/status-preview',
    'POST /admin/api-session',
    'POST /api/admin/inquiries/test-inquiry/status-preview'
  ]);
});

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
    server.close((error) => error ? reject(error) : resolve());
  });
}
