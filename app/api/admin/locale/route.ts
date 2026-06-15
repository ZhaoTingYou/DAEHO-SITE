import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {
  adminLocaleCookieName,
  defaultAdminLocale,
  isAdminLocale
} from '@/lib/admin-locales';

export function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale');
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/admin';
  const locale = isAdminLocale(localeParam) ? localeParam : defaultAdminLocale;
  const nextPath = nextParam.startsWith('/admin') ? nextParam : '/admin';
  const response = NextResponse.redirect(new URL(nextPath, request.url));

  response.cookies.set(adminLocaleCookieName, locale, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
