import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const nextConfig = readFileSync(new URL('./next.config.ts', import.meta.url), 'utf8');
const nginxConfig = readFileSync(new URL('./docker/nginx/default.conf', import.meta.url), 'utf8');
const uploadPolicy = readFileSync(new URL('./lib/cms/upload-policy.ts', import.meta.url), 'utf8');
const springApplication = readFileSync(new URL('./backend/cms/src/main/resources/application.yml', import.meta.url), 'utf8');
const mediaStorageService = readFileSync(new URL('./backend/cms/src/main/java/com/daeho/cms/service/MediaStorageService.java', import.meta.url), 'utf8');
const adminI18n = readFileSync(new URL('./lib/admin-i18n.ts', import.meta.url), 'utf8');

test('CMS page saves allow several 20MB image fields in one request while single image validation stays separate', () => {
  assert.match(nextConfig, /bodySizeLimit:\s*'64mb'/);
  assert.match(nginxConfig, /client_max_body_size\s+64m;/);
  assert.match(uploadPolicy, /maxImageUploadBytes\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
  assert.match(springApplication, /max-file-size:\s*20MB/);
  assert.match(springApplication, /max-request-size:\s*21MB/);
  assert.match(mediaStorageService, /MAX_IMAGE_UPLOAD_BYTES\s*=\s*20L\s*\*\s*1024L\s*\*\s*1024L/);
  assert.doesNotMatch(adminI18n, /10MB/);
  assert.match(adminI18n, /20MB/);
});
