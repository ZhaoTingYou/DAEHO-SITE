import {NextResponse} from 'next/server';

import {
  accountFeatureSettings,
  clearCustomerSessionCookie,
  currentCustomerProfile,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET() {
  const features = await accountFeatureSettings();
  if (!features.customerAccountsEnabled) {
    return NextResponse.json({authenticated: false, enabled: false, inquiryAccountRequired: false});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({authenticated: false, enabled: true, inquiryAccountRequired: features.inquiryAccountRequired});
  }
  try {
    const profile = await currentCustomerProfile(session);
    const response = NextResponse.json({authenticated: true, enabled: true, profile, inquiryAccountRequired: features.inquiryAccountRequired});
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    const status = (error as {status?: number}).status;
    const response = NextResponse.json({authenticated: false, enabled: true, needsProvisioning: status === 428, inquiryAccountRequired: features.inquiryAccountRequired});
    if (status !== 428) {
      clearCustomerSessionCookie(response);
    }
    return response;
  }
}
