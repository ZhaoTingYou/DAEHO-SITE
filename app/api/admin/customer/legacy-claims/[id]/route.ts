import {NextResponse, type NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {customerServiceHeaders} from '@/lib/customer/server';

type PendingClaim = {id: string; customerId: string; inquiryId: string};

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const {id} = await context.params;
  const input = await request.json() as {status?: string; reason?: string};
  if (!['approved', 'rejected'].includes(input.status ?? '') || !input.reason?.trim()) {
    return NextResponse.json({error: 'Status and review reason are required'}, {status: 400});
  }
  const customerBase = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!customerBase) return NextResponse.json({error: 'Customer service is not configured'}, {status: 503});
  const pendingResponse = await fetch(`${customerBase}/v1/internal/admin/legacy-claims`, {
    headers: customerServiceHeaders(), cache: 'no-store', signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  if (!pendingResponse?.ok) return NextResponse.json({error: 'Unable to load claim'}, {status: 502});
  const claim = ((await pendingResponse.json()) as PendingClaim[]).find((item) => item.id === id);
  if (!claim) return NextResponse.json({error: 'Pending claim not found'}, {status: 404});

  const reviewResponse = await fetch(
    `${customerBase}/v1/internal/admin/legacy-claims/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {'content-type': 'application/json', ...customerServiceHeaders()},
      body: JSON.stringify({
        status: input.status, reviewer: 'cms-admin', reason: input.reason.trim()
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000)
    }
  ).catch(() => null);
  if (!reviewResponse) return NextResponse.json({error: 'Customer service is unavailable'}, {status: 503});
  return new NextResponse(await reviewResponse.text(), {
    status: reviewResponse.status,
    headers: {'content-type': reviewResponse.headers.get('content-type') ?? 'application/json'}
  });
}
