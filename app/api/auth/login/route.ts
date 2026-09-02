import {NextResponse, type NextRequest} from 'next/server';

import {createLoginTransaction} from '@/lib/customer/auth-cookie-core.mjs';
import {
  authLocaleForReturnTo,
  managedLoginParameters,
  normalizeLoginName
} from '@/lib/customer/auth-ui-core.mjs';
import {isSameOriginMutation} from '@/lib/customer/request-security';
import {accountsEnabled, authConfig, loginTransactionCookie} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return beginLogin({
    returnTo: request.nextUrl.searchParams.get('returnTo'),
    loginHint: request.nextUrl.searchParams.get('loginHint') ?? undefined,
    reauth: request.nextUrl.searchParams.get('reauth') === 'true'
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const form = await request.formData();
  const returnTo = String(form.get('returnTo') ?? '/ko/my-daeho');
  const loginHint = String(form.get('loginHint') ?? '');
  if (!normalizeLoginName(loginHint)) {
    const locale = authLocaleForReturnTo(returnTo);
    const config = authConfig();
    return NextResponse.redirect(`${config.siteUrl}/${locale}/login?error=username`, 303);
  }
  return beginLogin({returnTo, loginHint}, 303);
}

async function beginLogin(
  options: {returnTo: string | null; loginHint?: string; reauth?: boolean},
  redirectStatus: 303 | 307 = 307
) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Customer accounts are not enabled'}, {status: 404});
  }
  const config = authConfig();
  const transaction = createLoginTransaction({returnTo: options.returnTo ?? undefined});
  const authorizeUrl = new URL(`${config.domain}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams(managedLoginParameters({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    returnTo: transaction.returnTo,
    state: transaction.state,
    nonce: transaction.nonce,
    challenge: transaction.challenge,
    loginHint: options.loginHint,
    reauth: options.reauth
  })).toString();
  const response = NextResponse.redirect(authorizeUrl, redirectStatus);
  response.cookies.set(loginTransactionCookie, transaction.cookieValue(config.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 600
  });
  return response;
}
