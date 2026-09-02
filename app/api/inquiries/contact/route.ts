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
import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  currentCustomerProfile,
  customerServiceHeaders,
  refreshedCustomerSession
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const oversized = rejectOversizedRequest(request, maxPublicJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, contactInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const requestMeta = getRequestMeta(request);
  const session = await refreshedCustomerSession();
  let profile = null;
  if (session) {
    try {
      profile = await currentCustomerProfile(session);
    } catch {
      profile = null;
    }
  }
  if (process.env.INQUIRY_ACCOUNT_REQUIRED === 'true' && !profile) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  const inquiryData = profile ? {
    ...parsed.data,
    name: profile.legalName || profile.displayName || parsed.data.name,
    phone: profile.phone,
    email: profile.email || parsed.data.email,
    organization: profile.organization || parsed.data.organization
  } : parsed.data;
  const unsafe = rejectUnsafeInquiry({
    source: 'contact',
    payload: inquiryData,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    allowedPagePathPrefixes: ['/ko/contact', '/en/contact']
  });

  if (unsafe) {
    return unsafe;
  }

  const result = await createContactInquiry(
    inquiryData,
    requestMeta,
    profile ? customerServiceHeaders(profile.customerId) : undefined
  );

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
