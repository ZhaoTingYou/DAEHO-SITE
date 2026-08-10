import {timingSafeEqual} from 'node:crypto';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import type {AdminCapability} from '@/lib/cms/admin-authorization-core.mjs';
import {hasAdminApiCapability, hasAdminApiSession} from './admin-session';

export async function requireAdminCapability(
  request: NextRequest,
  capability: AdminCapability
): Promise<NextResponse | null> {
  const expectedKey = process.env.CMS_ADMIN_API_KEY || process.env.CMS_BACKEND_API_KEY;
  if (!expectedKey && process.env.NODE_ENV !== 'production') {
    return null;
  }
  if (!expectedKey) {
    return NextResponse.json(
      {error: 'CMS_ADMIN_API_KEY or CMS_BACKEND_API_KEY is required in production.'},
      {status: 500}
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const headerToken = request.headers.get('x-admin-api-key') ?? '';
  if (constantTimeEqual(bearerToken, expectedKey) || constantTimeEqual(headerToken, expectedKey)) {
    return null;
  }

  if (!(await hasAdminApiSession())) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  if (!(await hasAdminApiCapability(capability))) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }
  if (!isSafeMethod(request.method) && !hasSameOrigin(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }
  return null;
}

export async function requireAdmin(request: NextRequest) {
  return requireAdminCapability(request, 'content:read');
}

function constantTimeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

function isSafeMethod(method: string) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

export function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }
  try {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const expectedOrigin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : request.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
