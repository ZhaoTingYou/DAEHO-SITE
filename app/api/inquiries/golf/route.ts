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
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {isSameOriginMutation} from '@/lib/customer/request-security';
import {toDomesticInquiryPhone} from '@/lib/inquiry-phone-core.mjs';
import {
  accountFeatureSettings,
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

  const parsed = await parseJsonBody(request, golfInquirySchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!(await isGolfEnabledForSite())) {
    return NextResponse.json({error: 'Not found'}, {status: 404});
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
  const features = await accountFeatureSettings();
  if (features.inquiryAccountRequired && !profile) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  const inquiryData = profile ? {
    ...parsed.data,
    name: profile.legalName || profile.displayName || parsed.data.name,
    phone: toDomesticInquiryPhone(profile.phone),
    email: profile.email || parsed.data.email,
    team: profile.team || parsed.data.team
  } : parsed.data;
  const unsafe = rejectUnsafeInquiry({
    source: 'golf',
    payload: inquiryData,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    allowedPagePathPrefixes: ['/ko/golf/inquiry', '/en/golf/inquiry']
  });

  if (unsafe) {
    return unsafe;
  }

  const result = await createGolfInquiry(
    inquiryData,
    requestMeta,
    profile ? customerServiceHeaders(profile.customerId) : undefined
  );

  if (!result?.inquiry) {
    return NextResponse.json({error: 'Failed to create inquiry'}, {status: 500});
  }

  return NextResponse.json(result, {status: 201});
}
