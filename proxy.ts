import createMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';

import {routing} from '@/i18n/routing';
import {isAdminIpAllowed, isAdminProtectedPath} from '@/lib/cms/admin-ip-allowlist';
import {
  getKoreanFallbackPath,
  isEnglishEnabled
} from '@/lib/english-visibility-core';
import {isGolfEnabled} from '@/lib/golf-visibility-core';

const intlMiddleware = createMiddleware(routing);
const golfVisibilityCacheMs = 5_000;
const englishVisibilityCacheMs = 5_000;

let golfVisibilityCache: {enabled: boolean; expiresAt: number} | null = null;
let englishVisibilityCache: {enabled: boolean; expiresAt: number} | null = null;

export default async function proxy(request: NextRequest) {
  if (isCustomerAccountPath(request.nextUrl.pathname)
      && process.env.CUSTOMER_ACCOUNTS_ENABLED !== 'true') {
    return notFoundResponse();
  }
  if (request.nextUrl.pathname.startsWith('/api/customer/')) {
    return NextResponse.next();
  }
  if (isAdminProtectedPath(request.nextUrl.pathname)) {
    if (!isAdminIpAllowed(request.headers)) {
      return notFoundResponse();
    }

    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/') {
    const defaultLocaleUrl = new URL('/ko', request.url);
    defaultLocaleUrl.search = request.nextUrl.search;
    const response = NextResponse.redirect(defaultLocaleUrl, 308);
    response.cookies.set('NEXT_LOCALE', 'ko', {path: '/', sameSite: 'lax'});
    return response;
  }

  if (request.nextUrl.pathname === '/__styleguide') {
    return NextResponse.rewrite(new URL('/ko/styleguide-internal', request.url));
  }

  if (isEnglishRequestPath(request.nextUrl.pathname) && !(await isEnglishEnabledForProxy())) {
    const koreanUrl = new URL(getKoreanFallbackPath(request.nextUrl.pathname), request.url);
    koreanUrl.search = request.nextUrl.search;
    const response = NextResponse.redirect(koreanUrl, 308);
    response.cookies.set('NEXT_LOCALE', 'ko', {path: '/', sameSite: 'lax'});
    return response;
  }

  if (isGolfRequestPath(request.nextUrl.pathname) && !(await isGolfEnabledForProxy())) {
    return notFoundResponse();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/customer/:path*', '/((?!api|trpc|_next|_vercel|.*\\..*).*)']
};

export function isCustomerAccountPath(pathname: string) {
  if (pathname.startsWith('/api/customer/')) return true;
  const segments = pathname.split('/').filter(Boolean);
  const index = segments[0] === 'ko' || segments[0] === 'en' ? 1 : 0;
  return ['login', 'register', 'recover-username', 'reset-password', 'my-daeho']
    .includes(segments[index]);
}

export function isGolfRequestPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const golfSegmentIndex = firstSegment === 'ko' || firstSegment === 'en' ? 1 : 0;

  return segments[golfSegmentIndex] === 'golf';
}

export function isEnglishRequestPath(pathname: string) {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment === 'en';
}

async function isEnglishEnabledForProxy() {
  const now = Date.now();

  if (englishVisibilityCache && englishVisibilityCache.expiresAt > now) {
    return englishVisibilityCache.enabled;
  }

  const enabled = await readEnglishEnabledFromCms();
  englishVisibilityCache = {
    enabled,
    expiresAt: now + englishVisibilityCacheMs
  };

  return enabled;
}

async function readEnglishEnabledFromCms() {
  const baseUrl = process.env.CMS_BACKEND_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    return false;
  }

  try {
    const pages = await Promise.all(routing.locales.map((locale) => fetchCommonPage(baseUrl, locale)));

    return pages.some((page) => isEnglishEnabled(page));
  } catch {
    return false;
  }
}

async function isGolfEnabledForProxy() {
  if (process.env.DAEHO_GOLF_ENABLED === 'true') {
    return true;
  }

  const now = Date.now();

  if (golfVisibilityCache && golfVisibilityCache.expiresAt > now) {
    return golfVisibilityCache.enabled;
  }

  const enabled = await readGolfEnabledFromCms();
  golfVisibilityCache = {
    enabled,
    expiresAt: now + golfVisibilityCacheMs
  };

  return enabled;
}

async function readGolfEnabledFromCms() {
  const baseUrl = process.env.CMS_BACKEND_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    return false;
  }

  try {
    const pages = await Promise.all(routing.locales.map((locale) => fetchCommonPage(baseUrl, locale)));

    return pages.some((page) => isGolfEnabled(page));
  } catch {
    return false;
  }
}

async function fetchCommonPage(baseUrl: string, locale: string) {
  const response = await fetch(`${baseUrl}/api/cms/pages/common?locale=${locale}`, {
    cache: 'no-store',
    headers: {
      accept: 'application/json'
    },
    signal: AbortSignal.timeout(1_200)
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function notFoundResponse() {
  return new NextResponse('Not found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}
