import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';
import {CmsBackendError, createInquiryStatus, listInquiryStatuses} from '@/lib/cms/repositories';
import {inquiryStatusDefinitionSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:read');
  if (unauthorized) return unauthorized;
  return NextResponse.json({items: await listInquiryStatuses()});
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:write');
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const parsed = await parseJsonBody(request, inquiryStatusDefinitionSchema);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const created = await createInquiryStatus(parsed.data);
    return NextResponse.json(created, {status: 201});
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
