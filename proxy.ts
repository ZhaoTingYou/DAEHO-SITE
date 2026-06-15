import createMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';

import {routing} from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/__styleguide') {
    return NextResponse.rewrite(new URL('/ko/styleguide-internal', request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)']
};
