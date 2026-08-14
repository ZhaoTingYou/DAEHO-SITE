import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  migrateContactFaqContents,
  parseContactFaqMigrationArguments
} from '../lib/cms/contact-faq-migration-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {apply, migrationOptions} = parseContactFaqMigrationArguments(process.argv.slice(2));

try {
  loadEnvFile(path.join(root, '.env'));

  const postgresUser = process.env.POSTGRES_USER ?? 'daeho';
  const postgresDb = process.env.POSTGRES_DB ?? 'daeho_cms';
  const backupRoot = process.env.CONTACT_FAQ_BACKUP_ROOT
    ? path.resolve(process.env.CONTACT_FAQ_BACKUP_ROOT)
    : path.join(root, 'backups');
  const row = readContactPage(postgresUser, postgresDb);
  const canonical = {
    ko: readJson(path.join(root, 'messages', 'ko.json')).contact,
    en: readJson(path.join(root, 'messages', 'en.json')).contact
  };
  const result = migrateContactFaqContents({
    ko: row.content_ko,
    en: row.content_en
  }, canonical, migrationOptions);

  if (!apply) {
    console.log(JSON.stringify({
      dryRun: true,
      changed: result.changed,
      matched: result.matched
    }, null, 2));
    const replacementFlag = migrationOptions.replaceIncompleteEnglishCount === 2
      ? ' --replace-incomplete-en'
      : '';
    console.log(`Run npm run cms:contact-faqs:migrate -- --apply${replacementFlag} to back up and update the Contact FAQ content.`);
  } else if (!result.changed) {
    console.log(JSON.stringify({
      applied: false,
      alreadyUpToDate: true,
      matched: result.matched
    }, null, 2));
  } else {
    const backupDir = createBackup(backupRoot, row, postgresUser, postgresDb);
    applyMigration(row, result.content, postgresUser, postgresDb);
    console.log(JSON.stringify({
      applied: true,
      matched: result.matched,
      backup: path.relative(root, backupDir)
    }, null, 2));
  }
} catch (error) {
  console.error(`[contact-faq-migration] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function readContactPage(postgresUser, postgresDb) {
  const output = runPsql(`
SELECT json_build_object(
  'content_ko', content_ko,
  'content_en', content_en
)::text
FROM cms_pages
WHERE page_key = 'contact';
`, postgresUser, postgresDb);
  const lines = output.split('\n').map((line) => line.trim()).filter(Boolean);

  if (lines.length !== 1) {
    throw new Error(`Expected one Contact CMS row, received ${lines.length}.`);
  }

  const row = JSON.parse(lines[0]);
  if (!row?.content_ko || !row?.content_en) {
    throw new Error('Contact CMS row is missing Korean or English content.');
  }

  return row;
}

function createBackup(backupRoot, row, postgresUser, postgresDb) {
  const backupDir = path.join(backupRoot, `contact-faq-migration-${timestampForFilename(new Date().toISOString())}`);
  mkdirSync(backupDir, {recursive: true});
  writeFileSync(
    path.join(backupDir, 'contact-page-before.json'),
    `${JSON.stringify(row, null, 2)}\n`,
    'utf8'
  );

  const dump = runDocker([
    'compose', 'exec', '-T', 'postgres',
    'pg_dump', '-U', postgresUser, '-d', postgresDb,
    '--table=cms_pages', '--data-only', '--column-inserts'
  ]);
  writeFileSync(path.join(backupDir, 'cms-pages-before.sql'), dump, 'utf8');
  return backupDir;
}

function applyMigration(previous, next, postgresUser, postgresDb) {
  const sql = `
DO $daeho_contact_faq_migration$
DECLARE
  changed_rows integer;
BEGIN
  UPDATE cms_pages
  SET
    content_ko = ${jsonbLiteral(next.ko, 'daeho_contact_next_ko')},
    content_en = ${jsonbLiteral(next.en, 'daeho_contact_next_en')},
    updated_at = now()
  WHERE page_key = 'contact'
    AND content_ko = ${jsonbLiteral(previous.content_ko, 'daeho_contact_previous_ko')}
    AND content_en = ${jsonbLiteral(previous.content_en, 'daeho_contact_previous_en')};

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Contact CMS content changed after the migration plan was read; no update was applied.';
  END IF;
END;
$daeho_contact_faq_migration$;
`;

  runPsql(sql, postgresUser, postgresDb);
}

function jsonbLiteral(value, tag) {
  const json = JSON.stringify(value);
  const delimiter = `$${tag}$`;
  if (json.includes(delimiter)) {
    throw new Error(`CMS JSON unexpectedly contains the SQL delimiter ${delimiter}.`);
  }
  return `${delimiter}${json}${delimiter}::jsonb`;
}

function runPsql(sql, postgresUser, postgresDb) {
  return runDocker([
    'compose', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
    '-U', postgresUser, '-d', postgresDb
  ], sql);
}

function runDocker(args, input = '') {
  const result = spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    input,
    env: process.env
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `docker exited with ${result.status}`).trim());
  }

  return result.stdout;
}

function loadEnvFile(filename) {
  if (!existsSync(filename)) {
    return;
  }

  for (const rawLine of readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readJson(filename) {
  return JSON.parse(readFileSync(filename, 'utf8'));
}

function timestampForFilename(value) {
  return value.replace(/[:.]/g, '-');
}
