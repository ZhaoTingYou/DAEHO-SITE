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

function assertPublicEmbeddedLiveChatRoutes(config, forwardedProto) {
  const sseLocation = 'location = /api/live-chat/conversations/current/events {';
  const publicApiLocation = 'location /api/live-chat/ {';
  const sseOffset = config.indexOf(sseLocation);
  const publicApiOffset = config.indexOf(publicApiLocation);

  assert.ok(sseOffset >= 0, 'the exact public SSE route is present');
  assert.ok(publicApiOffset >= 0, 'the public live-chat API prefix is present');
  assert.ok(sseOffset < publicApiOffset, 'the exact SSE route precedes the general public API route');

  const sseBlock = config.slice(sseOffset, publicApiOffset);
  assert.match(sseBlock, /proxy_pass http:\/\/cms_api\/api\/live-chat\/conversations\/current\/events;/);
  assert.match(sseBlock, /proxy_http_version 1\.1;/);
  assert.match(sseBlock, /proxy_buffering off;/);
  assert.match(sseBlock, /proxy_cache off;/);
  assert.match(sseBlock, /proxy_read_timeout 75s;/);
  assert.match(sseBlock, /proxy_set_header Connection "";/);
  assert.match(sseBlock, /add_header X-Accel-Buffering no;/);
  assert.match(sseBlock, /limit_req zone=live_chat_sse burst=3 nodelay;/);
  assert.match(sseBlock, /limit_conn live_chat_sse_conn 2;/);
  assertTrustedProxyHeaders(sseBlock, forwardedProto);

  const publicApiBlock = config.slice(publicApiOffset, config.indexOf('location / {', publicApiOffset));
  assert.match(publicApiBlock, /client_max_body_size 16k;/);
  assert.match(publicApiBlock, /proxy_pass http:\/\/cms_api\/api\/live-chat\//);
  assert.match(publicApiBlock, /proxy_http_version 1\.1;/);
  assert.match(publicApiBlock, /limit_req zone=live_chat_api burst=10 nodelay;/);
  assertTrustedProxyHeaders(publicApiBlock, forwardedProto);
  assert.doesNotMatch(config, /location \/api\/admin\//);
}

function assertLiveChatLimitZones(config) {
  assert.match(config, /limit_req_zone \$binary_remote_addr zone=live_chat_api:10m rate=5r\/s;/);
  assert.match(config, /limit_req_zone \$binary_remote_addr zone=live_chat_sse:10m rate=2r\/s;/);
  assert.match(config, /limit_conn_zone \$binary_remote_addr zone=live_chat_sse_conn:10m;/);
}

function assertDynamicDockerUpstreams(config) {
  assert.match(config, /resolver 127\.0\.0\.11 valid=10s ipv6=off;/);
  for (const [upstream, service, port] of [
    ['next_app', 'next', '3000'],
    ['cms_api', 'cms-api', '8080'],
    ['customer_api', 'customer-api', '8081']
  ]) {
    assert.match(
      config,
      new RegExp(`upstream ${upstream} \\{[\\s\\S]*zone ${upstream} 64k;[\\s\\S]*server ${service}:${port} resolve;`)
    );
  }
}

function assertTrustedProxyHeaders(config, forwardedProto) {
  assert.match(config, /proxy_set_header Host \$http_host;/);
  assert.match(config, /proxy_set_header X-Forwarded-Host \$http_host;/);
  assert.match(config, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(config, /proxy_set_header X-Daeho-Client-IP \$remote_addr;/);
  assert.match(config, /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
  assert.match(config, new RegExp(`proxy_set_header X-Forwarded-Proto ${forwardedProto};`));
}

test('live-chat routes reach the CMS API in local nginx', () => {
  assertLiveChatRoutes(defaultNginxConfig);
});

test('live-chat routes reach the CMS API in the production TLS server', () => {
  assertLiveChatRoutes(apexTlsServer);
});

test('local HTTP proxies public anonymous live chat with an unbuffered SSE route', () => {
  assertLiveChatLimitZones(defaultNginxConfig);
  assertPublicEmbeddedLiveChatRoutes(defaultNginxConfig, '\\$scheme');
});

test('production TLS proxies public anonymous live chat with an unbuffered SSE route', () => {
  assertLiveChatLimitZones(httpsNginxConfig);
  assertPublicEmbeddedLiveChatRoutes(apexTlsServer, 'https');
});

test('nginx re-resolves recreated Docker services without a manual restart', () => {
  assertDynamicDockerUpstreams(defaultNginxConfig);
  assertDynamicDockerUpstreams(httpsNginxConfig);
});
