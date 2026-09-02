import {NextResponse} from 'next/server';

import {
  accountsEnabled,
  clearCustomerSessionCookie,
  currentCustomerProfile,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET() {
  if (!accountsEnabled()) {
    return NextResponse.json({authenticated: false, enabled: false, inquiryAccountRequired: false});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({authenticated: false, enabled: true, inquiryAccountRequired: process.env.INQUIRY_ACCOUNT_REQUIRED === 'true'});
  }
  try {
    const profile = await currentCustomerProfile(session);
    const response = NextResponse.json({authenticated: true, enabled: true, profile, inquiryAccountRequired: process.env.INQUIRY_ACCOUNT_REQUIRED === 'true'});
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    const status = (error as {status?: number}).status;
    const response = NextResponse.json({authenticated: false, enabled: true, needsProvisioning: status === 428, inquiryAccountRequired: process.env.INQUIRY_ACCOUNT_REQUIRED === 'true'});
    if (status !== 428) {
      clearCustomerSessionCookie(response);
    }
    return response;
  }
}
