import {NextResponse} from 'next/server';

import {
  accountsEnabled,
  currentCustomerProfile,
  customerServiceHeaders,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';
import type {CustomerInquiry} from '@/lib/customer/types';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Customer accounts are not enabled'}, {status: 404});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  try {
    const profile = await currentCustomerProfile(session);
    const cmsBase = (process.env.CMS_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
    const cmsResponse = await fetch(`${cmsBase}/api/customer/inquiries?customerId=${encodeURIComponent(profile.customerId)}`, {
      headers: customerServiceHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000)
    });
    if (!cmsResponse.ok) {
      return NextResponse.json({error: 'Inquiry service request failed'}, {status: 502});
    }
    const payload = await cmsResponse.json() as {items: CustomerInquiry[]};
    const response = NextResponse.json(payload);
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    return NextResponse.json({error: 'Inquiry service request failed'}, {status: (error as {status?: number}).status ?? 502});
  }
}
