import {timingSafeEqual} from 'node:crypto';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function requireAdmin(request: NextRequest) {
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

  return NextResponse.json({error: 'Unauthorized'}, {status: 401});
}

function constantTimeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
