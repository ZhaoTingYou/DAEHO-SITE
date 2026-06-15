import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {hasAdminSession} from '@/lib/cms/admin-session';
import {getCmsExportFilename, getCmsExportSnapshot} from '@/lib/cms/export';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const snapshot = getCmsExportSnapshot();

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${getCmsExportFilename(snapshot.exportedAt)}"`,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
