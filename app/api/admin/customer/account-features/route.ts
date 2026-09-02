import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';

import {requireAdminCapability} from '@/lib/cms/auth';
import {getAdminIdentity} from '@/lib/cms/admin-session';
import {
  cmsBackendRequest,
  CmsBackendError,
  type CmsAccountFeatureSettings
} from '@/lib/cms/repositories';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';

export const runtime = 'nodejs';

const settingsSchema = z.object({
  customerAccountsEnabled: z.boolean(),
  inquiryAccountRequired: z.boolean()
}).refine(
  (value) => value.customerAccountsEnabled || !value.inquiryAccountRequired,
  {message: 'Inquiry authentication requires customer accounts to be enabled.'}
);

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'users:manage');
  if (unauthorized) return unauthorized;
  return NextResponse.json(await readSettings());
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'users:manage');
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const parsed = await parseJsonBody(request, settingsSchema);
  if (!parsed.success) return validationError(parsed.error);

  const identity = await getAdminIdentity();
  const actor = identity?.id || request.headers.get('x-admin-user-id') || '';
  if (!actor) {
    return NextResponse.json({error: 'Missing CMS actor.'}, {status: 400});
  }
  try {
    return NextResponse.json(await cmsBackendRequest<CmsAccountFeatureSettings>(
      '/api/admin/account-features',
      {
        admin: true,
        method: 'PUT',
        headers: {'x-admin-user-id': actor},
        body: parsed.data
      }
    ));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}

async function readSettings() {
  return cmsBackendRequest<CmsAccountFeatureSettings>('/api/admin/account-features', {
    admin: true
  });
}
