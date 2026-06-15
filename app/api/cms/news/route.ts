import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {getLocaleFromSearch} from '@/lib/cms/http';
import {listPublicNews} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const locale = getLocaleFromSearch(request);
  return NextResponse.json({locale, items: listPublicNews(locale)});
}
