import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {getLocaleFromSearch} from '@/lib/cms/http';
import {getPage} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{pageKey: string}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const {pageKey} = await context.params;
  const locale = getLocaleFromSearch(request);
  const page = getPage(pageKey);

  if (!page) {
    return NextResponse.json({error: 'Page not found'}, {status: 404});
  }

  return NextResponse.json({
    pageKey: page.pageKey,
    section: page.section,
    locale,
    content: page.content[locale],
    seo: page.seo[locale],
    updatedAt: page.updatedAt
  });
}
