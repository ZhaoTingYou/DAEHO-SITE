import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {parseJsonBody, validationError} from '@/lib/cms/http';
import {deleteNews, getNews, updateNews} from '@/lib/cms/repositories';
import {newsPayloadSchema} from '@/lib/cms/validation';

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
  const item = getNews(id);

  if (!item) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonBody(request, newsPayloadSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {id} = await context.params;
  const item = updateNews(id, parsed.data);

  if (!item) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({item});
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {id} = await context.params;

  if (!deleteNews(id)) {
    return NextResponse.json({error: 'News item not found'}, {status: 404});
  }

  return NextResponse.json({ok: true});
}
