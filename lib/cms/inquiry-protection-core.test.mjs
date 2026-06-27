import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

import ts from 'typescript';

async function importCore() {
  const sourcePath = new URL('./inquiry-protection-core.ts', import.meta.url);
  let source = '';

  try {
    source = readFileSync(sourcePath, 'utf8');
  } catch {
    assert.fail('Expected inquiry-protection-core.ts to exist');
  }

  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-inquiry-protection-'));
  const outputPath = path.join(tempDir, 'inquiry-protection-core.mjs');
  writeFileSync(outputPath, output.outputText, 'utf8');
  const importedCore = await import(pathToFileURL(outputPath).href);
  rmSync(tempDir, {force: true, recursive: true});
  return importedCore;
}

const contactPayload = {
  locale: 'ko',
  name: 'Kim',
  organization: 'DAEHO Test Team',
  contact: 'kim@example.com',
  type: 'appointment',
  message: 'We want to ask about a commemorative ring.',
  pagePath: '/ko/contact'
};

test('allows a first inquiry and rejects an immediate duplicate before it reaches the CMS', async () => {
  const {createInquiryProtectionGuard} = await importCore();
  let now = Date.UTC(2026, 5, 27, 9, 0, 0);
  const guard = createInquiryProtectionGuard({
    now: () => now,
    duplicateWindowMs: 10 * 60 * 1000,
    rateLimitWindowMs: 10 * 60 * 1000,
    rateLimitMax: 5
  });

  const first = guard.check({
    source: 'contact',
    payload: contactPayload,
    ipAddress: '203.0.113.10',
    userAgent: 'Mozilla/5.0',
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  assert.deepEqual(first, {allowed: true});

  now += 1_000;
  const duplicate = guard.check({
    source: 'contact',
    payload: contactPayload,
    ipAddress: '203.0.113.10',
    userAgent: 'Mozilla/5.0',
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  assert.equal(duplicate.allowed, false);
  assert.equal(duplicate.status, 429);
  assert.equal(duplicate.body.error, 'Duplicate inquiry');
  assert.equal(duplicate.body.retryAfterSeconds, 599);
});

test('rate limits too many distinct inquiries from the same IP and source', async () => {
  const {createInquiryProtectionGuard} = await importCore();
  const guard = createInquiryProtectionGuard({
    now: () => Date.UTC(2026, 5, 27, 9, 0, 0),
    duplicateWindowMs: 10 * 60 * 1000,
    rateLimitWindowMs: 10 * 60 * 1000,
    rateLimitMax: 2
  });

  for (const index of [1, 2]) {
    assert.deepEqual(
      guard.check({
        source: 'contact',
        payload: {...contactPayload, message: `Message ${index}`},
        ipAddress: '203.0.113.11',
        userAgent: 'Mozilla/5.0',
        allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
      }),
      {allowed: true}
    );
  }

  const limited = guard.check({
    source: 'contact',
    payload: {...contactPayload, message: 'Message 3'},
    ipAddress: '203.0.113.11',
    userAgent: 'Mozilla/5.0',
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  assert.equal(limited.allowed, false);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error, 'Too many inquiries');
});

test('rejects spam signals from honeypot and invalid public page paths', async () => {
  const {createInquiryProtectionGuard} = await importCore();
  const guard = createInquiryProtectionGuard({
    now: () => Date.UTC(2026, 5, 27, 9, 0, 0),
    duplicateWindowMs: 10 * 60 * 1000,
    rateLimitWindowMs: 10 * 60 * 1000,
    rateLimitMax: 5
  });

  const honeypot = guard.check({
    source: 'contact',
    payload: {...contactPayload, website: 'https://spam.example'},
    ipAddress: '203.0.113.12',
    userAgent: 'Mozilla/5.0',
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  assert.equal(honeypot.allowed, false);
  assert.equal(honeypot.status, 400);
  assert.deepEqual(honeypot.body, {
    error: 'Validation failed',
    issues: [{path: 'website', message: 'Leave this field empty'}]
  });

  const invalidPath = guard.check({
    source: 'contact',
    payload: {...contactPayload, pagePath: '/admin'},
    ipAddress: '203.0.113.13',
    userAgent: 'Mozilla/5.0',
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  assert.equal(invalidPath.allowed, false);
  assert.equal(invalidPath.status, 400);
  assert.equal(invalidPath.body.error, 'Validation failed');
  assert.deepEqual(invalidPath.body.issues, [{path: 'pagePath', message: 'Invalid page path'}]);
});
