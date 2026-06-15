import {getCmsDb, nowIso} from './db';

export const cmsExportTables = [
  'cms_pages',
  'cms_news',
  'cms_news_translations',
  'cms_collections',
  'cms_collection_translations',
  'cms_media',
  'cms_inquiries',
  'cms_email_events'
] as const;

export type CmsExportTable = (typeof cmsExportTables)[number];
export type CmsExportSnapshot = {
  exportedAt: string;
  schemaVersion: number;
  tables: Record<CmsExportTable, Array<Record<string, unknown>>>;
};

export function getCmsExportSnapshot(): CmsExportSnapshot {
  const db = getCmsDb();
  const tables = Object.fromEntries(
    cmsExportTables.map((table) => [
      table,
      normalizeExportRows(table, db.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>)
    ])
  ) as CmsExportSnapshot['tables'];

  return {
    exportedAt: nowIso(),
    schemaVersion: 1,
    tables
  };
}

export function getCmsExportCounts(snapshot: CmsExportSnapshot) {
  return cmsExportTables.map((table) => ({
    table,
    count: snapshot.tables[table].length
  }));
}

export function getCmsExportFilename(exportedAt = nowIso()) {
  return `deaho-cms-export-${exportedAt.replace(/[:.]/g, '-')}.json`;
}

function normalizeExportRows(table: CmsExportTable, rows: Array<Record<string, unknown>>) {
  if (table === 'cms_news_translations' || table === 'cms_collection_translations') {
    return rows.filter((row) => row.locale === 'ko' || row.locale === 'en');
  }

  if (table === 'cms_pages') {
    return rows.map((row) => omitColumns(row, ['content_zh', 'seo_zh']));
  }

  if (table === 'cms_media') {
    return rows.map((row) => omitColumns(row, ['alt_zh']));
  }

  return rows;
}

function omitColumns(row: Record<string, unknown>, columns: string[]) {
  const ignored = new Set(columns);
  return Object.fromEntries(Object.entries(row).filter(([column]) => !ignored.has(column)));
}
