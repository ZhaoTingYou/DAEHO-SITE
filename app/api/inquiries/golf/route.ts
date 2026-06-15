import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {notifyInquiry} from '@/lib/cms/email';
import {getRequestMeta, parseJsonBody, validationError} from '@/lib/cms/http';
import {createGolfInquiry} from '@/lib/cms/repositories';
import {golfInquirySchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, golfInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const inquiry = createGolfInquiry(parsed.data, getRequestMeta(request));

  if (!inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  const email = await notifyInquiry(inquiry);
  return NextResponse.json({inquiry, email}, {status: 201});
}
