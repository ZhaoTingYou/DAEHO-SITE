import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {accountsEnabled} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: {params: Promise<{id: string}>}) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Phone verification is not enabled'}, {status: 404});
  }
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const baseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    return NextResponse.json({error: 'Phone verification is not configured'}, {status: 503});
  }
  const {id} = await context.params;
  const response = await fetch(`${baseUrl}/v1/verifications/sms/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: await request.text(),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  if (!response) {
    return NextResponse.json({error: 'Phone verification is unavailable'}, {status: 503});
  }
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {'content-type': response.headers.get('content-type') ?? 'application/json'}
  });
}
