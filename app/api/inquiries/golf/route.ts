import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {
  getRequestMeta,
  maxPublicJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {rejectUnsafeInquiry} from '@/lib/cms/inquiry-protection';
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

  const requestMeta = getRequestMeta(request);
  const unsafe = rejectUnsafeInquiry({
    source: 'golf',
    payload: parsed.data,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    allowedPagePathPrefixes: ['/ko/golf/inquiry', '/en/golf/inquiry']
  });

  if (unsafe) {
    return unsafe;
  }

  const result = await createGolfInquiry(parsed.data, requestMeta);

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
