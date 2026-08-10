import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {getNotificationHealth} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getNotificationHealth(), {
    headers: {'Cache-Control': 'no-store'}
  });
}
