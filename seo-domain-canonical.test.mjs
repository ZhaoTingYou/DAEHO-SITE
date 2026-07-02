import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const httpsNginxConfig = readFileSync(new URL('./docker/nginx/https.conf', import.meta.url), 'utf8');

test('production nginx redirects www to the apex canonical domain', () => {
  assert.match(httpsNginxConfig, /server_name\s+www\.daeho\.works;/);
  assert.match(httpsNginxConfig, /return\s+301\s+https:\/\/daeho\.works\$request_uri;/);
  assert.match(httpsNginxConfig, /server_name\s+daeho\.works;/);
  assert.doesNotMatch(httpsNginxConfig, /server_name\s+daeho\.works\s+www\.daeho\.works;/);
});
