import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {notifyInquiry} from '@/lib/cms/email';
import {getRequestMeta, parseJsonBody, validationError} from '@/lib/cms/http';
import {createContactInquiry} from '@/lib/cms/repositories';
import {contactInquirySchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, contactInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const inquiry = createContactInquiry(parsed.data, getRequestMeta(request));

  if (!inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  const email = await notifyInquiry(inquiry);
  return NextResponse.json({inquiry, email}, {status: 201});
}
