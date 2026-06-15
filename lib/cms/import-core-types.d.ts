declare module '@/lib/cms/import-core.mjs' {
  import type {Database} from 'better-sqlite3';

  export const cmsImportTables: readonly [
    'cms_pages',
    'cms_news',
    'cms_news_translations',
    'cms_collections',
    'cms_collection_translations',
    'cms_media',
    'cms_inquiries',
    'cms_email_events'
  ];

  export const cmsImportDeleteTables: readonly string[];

  export type CmsImportTable = (typeof cmsImportTables)[number];
  export type CmsImportSnapshot = {
    exportedAt?: string;
    schemaVersion: 1;
    tables: Record<CmsImportTable, Array<Record<string, string | number | null>>>;
  };

  export function readCmsImportSnapshotFromText(value: string): CmsImportSnapshot;
  export function validateCmsImportSnapshot(snapshot: unknown): asserts snapshot is CmsImportSnapshot;
  export function getCmsImportCounts(snapshot: CmsImportSnapshot): Array<{table: CmsImportTable; count: number}>;
  export function importCmsSnapshot(db: Database, snapshot: CmsImportSnapshot): void;
}
