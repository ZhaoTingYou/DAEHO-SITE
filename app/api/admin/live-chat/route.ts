import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdminCapability} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';
import {
  CmsBackendError,
  getTelegramLiveChatAdmin,
  updateTelegramLiveChatSettings
} from '@/lib/cms/repositories';
import {telegramLiveChatSettingsSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getTelegramLiveChatAdmin(), {
    headers: {'Cache-Control': 'no-store'}
  });
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdminCapability(request, 'notifications:manage');
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const parsed = await parseJsonBody(request, telegramLiveChatSettingsSchema);
  if (!parsed.success) return validationError(parsed.error);
  try {
    return NextResponse.json(await updateTelegramLiveChatSettings(parsed.data));
  } catch (error) {
    if (error instanceof CmsBackendError) {
      return NextResponse.json(error.payload ?? {error: error.message}, {status: error.status});
    }
    throw error;
  }
}
