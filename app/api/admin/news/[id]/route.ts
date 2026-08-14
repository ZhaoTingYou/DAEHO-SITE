import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {
  maxAdminJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {deleteNews, getNews, updateNews} from '@/lib/cms/repositories';
import {newsPayloadSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'content:read');

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;
  const item = await getNews(id);

  if (!item) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'content:write');

  if (unauthorized) {
    return unauthorized;
  }

  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);

  if (oversized) {
    return oversized;
  }

  const parsed = await parseJsonBody(request, newsPayloadSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {id} = await context.params;
  const item = await updateNews(id, parsed.data);

  if (!item) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminCapability(request, 'content:delete');

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;

  if (!(await deleteNews(id))) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({ok: true});
}
