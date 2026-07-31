import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {maxAdminJsonBodyBytes, parseJsonBody, rejectOversizedRequest, validationError} from '@/lib/cms/http';
import {getNotificationSettings, updateNotificationSettings} from '@/lib/cms/repositories';
import {notificationSettingsSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({settings: await getNotificationSettings()});
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);
  if (oversized) return oversized;
  const parsed = await parseJsonBody(request, notificationSettingsSchema);
  if (!parsed.success) return validationError(parsed.error);
  return NextResponse.json({settings: await updateNotificationSettings(parsed.data)});
}
