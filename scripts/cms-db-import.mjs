import {copyFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {cmsDeleteTables, cmsTables} from './cms-tables.mjs';

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

const snapshot = readSnapshot(resolvedInputPath);
const counts = cmsTables.map((table) => ({
  table,
  count: snapshot.tables[table].length
}));

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

const importSnapshot = db.transaction(() => {
  for (const table of cmsDeleteTables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  for (const table of cmsTables) {
    const tableColumns = getTableColumns(db, table);

    for (const row of snapshot.tables[table]) {
      insertRow(db, table, tableColumns, row);
    }
  }
});

try {
  importSnapshot();
  console.log('CMS import completed.');
} finally {
  db.close();
}

function readSnapshot(filePath) {
  let parsed;

  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read CMS import JSON: ${error.message}`);
  }

  validateSnapshot(parsed);
  return parsed;
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Invalid CMS import file: root value must be an object.');
  }

  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported CMS export schemaVersion: ${snapshot.schemaVersion}`);
  }

  if (!snapshot.tables || typeof snapshot.tables !== 'object' || Array.isArray(snapshot.tables)) {
    throw new Error('Invalid CMS import file: tables must be an object.');
  }

  const unexpectedTables = Object.keys(snapshot.tables).filter((table) => !cmsTables.includes(table));

  if (unexpectedTables.length > 0) {
    throw new Error(`Invalid CMS import file: unexpected tables ${unexpectedTables.join(', ')}`);
  }

  for (const table of cmsTables) {
    const rows = snapshot.tables[table];

    if (!Array.isArray(rows)) {
      throw new Error(`Invalid CMS import file: ${table} must be an array.`);
    }

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Invalid CMS import file: ${table}[${index}] must be an object.`);
      }

      for (const [column, value] of Object.entries(row)) {
        if (!isSqliteValue(value)) {
          throw new Error(`Invalid CMS import file: ${table}[${index}].${column} is not a scalar value.`);
        }
      }
    });
  }
}

function getTableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function insertRow(db, table, tableColumns, row) {
  const tableColumnSet = new Set(tableColumns);
  const unknownColumns = Object.keys(row).filter((column) => !tableColumnSet.has(column));

  if (unknownColumns.length > 0) {
    throw new Error(`Cannot import ${table}: unknown columns ${unknownColumns.join(', ')}`);
  }

  const columns = tableColumns.filter((column) => Object.hasOwn(row, column));

  if (columns.length === 0) {
    return;
  }

  db.prepare(
    `INSERT INTO ${table} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns
      .map((column) => `@${column}`)
      .join(', ')})`
  ).run(row);
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isSqliteValue(value) {
  return value === null || ['string', 'number'].includes(typeof value);
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
