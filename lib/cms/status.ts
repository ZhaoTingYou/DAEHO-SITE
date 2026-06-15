import {existsSync, statSync} from 'node:fs';
import path from 'node:path';

import {getCmsDb, getCmsDbPath} from './db';
import {cmsExportTables, type CmsExportTable} from './export';

type CountRow = {
  count: number;
};

type TimestampRow = {
  created_at: string;
};

type MediaProviderRow = {
  storage_provider: string;
  count: number;
};

export type CmsStatus = ReturnType<typeof getCmsStatus>;

export function getCmsStatus() {
  const dbPath = getCmsDbPath();
  const existedBeforeOpen = existsSync(dbPath);
  const db = getCmsDb();
  const dbStats = readFileStats(dbPath);
  const tables = getTableCounts();
  const mediaProviders = db
    .prepare(
      `SELECT storage_provider, COUNT(*) AS count
      FROM cms_media
      GROUP BY storage_provider
      ORDER BY count DESC, storage_provider ASC`
    )
    .all() as MediaProviderRow[];

  return {
    checkedAt: new Date().toISOString(),
    database: {
      path: dbPath,
      directory: path.dirname(dbPath),
      existedBeforeOpen,
      exists: Boolean(dbStats),
      sizeBytes: dbStats?.size ?? 0,
      updatedAt: dbStats?.mtime.toISOString() ?? ''
    },
    environment: {
      nodeEnv: process.env.NODE_ENV ?? '',
      isVercel: Boolean(process.env.VERCEL),
      persistence: getPersistenceMode(dbPath),
      mediaStorage: mediaProviders.map((provider) => ({
        provider: provider.storage_provider || 'unknown',
        count: provider.count
      }))
    },
    security: {
      hasAdminApiKey: Boolean(process.env.CMS_ADMIN_API_KEY),
      hasAdminPassword: Boolean(process.env.CMS_ADMIN_PASSWORD),
      hasSessionSecret: Boolean(process.env.CMS_ADMIN_SESSION_SECRET)
    },
    email: {
      configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.CMS_NOTIFY_TO),
      hasSmtpHost: Boolean(process.env.SMTP_HOST),
      hasSender: Boolean(process.env.SMTP_FROM),
      hasRecipient: Boolean(process.env.CMS_NOTIFY_TO),
      hasSmtpAuth: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
    },
    latest: {
      inquiryCreatedAt: getLatestTimestamp('cms_inquiries'),
      emailEventCreatedAt: getLatestTimestamp('cms_email_events')
    },
    tables
  };
}

function getTableCounts() {
  const db = getCmsDb();

  return cmsExportTables.map((table) => ({
    table,
    count: (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as CountRow).count
  }));
}

function getLatestTimestamp(table: Extract<CmsExportTable, 'cms_inquiries' | 'cms_email_events'>) {
  const row = getCmsDb()
    .prepare(`SELECT created_at FROM ${table} ORDER BY created_at DESC LIMIT 1`)
    .get() as TimestampRow | undefined;

  return row?.created_at ?? '';
}

function readFileStats(filePath: string) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function getPersistenceMode(dbPath: string) {
  if (process.env.CMS_DB_PATH) {
    return 'configured';
  }

  if (process.env.VERCEL) {
    return 'ephemeral';
  }

  if (dbPath.includes(`${path.sep}data${path.sep}`)) {
    return 'local';
  }

  return 'unknown';
}
