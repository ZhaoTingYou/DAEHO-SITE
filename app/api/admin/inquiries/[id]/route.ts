import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {
  maxAdminJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {
  CmsBackendError,
  getInquiryDetail,
  updateInquiryStatus
} from '@/lib/cms/repositories';
import {inquiryStatusSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:read');

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;
  const detail = await getInquiryDetail(id);

  if (!detail) {
    return NextResponse.json({error: 'Inquiry not found'}, {status: 404});
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:write');

  if (unauthorized) {
    return unauthorized;
  }

  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, inquiryStatusSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {id} = await context.params;
  try {
    const detail = await updateInquiryStatus(id, parsed.data);
    return detail
      ? NextResponse.json(detail)
      : NextResponse.json({error: 'Inquiry not found'}, {status: 404});
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
