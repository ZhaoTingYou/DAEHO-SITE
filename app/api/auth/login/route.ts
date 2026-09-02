import {NextResponse, type NextRequest} from 'next/server';

import {createLoginTransaction} from '@/lib/customer/auth-cookie-core.mjs';
import {accountsEnabled, authConfig, loginTransactionCookie} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Customer accounts are not enabled'}, {status: 404});
  }
  const config = authConfig();
  const transaction = createLoginTransaction({returnTo: request.nextUrl.searchParams.get('returnTo') ?? undefined});
  const authorizeUrl = new URL(`${config.domain}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid email phone',
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: transaction.challenge,
    code_challenge_method: 'S256',
    ...(request.nextUrl.searchParams.get('reauth') === 'true' ? {prompt: 'login'} : {})
  }).toString();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(loginTransactionCookie, transaction.cookieValue(config.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 600
  });
  return response;
}
