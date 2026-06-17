import {revalidatePath} from 'next/cache';
import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {hasAdminSession} from '@/lib/cms/admin-session';
import {requireAdmin} from '@/lib/cms/auth';
import {getCmsDb} from '@/lib/cms/db';
import {
  getCmsImportCounts,
  importCmsSnapshot,
  readCmsImportSnapshotFromText
} from '@/lib/cms/import-core.mjs';
import {locales} from '@/lib/locales';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized && !(await hasAdminSession())) {
    return unauthorized;
  }

  const shouldReplace = request.nextUrl.searchParams.get('replace') === '1';

  try {
    const snapshot = readCmsImportSnapshotFromText(await request.text());
    const counts = getCmsImportCounts(snapshot);
    const totalRows = counts.reduce((total, item) => total + item.count, 0);

    if (!shouldReplace) {
      return NextResponse.json({
        dryRun: true,
        replaced: false,
        schemaVersion: snapshot.schemaVersion,
        exportedAt: snapshot.exportedAt ?? '',
        totalRows,
        counts
      });
    }

    importCmsSnapshot(getCmsDb(), snapshot);
    revalidateCmsPaths();

    return NextResponse.json({
      dryRun: false,
      replaced: true,
      schemaVersion: snapshot.schemaVersion,
      exportedAt: snapshot.exportedAt ?? '',
      totalRows,
      counts
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Invalid CMS import payload.'},
      {status: 400}
    );
  }
}

function revalidateCmsPaths() {
  const localizedPaths = locales.flatMap((locale) => [
    `/${locale}`,
    `/${locale}/news`,
    `/${locale}/mastery/creations`
  ]);

  for (const path of [
    '/admin',
    '/admin/collections',
    '/admin/export',
    '/admin/inquiries',
    '/admin/media',
    '/admin/news',
    '/admin/pages',
    ...localizedPaths,
    '/sitemap.xml'
  ]) {
    revalidatePath(path);
  }
}
