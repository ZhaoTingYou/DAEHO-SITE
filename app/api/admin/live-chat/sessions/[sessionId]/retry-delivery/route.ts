import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {CmsBackendError, retryTelegramLiveChatDelivery} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

type RouteContext = {params: Promise<{sessionId: string}>};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  const {sessionId} = await context.params;
  try {
    return NextResponse.json(await retryTelegramLiveChatDelivery(sessionId));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
