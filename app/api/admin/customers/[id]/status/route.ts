import {NextResponse, type NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {customerServiceHeaders} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const baseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!baseUrl) return NextResponse.json({error: 'Customer service is not configured'}, {status: 503});
  const {id} = await context.params;
  const input = await request.json() as {status?: string};
  const response = await fetch(
    `${baseUrl}/v1/internal/admin/customers/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: {'content-type': 'application/json', ...customerServiceHeaders()},
      body: JSON.stringify({status: input.status, actor: 'cms-admin'}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000)
    }
  ).catch(() => null);
  if (!response) return NextResponse.json({error: 'Customer service is unavailable'}, {status: 503});
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {'content-type': response.headers.get('content-type') ?? 'application/json'}
  });
}
