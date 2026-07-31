import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {
  maxAdminJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {createCollection, listCollections} from '@/lib/cms/repositories';
import {collectionPayloadSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({items: await listCollections()});
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, collectionPayloadSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  return NextResponse.json({item: await createCollection(parsed.data)}, {status: 201});
}
