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

  const requestMeta = getRequestMeta(request);
  const unsafe = rejectUnsafeInquiry({
    source: 'contact',
    payload: parsed.data,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  if (unsafe) {
    return unsafe;
  }

  const result = await createContactInquiry(parsed.data, requestMeta);

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
