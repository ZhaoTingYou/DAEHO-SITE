import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {maxImportBodyBytes, rejectOversizedRequest} from '@/lib/cms/http';
import {getCmsBackendBaseUrl} from '@/lib/cms/repositories';
import {revalidateAllPublicCmsCache, revalidatePathsSafely} from '@/lib/cms/public-cache';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'system:manage');

  if (unauthorized) {
    return unauthorized;
  }

  const shouldReplace = request.nextUrl.searchParams.get('replace') === '1';
  const oversized = rejectOversizedRequest(request, maxImportBodyBytes);

  if (oversized) {
    return oversized;
  }

  const response = await fetch(`${getCmsBackendBaseUrl()}/api/admin/import${shouldReplace ? '?replace=1' : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': process.env.CMS_BACKEND_API_KEY || process.env.CMS_ADMIN_API_KEY || ''
    },
    body: await request.text(),
    cache: 'no-store'
  });
  const body = await response.text();

  if (response.ok && shouldReplace) {
    revalidateAllPublicCmsCache();
    revalidateCmsPaths();
  }

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8'
    }
  });
}

function revalidateCmsPaths() {
  revalidatePathsSafely([
    '/admin',
    '/admin/collections',
    '/admin/export',
    '/admin/inquiries',
    '/admin/media',
    '/admin/news',
    '/admin/pages'
  ]);
}
