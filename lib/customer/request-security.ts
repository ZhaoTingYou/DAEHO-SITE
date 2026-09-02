import type {NextRequest} from 'next/server';

import {getExternalOrigin} from '@/lib/request-origin';

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }
  try {
    return new URL(origin).origin === new URL(getExternalOrigin(request)).origin;
  } catch {
    return false;
  }
}
