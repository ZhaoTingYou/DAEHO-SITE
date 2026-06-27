import {mkdirSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import type {Database as SqliteDatabase} from 'better-sqlite3';

let cmsDb: SqliteDatabase | null = null;

export function getCmsDb() {
  if (!cmsDb) {
    const dbPath = getCmsDbPath();
    mkdirSync(path.dirname(dbPath), {recursive: true});

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.exec(readFileSync(path.join(process.cwd(), 'database', 'cms-schema.sql'), 'utf8'));
    cmsDb = db;
  }

  return cmsDb;
}

export function getCmsDbPath() {
  if (process.env.CMS_DB_PATH) {
    return process.env.CMS_DB_PATH;
  }

  if (process.env.VERCEL) {
    return path.join(tmpdir(), 'daeho-cms.sqlite');
  }

  return path.join(process.cwd(), 'data', 'cms.sqlite');
}

export function nowIso() {
  return new Date().toISOString();
}

export function jsonStringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function jsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
