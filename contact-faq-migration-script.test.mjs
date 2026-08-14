import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const koContact = readJson(path.join(projectRoot, 'messages/ko.json')).contact;
const scriptPath = path.join(projectRoot, 'scripts/migrate-contact-faqs.mjs');

test('Contact FAQ migration CLI dry-runs without backup or database update', () => {
  const fixture = createFixture();
  const result = runMigration(fixture);
  const calls = readCalls(fixture.logPath);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"dryRun": true/);
  assert.match(result.stdout, /"ko": 20/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.includes('SELECT json_build_object'), true);
  assert.equal(existsSync(fixture.backupRoot), false);
});

test('Contact FAQ migration CLI backs up cms_pages and applies one guarded transaction', () => {
  const fixture = createFixture();
  const result = runMigration(fixture, ['--apply']);
  const calls = readCalls(fixture.logPath);
  const backupDirs = readdirSync(fixture.backupRoot, {withFileTypes: true})
    .filter((entry) => entry.isDirectory());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"applied": true/);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].args.includes('pg_dump'), true);
  assert.equal(calls[2].input.includes('UPDATE cms_pages'), true);
  assert.equal(calls[2].input.includes('How does the custom production process work?'), true);
  assert.equal(calls[2].input.includes('Consultation · Quote'), true);
  assert.equal(calls[2].input.includes('GET DIAGNOSTICS changed_rows = ROW_COUNT'), true);
  assert.equal(backupDirs.length, 1);

  const backupPath = path.join(fixture.backupRoot, backupDirs[0].name);
  assert.equal(existsSync(path.join(backupPath, 'cms-pages-before.sql')), true);
  assert.equal(existsSync(path.join(backupPath, 'contact-page-before.json')), true);
});

test('Contact FAQ migration CLI aborts before backup and update when the CMS set is unknown', () => {
  const fixture = createFixture({faqCount: 19});
  const result = runMigration(fixture, ['--apply']);
  const calls = readCalls(fixture.logPath);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires exactly the known twenty unique questions/);
  assert.equal(calls.length, 1);
  assert.equal(existsSync(fixture.backupRoot), false);
});

function createFixture({faqCount = 20} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'daeho-contact-faq-migration-'));
  const binDir = path.join(root, 'bin');
  const rowPath = path.join(root, 'contact-row.json');
  const logPath = path.join(root, 'docker-calls.jsonl');
  const backupRoot = path.join(root, 'backups');
  mkdirSync(binDir, {recursive: true});

  const legacyFaqs = koContact.faqs
    .slice(0, faqCount)
    .map(({question, answer}) => ({question, answer}));
  const grouped = {
    __groups: {
      main: {hero: {title: 'Keep'}, faqTitle: 'FAQ', faqs: legacyFaqs},
      form: {submit: 'Keep'}
    }
  };
  writeFileSync(rowPath, JSON.stringify({content_ko: grouped, content_en: grouped}), 'utf8');

  const dockerPath = path.join(binDir, 'docker');
  writeFileSync(dockerPath, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const input = fs.readFileSync(0, 'utf8');
fs.appendFileSync(process.env.FAKE_DOCKER_LOG, JSON.stringify({args, input}) + '\\n');
if (args.includes('pg_dump')) {
  process.stdout.write('-- cms_pages backup\\n');
} else if (input.includes('SELECT json_build_object')) {
  process.stdout.write(fs.readFileSync(process.env.FAKE_CONTACT_ROW, 'utf8') + '\\n');
} else {
  process.stdout.write('DO\\n');
}
`, 'utf8');
  chmodSync(dockerPath, 0o755);

  return {root, binDir, rowPath, logPath, backupRoot};
}

function runMigration(fixture, args = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fixture.binDir}${path.delimiter}${process.env.PATH}`,
      FAKE_DOCKER_LOG: fixture.logPath,
      FAKE_CONTACT_ROW: fixture.rowPath,
      CONTACT_FAQ_BACKUP_ROOT: fixture.backupRoot,
      POSTGRES_USER: 'daeho-test',
      POSTGRES_DB: 'daeho-test'
    }
  });
}

function readCalls(logPath) {
  if (!existsSync(logPath)) {
    return [];
  }

  return readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
}

function readJson(filename) {
  return JSON.parse(readFileSync(filename, 'utf8'));
}
