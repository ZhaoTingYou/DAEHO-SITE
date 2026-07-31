import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';
import {CmsBackendError, createNotificationTemplateVersion} from '@/lib/cms/repositories';
import {notificationTemplateSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{templateKey: string}>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const parsed = await parseJsonBody(request, notificationTemplateSchema);
  if (!parsed.success) return validationError(parsed.error);
  const {templateKey} = await context.params;
  try {
    const template = await createNotificationTemplateVersion(templateKey, parsed.data);
    return NextResponse.json({template}, {status: 201});
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
