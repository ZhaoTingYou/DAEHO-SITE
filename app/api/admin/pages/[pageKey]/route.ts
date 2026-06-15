import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {parseJsonBody, validationError} from '@/lib/cms/http';
import {getPage, upsertPage} from '@/lib/cms/repositories';
import {pagePayloadSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{pageKey: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {pageKey} = await context.params;
  const page = getPage(pageKey);

  if (!page) {
    return NextResponse.json({error: 'Page not found'}, {status: 404});
  }

  return NextResponse.json({page});
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonBody(request, pagePayloadSchema);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {pageKey} = await context.params;
  const page = upsertPage(pageKey, parsed.data);
  return NextResponse.json({page});
}
