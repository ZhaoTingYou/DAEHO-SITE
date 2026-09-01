import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const defaultNginxConfig = readFileSync(new URL('./docker/nginx/default.conf', import.meta.url), 'utf8');
const httpsNginxConfig = readFileSync(new URL('./docker/nginx/https.conf', import.meta.url), 'utf8');
const apexTlsServer = httpsNginxConfig.slice(httpsNginxConfig.lastIndexOf('server_name daeho.works;'));

function assertLiveChatRoutes(config) {
  assert.match(config, /location = \/api\/cms\/live-chat\s*\{/);
  assert.match(config, /proxy_pass http:\/\/cms_api\/api\/cms\/live-chat;/);
  assert.match(config, /location = \/api\/telegram\/live-chat\/webhook\s*\{/);
  assert.match(config, /proxy_pass http:\/\/cms_api\/api\/telegram\/live-chat\/webhook;/);
  assert.match(
    config,
    /proxy_set_header X-Telegram-Bot-Api-Secret-Token \$http_x_telegram_bot_api_secret_token;/
  );
}

test('live-chat routes reach the CMS API in local nginx', () => {
  assertLiveChatRoutes(defaultNginxConfig);
});

test('live-chat routes reach the CMS API in the production TLS server', () => {
  assertLiveChatRoutes(apexTlsServer);
});
