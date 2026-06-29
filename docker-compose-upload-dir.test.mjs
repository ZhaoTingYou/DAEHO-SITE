import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const compose = readFileSync(new URL('./docker-compose.yml', import.meta.url), 'utf8');

test('local CMS uploads are written into the public images folder used by /images', () => {
  assert.match(compose, /CMS_UPLOAD_DIR:\s*\/data\/uploads/);
  assert.match(compose, /- \.\/public\/images:\/data\/uploads/);
  assert.match(compose, /- \.\/public\/images:\/app\/public\/images:ro/);
  assert.doesNotMatch(compose, /- cms_uploads:\/data\/uploads\b/);
});
