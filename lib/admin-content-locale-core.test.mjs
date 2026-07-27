import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';

const moduleUrl = new URL('./admin-content-locale-core.mjs', import.meta.url);

test('content locale preference module exists', () => {
  assert.equal(existsSync(moduleUrl), true, 'admin content locale core should exist');
});

test('content locale preference accepts only Korean and English', async () => {
  const {normalizeAdminContentLocale} = await import(moduleUrl);

  assert.equal(normalizeAdminContentLocale('ko'), 'ko');
  assert.equal(normalizeAdminContentLocale('en'), 'en');
  assert.equal(normalizeAdminContentLocale('zh'), 'ko');
  assert.equal(normalizeAdminContentLocale(null), 'ko');
});

test('content locale arrow navigation moves between the two language tabs', async () => {
  const {contentLocaleForKey} = await import(moduleUrl);

  assert.equal(contentLocaleForKey('ko', 'ArrowRight'), 'en');
  assert.equal(contentLocaleForKey('en', 'ArrowRight'), 'ko');
  assert.equal(contentLocaleForKey('en', 'ArrowLeft'), 'ko');
  assert.equal(contentLocaleForKey('ko', 'Home'), 'ko');
  assert.equal(contentLocaleForKey('ko', 'End'), 'en');
  assert.equal(contentLocaleForKey('ko', 'Enter'), null);
});
