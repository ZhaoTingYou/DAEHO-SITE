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
      db.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>
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
