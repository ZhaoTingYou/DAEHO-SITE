import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {cmsTables} from './cms-tables.mjs';

const dbPath = process.env.CMS_DB_PATH ?? path.join(process.cwd(), 'data', 'cms.sqlite');
const useStdout = process.argv.includes('--stdout');
const explicitOutput = process.argv.find((arg) => arg.startsWith('--output='));

if (!existsSync(dbPath)) {
  console.error(`CMS database does not exist: ${dbPath}`);
  console.error('Run npm run cms:init first, or set CMS_DB_PATH to an existing database.');
  process.exit(1);
}

const db = new Database(dbPath, {readonly: true, fileMustExist: true});
const exportedAt = new Date().toISOString();
const snapshot = {
  exportedAt,
  schemaVersion: 1,
  tables: Object.fromEntries(cmsTables.map((table) => [table, db.prepare(`SELECT * FROM ${table}`).all()]))
};
const json = `${JSON.stringify(snapshot, null, 2)}\n`;

if (useStdout) {
  process.stdout.write(json);
} else {
  const outputPath = explicitOutput
    ? path.resolve(explicitOutput.slice('--output='.length))
    : path.join(
      process.cwd(),
      'artifacts',
      'cms-exports',
      `daeho-cms-export-${exportedAt.replace(/[:.]/g, '-')}.json`
    );

  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, json, 'utf8');
  console.log(`CMS export written to ${outputPath}`);
}

db.close();
