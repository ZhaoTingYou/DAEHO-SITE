import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {getLocaleFromSearch} from '@/lib/cms/http';
import {getPublicCollection} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{slug: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const {slug} = await context.params;
  const locale = getLocaleFromSearch(request);
  const item = await getPublicCollection(slug, locale);

  if (!item) {
    return NextResponse.json({error: 'Collection item not found'}, {status: 404});
  }

  return NextResponse.json({locale, item});
}
