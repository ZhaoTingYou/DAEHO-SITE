import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {getCmsStatus} from '@/lib/cms/status';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json(getCmsStatus(), {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
