import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {restoreAdminApiSession} from '@/lib/cms/admin-session';
import {hasSameOrigin} from '@/lib/cms/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  if (!(await restoreAdminApiSession())) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  return new NextResponse(null, {status: 204});
}
