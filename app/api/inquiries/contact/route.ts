import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {
  getRequestMeta,
  maxPublicJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {createContactInquiry} from '@/lib/cms/repositories';
import {contactInquirySchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const oversized = rejectOversizedRequest(request, maxPublicJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, contactInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await createContactInquiry(parsed.data, getRequestMeta(request));

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
