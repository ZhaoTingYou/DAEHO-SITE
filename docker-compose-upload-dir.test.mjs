import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const compose = readFileSync(new URL('./docker-compose.yml', import.meta.url), 'utf8');
const nextDockerfile = readFileSync(new URL('./Dockerfile.next', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('./.env.example', import.meta.url), 'utf8');

function serviceBlock(name) {
  const match = compose.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [A-Za-z][^\\n]*:|^volumes:|(?![\\s\\S]))`, 'm'));
  assert.ok(match, `${name} service is present`);
  return match[0];
}

test('local CMS uploads are written into the public images folder used by /images', () => {
  assert.match(compose, /CMS_UPLOAD_DIR:\s*\/data\/uploads/);
  assert.match(compose, /- \.\/public\/images:\/data\/uploads/);
  assert.match(compose, /- \.\/public\/images:\/app\/public\/images:ro/);
  assert.doesNotMatch(compose, /- cms_uploads:\/data\/uploads\b/);
});

test('production image build reads public CMS data without changing its runtime backend', () => {
  assert.match(nextDockerfile, /ARG CMS_BUILD_BACKEND_URL/);
  assert.match(nextDockerfile, /ENV CMS_BACKEND_URL=\$\{CMS_BUILD_BACKEND_URL\}/);
  assert.match(compose, /CMS_BUILD_BACKEND_URL:\s*\$\{CMS_BUILD_BACKEND_URL:-https:\/\/daeho\.works\}/);
  assert.match(compose, /CMS_BACKEND_URL:\s*http:\/\/cms-api:8080/);
});

test('embedded live chat secrets are runtime-only CMS configuration', () => {
  const cmsService = serviceBlock('cms-api');
  const nextService = serviceBlock('next');

  assert.match(cmsService, /CMS_LIVE_CHAT_SESSION_SECRET:\s*\$\{CMS_LIVE_CHAT_SESSION_SECRET:-\}/);
  assert.match(cmsService, /CMS_LIVE_CHAT_ALLOWED_ORIGINS:\s*\$\{CMS_LIVE_CHAT_ALLOWED_ORIGINS:-https:\/\/daeho\.works\}/);
  assert.doesNotMatch(nextService, /CMS_LIVE_CHAT_(?:SESSION_SECRET|ALLOWED_ORIGINS)/);
  assert.doesNotMatch(nextDockerfile, /CMS_LIVE_CHAT_(?:SESSION_SECRET|ALLOWED_ORIGINS)/);
  assert.match(envExample, /CMS_LIVE_CHAT_SESSION_SECRET=replace-with-a-long-random-live-chat-session-secret/);
  assert.match(envExample, /CMS_LIVE_CHAT_ALLOWED_ORIGINS=https:\/\/daeho\.works/);
});
