import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import type {ZodError, ZodSchema} from 'zod';

import {localeSchema} from './validation';

export const maxPublicJsonBodyBytes = 64 * 1024;
export const maxAdminJsonBodyBytes = 1024 * 1024;
export const maxImportBodyBytes = 5 * 1024 * 1024;

export async function parseJsonBody<T>(request: NextRequest, schema: ZodSchema<T>) {
  const body = await request.json().catch(() => null);
  return schema.safeParse(body);
}

export function rejectOversizedRequest(request: NextRequest, maxBytes: number) {
  const contentLength = request.headers.get('content-length');

  if (!contentLength) {
    return null;
  }

  const size = Number(contentLength);

  if (!Number.isFinite(size) || size <= maxBytes) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'Payload too large',
      maxBytes
    },
    {status: 413}
  );
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    },
    {status: 400}
  );
}

export function getRequestMeta(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') ?? '',
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      ''
  };
}

export function getLocaleFromSearch(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko';
  const parsed = localeSchema.safeParse(locale);
  return parsed.success ? parsed.data : 'ko';
}
