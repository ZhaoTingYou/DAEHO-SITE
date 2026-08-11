declare module '@/lib/cms/import-core.mjs' {
  import type {Database} from 'better-sqlite3';

  export const cmsImportTables: readonly [
    'cms_pages',
    'cms_news',
    'cms_news_translations',
    'cms_collections',
    'cms_collection_translations',
    'cms_media',
    'cms_inquiry_statuses',
    'cms_inquiries',
    'cms_email_events',
    'cms_inquiry_status_events',
    'cms_notification_settings',
    'cms_notification_templates',
    'cms_notification_jobs',
    'cms_notification_attempts'
  ];

  export const cmsImportDeleteTables: readonly string[];

  export type CmsImportTable = (typeof cmsImportTables)[number];
  export type CmsImportSnapshot = {
    exportedAt?: string;
    schemaVersion: 1;
    tables: Partial<Record<CmsImportTable, Array<Record<string, string | number | null>>>>;
  };

  export function readCmsImportSnapshotFromText(value: string): CmsImportSnapshot;
  export function validateCmsImportSnapshot(snapshot: unknown): asserts snapshot is CmsImportSnapshot;
  export function getCmsImportCounts(snapshot: CmsImportSnapshot): Array<{table: CmsImportTable; count: number}>;
  export function importCmsSnapshot(db: Database, snapshot: CmsImportSnapshot): void;
}
