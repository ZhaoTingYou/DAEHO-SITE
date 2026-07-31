import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {CmsBackendError, retryNotificationJob} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{jobId: string}>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const {jobId} = await context.params;
  try {
    return NextResponse.json(await retryNotificationJob(jobId));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
