import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {CmsBackendError, resendInquiryNotification} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;

  try {
    return NextResponse.json(await resendInquiryNotification(id));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }

    throw error;
  }
}
