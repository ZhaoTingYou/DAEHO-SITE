import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {getCmsExportFilename, getCmsExportSnapshot} from '@/lib/cms/export';
import {requireAdminCapability} from '@/lib/cms/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'system:manage');

  if (unauthorized) {
    return unauthorized;
  }

  const snapshot = await getCmsExportSnapshot();

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${getCmsExportFilename(snapshot.exportedAt)}"`,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
