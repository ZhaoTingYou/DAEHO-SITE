import {NextResponse} from 'next/server';

import {setCustomerSessionCookie} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST() {
  if (process.env.NODE_ENV === 'production' || process.env.CUSTOMER_AUTH_DEV_SUBJECT === undefined) {
    return NextResponse.json({error: 'Not found'}, {status: 404});
  }
  const subject = process.env.CUSTOMER_AUTH_DEV_SUBJECT;
  const now = Math.floor(Date.now() / 1000);
  const response = NextResponse.json({authenticated: true});
  setCustomerSessionCookie(response, {
    accessToken: 'dev',
    subject,
    expiresAt: now + 30 * 24 * 60 * 60,
    absoluteExpiresAt: now + 30 * 24 * 60 * 60,
    idleExpiresAt: now + 7 * 24 * 60 * 60
  });
  return response;
}
