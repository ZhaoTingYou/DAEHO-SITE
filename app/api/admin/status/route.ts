import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {getCmsStatus} from '@/lib/cms/status';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'system:manage');

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json(await getCmsStatus(), {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
