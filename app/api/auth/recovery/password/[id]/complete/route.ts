import type {NextRequest} from 'next/server';

import {proxyRecoveryRequest} from '@/lib/customer/recovery-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  return proxyRecoveryRequest(
    request,
    `/v1/recovery/password/${encodeURIComponent(id)}/complete`,
    {idempotency: true}
  );
}
