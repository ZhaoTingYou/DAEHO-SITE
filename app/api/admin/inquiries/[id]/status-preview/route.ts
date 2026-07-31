import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';
import {CmsBackendError, previewInquiryStatus} from '@/lib/cms/repositories';
import {inquiryStatusSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;

  const parsed = await parseJsonBody(request, inquiryStatusSchema);
  if (!parsed.success) return validationError(parsed.error);

  const {id} = await context.params;
  try {
    return NextResponse.json(await previewInquiryStatus(id, parsed.data));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
