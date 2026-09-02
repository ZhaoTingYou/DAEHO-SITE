import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  accountsEnabled,
  currentCustomerProfile,
  customerApiRequest,
  customerServiceHeaders,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET() {
  return handle('GET');
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  return handle('POST', await request.text());
}

async function handle(method: string, body?: string) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Customer accounts are not enabled'}, {status: 404});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  try {
    let payload = await customerApiRequest<Record<string, unknown> | Array<Record<string, unknown>>>(
      '/v1/me/legacy-claims', session, {method, body}
    );
    if (method === 'POST' && body && !Array.isArray(payload) && typeof payload.id === 'string') {
      const input = JSON.parse(body) as {inquiryId?: string; contact?: string};
      const profile = await currentCustomerProfile(session);
      const cmsBase = (process.env.CMS_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
      const matchResponse = await fetch(
        `${cmsBase}/api/customer/inquiries/${encodeURIComponent(input.inquiryId ?? '')}/claim`,
        {
          method: 'POST',
          headers: {'content-type': 'application/json', ...customerServiceHeaders()},
          body: JSON.stringify({customerId: profile.customerId, contact: input.contact}),
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000)
        }
      ).catch(() => null);
      const match = matchResponse?.ok
        ? await matchResponse.json() as {matched?: boolean; reason?: string}
        : {matched: false, reason: 'conflict'};
      const customerBase = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
      if (customerBase) {
        const evidence = await fetch(
          `${customerBase}/v1/internal/admin/legacy-claims/${encodeURIComponent(payload.id)}/match-result`,
          {
            method: 'PATCH',
            headers: {'content-type': 'application/json', ...customerServiceHeaders()},
            body: JSON.stringify({
              customerId: profile.customerId,
              result: match.reason ?? 'conflict'
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(8_000)
          }
        ).catch(() => null);
        if (match.matched && evidence?.ok) {
          const review = await fetch(
            `${customerBase}/v1/internal/admin/legacy-claims/${encodeURIComponent(payload.id)}`,
            {
              method: 'PATCH',
              headers: {'content-type': 'application/json', ...customerServiceHeaders()},
              body: JSON.stringify({
                status: 'approved', reviewer: 'system-exact-match', reason: 'exact contact match'
              }),
              cache: 'no-store',
              signal: AbortSignal.timeout(8_000)
            }
          ).catch(() => null);
          if (review?.ok) payload = await review.json();
        }
      }
    }
    const response = NextResponse.json(payload);
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    return NextResponse.json({error: 'Claim request failed'}, {status: (error as {status?: number}).status ?? 502});
  }
}
