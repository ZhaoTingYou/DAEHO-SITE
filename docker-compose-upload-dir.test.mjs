import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const compose = readFileSync(new URL('./docker-compose.yml', import.meta.url), 'utf8');
const backupScript = readFileSync(new URL('./docker/backup/run-backup.sh', import.meta.url), 'utf8');

test('CMS media uses object storage without public image bind mounts', () => {
  assert.match(compose, /CMS_STORAGE_PROVIDER:\s*\$\{CMS_STORAGE_PROVIDER:-s3\}/);
  assert.match(compose, /CMS_S3_BUCKET:/);
  assert.match(compose, /CMS_S3_PUBLIC_BASE_URL:/);
  assert.doesNotMatch(compose, /\.\/public\/images:/);
  assert.doesNotMatch(compose, /\.\/public\/videos:/);
  assert.doesNotMatch(backupScript, /uploads\.tar\.gz/);
});
