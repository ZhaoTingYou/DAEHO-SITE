import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, rejectOversizedRequest} from '@/lib/cms/http';
import {CmsBackendError, sendNotificationTest} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const body = await request.json().catch(() => null) as {
    channel?: 'email' | 'kakao';
    recipient?: string;
    templateKey?: string;
  } | null;
  try {
    return NextResponse.json(await sendNotificationTest({
      channel: body?.channel === 'kakao' ? 'kakao' : 'email',
      recipient: body?.recipient ?? '',
      templateKey: body?.templateKey ?? ''
    }));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
