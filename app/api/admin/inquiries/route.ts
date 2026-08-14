import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {listInquiries} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'inquiries:read');

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({
    items: await listInquiries({
      status: request.nextUrl.searchParams.get('status') ?? undefined,
      source: request.nextUrl.searchParams.get('source') ?? undefined
    })
  });
}
