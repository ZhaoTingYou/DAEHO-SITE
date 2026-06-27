import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {
  getRequestMeta,
  maxPublicJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {createGolfInquiry} from '@/lib/cms/repositories';
import {golfInquirySchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const oversized = rejectOversizedRequest(request, maxPublicJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, golfInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await createGolfInquiry(parsed.data, getRequestMeta(request));

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
