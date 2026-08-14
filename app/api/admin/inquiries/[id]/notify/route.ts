import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:write');
  if (unauthorized) return unauthorized;
  return NextResponse.json(
    {error: 'Legacy inquiry email resend was replaced by per-channel notification job retry.'},
    {status: 410}
  );
}
