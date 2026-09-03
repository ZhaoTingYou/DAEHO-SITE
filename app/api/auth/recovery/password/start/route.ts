import type {NextRequest} from 'next/server';

import {proxyRecoveryRequest} from '@/lib/customer/recovery-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return proxyRecoveryRequest(request, '/v1/recovery/password/start', {idempotency: true});
}
