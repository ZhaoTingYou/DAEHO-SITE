import {NextResponse} from 'next/server';

import {
  currentCustomerProfile,
  customerServiceHeaders,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  try {
    const profile = await currentCustomerProfile(session);
    const {id} = await context.params;
    const cmsBase = (process.env.CMS_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
    const cmsResponse = await fetch(
      `${cmsBase}/api/customer/inquiries/${encodeURIComponent(id)}?customerId=${encodeURIComponent(profile.customerId)}`,
      {headers: customerServiceHeaders(), cache: 'no-store', signal: AbortSignal.timeout(8_000)}
    );
    if (!cmsResponse.ok) {
      return NextResponse.json({error: cmsResponse.status === 404 ? 'Inquiry not found' : 'Inquiry service request failed'}, {
        status: cmsResponse.status === 404 ? 404 : 502
      });
    }
    const response = NextResponse.json(await cmsResponse.json());
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    return NextResponse.json({error: 'Inquiry service request failed'}, {status: (error as {status?: number}).status ?? 502});
  }
}
