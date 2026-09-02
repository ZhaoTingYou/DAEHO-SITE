import {NextResponse, type NextRequest} from 'next/server';
import {createRemoteJWKSet, jwtVerify} from 'jose';

import {verifyLoginTransaction} from '@/lib/customer/auth-cookie-core.mjs';
import {
  authConfig,
  loginTransactionCookie,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const config = authConfig();
  const state = request.nextUrl.searchParams.get('state') ?? '';
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const transaction = verifyLoginTransaction(
    request.cookies.get(loginTransactionCookie)?.value,
    state,
    config.secret
  );
  if (!transaction || !code) {
    return NextResponse.redirect(new URL('/ko/login?error=invalid_callback', config.siteUrl));
  }
  const tokenResponse = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: transaction.verifier
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/ko/login?error=token_exchange', config.siteUrl));
  }
  const tokens = await tokenResponse.json() as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!tokens.id_token) {
    return NextResponse.redirect(new URL('/ko/login?error=invalid_id_token', config.siteUrl));
  }
  let subject: string;
  let authTime = 0;
  try {
    const {payload} = await jwtVerify(
      tokens.id_token,
      createRemoteJWKSet(new URL(`${config.issuer}/.well-known/jwks.json`)),
      {issuer: config.issuer, audience: config.clientId, clockTolerance: 5}
    );
    if (payload.nonce !== transaction.nonce || payload.token_use !== 'id' || !payload.sub) {
      throw new Error('Invalid Cognito ID token claims');
    }
    subject = payload.sub;
    authTime = typeof payload.auth_time === 'number' ? payload.auth_time : 0;
  } catch {
    return NextResponse.redirect(new URL('/ko/login?error=invalid_id_token', config.siteUrl));
  }
  const now = Math.floor(Date.now() / 1000);
  const response = NextResponse.redirect(new URL(transaction.returnTo, config.siteUrl));
  setCustomerSessionCookie(response, {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token,
    expiresAt: now + tokens.expires_in,
    absoluteExpiresAt: now + 30 * 24 * 60 * 60,
    idleExpiresAt: now + 7 * 24 * 60 * 60,
    subject,
    authTime
  });
  response.cookies.set(loginTransactionCookie, '', {path: '/api/auth', maxAge: 0});
  return response;
}
