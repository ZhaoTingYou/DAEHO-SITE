import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {hasAdminCapability} from '@/lib/cms/admin-authorization-core.mjs';
import {getAdminIdentity} from '@/lib/cms/admin-session';
import {getCmsExportFilename, getCmsExportSnapshot} from '@/lib/cms/export';
import {getExternalUrl} from '@/lib/request-origin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.redirect(getExternalUrl(request, '/admin/login'));
  }
  if (identity.mustChangePassword || !hasAdminCapability(identity.role, 'system:manage')) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
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
