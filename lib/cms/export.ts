import 'server-only';

import {cmsBackendRequest} from './repositories';

export const cmsExportTables = [
  'cms_pages',
  'cms_news',
  'cms_news_translations',
  'cms_collections',
  'cms_collection_translations',
  'cms_media',
  'cms_inquiries',
  'cms_email_events',
  'cms_inquiry_status_events',
  'cms_notification_settings',
  'cms_notification_templates',
  'cms_notification_jobs',
  'cms_notification_attempts'
] as const;

export type CmsExportTable = (typeof cmsExportTables)[number];
export type CmsExportSnapshot = {
  exportedAt: string;
  schemaVersion: number;
  tables: Record<CmsExportTable, Array<Record<string, unknown>>>;
};

export async function getCmsExportSnapshot(): Promise<CmsExportSnapshot> {
  return cmsBackendRequest<CmsExportSnapshot>('/api/admin/export', {admin: true});
}

export function getCmsExportCounts(snapshot: CmsExportSnapshot) {
  return cmsExportTables.map((table) => ({
    table,
    count: snapshot.tables[table].length
  }));
}

export function getCmsExportFilename(exportedAt = new Date().toISOString()) {
  return `daeho-cms-export-${exportedAt.replace(/[:.]/g, '-')}.json`;
}
