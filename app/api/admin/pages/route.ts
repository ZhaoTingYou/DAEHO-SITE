import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {managedPageDefinitions} from '@/lib/cms/page-catalog';
import {listPages} from '@/lib/cms/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const pages = await listPages();
  const pagesByKey = new Map(pages.map((page) => [page.pageKey, page]));

  return NextResponse.json({
    items: managedPageDefinitions.map((definition) => ({
      ...definition,
      page: pagesByKey.get(definition.pageKey) ?? null
    })),
    legacyItems: pages.filter(
      (page) => !managedPageDefinitions.some((definition) => definition.pageKey === page.pageKey)
    )
  });
}
