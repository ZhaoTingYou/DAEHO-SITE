import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, rejectOversizedRequest} from '@/lib/cms/http';
import {CmsBackendError, setTelegramLiveChatEnabled} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const body = await request.json().catch(() => null) as {enabled?: boolean} | null;
  try {
    return NextResponse.json(await setTelegramLiveChatEnabled(body?.enabled === true));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
