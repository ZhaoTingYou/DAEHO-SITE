import {copyFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {
  getCmsImportCounts,
  importCmsSnapshot,
  readCmsImportSnapshotFromText
} from '../lib/cms/import-core.mjs';

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith('--'));
const shouldReplace = args.includes('--replace');
const skipBackup = args.includes('--no-backup');
const showHelp = args.includes('--help') || args.includes('-h');
const dbPath = process.env.CMS_DB_PATH ?? path.join(process.cwd(), 'data', 'cms.sqlite');

if (showHelp || !inputPath) {
  printUsage();
  process.exit(showHelp ? 0 : 1);
}

const resolvedInputPath = path.resolve(inputPath);

if (!existsSync(resolvedInputPath)) {
  console.error(`CMS import file does not exist: ${resolvedInputPath}`);
  process.exit(1);
}

const snapshot = readCmsImportSnapshotFromText(readFileSync(resolvedInputPath, 'utf8'));
const counts = getCmsImportCounts(snapshot);

console.log(`CMS import file: ${resolvedInputPath}`);
console.log(`Target database: ${dbPath}`);
console.log(`Schema version: ${snapshot.schemaVersion}`);
console.table(counts);

if (!shouldReplace) {
  console.log('Dry run only. Add --replace to replace the target CMS tables.');
  process.exit(0);
}

mkdirSync(path.dirname(dbPath), {recursive: true});

if (existsSync(dbPath) && !skipBackup) {
  const backupPath = `${dbPath}.pre-import-${timestampForFilename(new Date().toISOString())}.bak`;
  copyFileSync(dbPath, backupPath);
  console.log(`Pre-import database backup written to ${backupPath}`);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(readFileSync(path.join(process.cwd(), 'database', 'cms-schema.sql'), 'utf8'));

try {
  importCmsSnapshot(db, snapshot);
  console.log('CMS import completed.');
} finally {
  db.close();
}

function timestampForFilename(value) {
  return value.replace(/[:.]/g, '-');
}

function printUsage() {
  console.log(`Usage:
  npm run cms:import -- /absolute/path/deaho-cms-export.json
  npm run cms:import -- /absolute/path/deaho-cms-export.json --replace

Options:
  --replace     Replace all CMS tables with the import file.
  --no-backup   Skip the automatic .bak copy before replacing an existing database.
  --help        Show this help message.

Environment:
  CMS_DB_PATH=/absolute/path/cms.sqlite`);
}
