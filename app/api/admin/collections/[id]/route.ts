import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {
  maxAdminJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {
  deleteCollection,
  getCollection,
  updateCollection
} from '@/lib/cms/repositories';
import {collectionPayloadSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;
  const item = await getCollection(id);

  if (!item) {
    return NextResponse.json({error: 'Collection item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

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

  const {id} = await context.params;
  const item = await updateCollection(id, parsed.data);

  if (!item) {
    return NextResponse.json({error: 'Collection item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;

  if (!(await deleteCollection(id))) {
    return NextResponse.json({error: 'Collection item not found'}, {status: 404});
  }

  return NextResponse.json({ok: true});
}
