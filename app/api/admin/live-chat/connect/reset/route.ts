import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {CmsBackendError, resetTelegramLiveChatSetup} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await resetTelegramLiveChatSetup());
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
