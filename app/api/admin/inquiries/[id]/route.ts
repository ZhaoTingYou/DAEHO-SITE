import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {parseJsonBody, validationError} from '@/lib/cms/http';
import {
  getInquiry,
  listEmailEventsForInquiry,
  updateInquiryStatus
} from '@/lib/cms/repositories';
import {inquiryStatusSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;
  const inquiry = getInquiry(id);

  if (!inquiry) {
    return NextResponse.json({error: 'Inquiry not found'}, {status: 404});
  }

  return NextResponse.json({
    inquiry,
    emailEvents: listEmailEventsForInquiry(id)
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonBody(request, inquiryStatusSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {id} = await context.params;
  const inquiry = updateInquiryStatus(id, parsed.data);

  if (!inquiry) {
    return NextResponse.json({error: 'Inquiry not found'}, {status: 404});
  }

  return NextResponse.json({
    inquiry,
    emailEvents: listEmailEventsForInquiry(id)
  });
}
