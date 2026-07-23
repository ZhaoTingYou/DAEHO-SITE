import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {CmsBackendError, cmsBackendRequest} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
  }

  try {
    const response = await cmsBackendRequest<{accepted: boolean; inserted: boolean}>(
      '/api/cms/analytics/page-view',
      {method: 'POST', body}
    );
    return NextResponse.json(response, {status: response.inserted ? 202 : 200});
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }

    throw error;
  }
}
