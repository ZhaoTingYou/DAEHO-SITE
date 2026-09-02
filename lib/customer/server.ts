import 'server-only';

import {cookies} from 'next/headers';
import type {NextResponse} from 'next/server';

import {
  decryptSession,
  decryptRegistrationTransaction,
  encryptRegistrationTransaction,
  encryptSession,
  type CustomerSession
} from './auth-cookie-core.mjs';
import type {CustomerProfile} from './types';

export const customerSessionCookie = 'daeho_customer_session';
export const loginTransactionCookie = 'daeho_login_transaction';
export const registrationTransactionCookie = 'daeho_registration_transaction';
const idleSessionSeconds = 7 * 24 * 60 * 60;
const absoluteSessionSeconds = 30 * 24 * 60 * 60;

export function accountsEnabled() {
  return process.env.CUSTOMER_ACCOUNTS_ENABLED === 'true';
}

export function authConfig() {
  const siteUrl = requiredUrl(process.env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL');
  const domain = requiredUrl(process.env.COGNITO_DOMAIN, 'COGNITO_DOMAIN').replace(/\/+$/, '');
  const clientId = required(process.env.COGNITO_CLIENT_ID, 'COGNITO_CLIENT_ID');
  const issuer = requiredUrl(process.env.COGNITO_ISSUER_URI, 'COGNITO_ISSUER_URI');
  const secret = required(process.env.AUTH_SESSION_SECRET, 'AUTH_SESSION_SECRET', 32);
  return {
    siteUrl,
    domain,
    clientId,
    issuer,
    secret,
    redirectUri: `${siteUrl}/api/auth/callback`,
    logoutUri: `${siteUrl}/ko`
  };
}

export async function readCustomerSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(customerSessionCookie)?.value;
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return decryptSession(value, secret);
}

export async function readRegistrationTransaction() {
  const cookieStore = await cookies();
  const value = cookieStore.get(registrationTransactionCookie)?.value;
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return decryptRegistrationTransaction(value, secret);
}

export async function refreshedCustomerSession() {
  const session = await readCustomerSession();
  if (!session) {
    return null;
  }
  if (session.accessToken === 'dev') {
    return touchSession(session);
  }
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt > now + 60) {
    return touchSession(session);
  }
  if (!session.refreshToken) {
    return null;
  }
  const config = authConfig();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: session.refreshToken
  });
  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) {
    return null;
  }
  const tokens = await response.json() as {access_token: string; id_token?: string; expires_in: number};
  return touchSession({
    ...session,
    accessToken: tokens.access_token,
    idToken: tokens.id_token ?? session.idToken,
    expiresAt: now + tokens.expires_in
  });
}

export function setCustomerSessionCookie(response: NextResponse, session: CustomerSession) {
  const secret = required(process.env.AUTH_SESSION_SECRET, 'AUTH_SESSION_SECRET', 32);
  const now = Math.floor(Date.now() / 1000);
  const normalized = {
    ...session,
    absoluteExpiresAt: session.absoluteExpiresAt ?? now + absoluteSessionSeconds,
    idleExpiresAt: now + idleSessionSeconds
  };
  response.cookies.set(customerSessionCookie, encryptSession(normalized, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: idleSessionSeconds
  });
}

export function clearCustomerSessionCookie(response: NextResponse) {
  response.cookies.set(customerSessionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

export function setRegistrationTransactionCookie(response: NextResponse, registrationGrant: string) {
  const secret = required(process.env.AUTH_SESSION_SECRET, 'AUTH_SESSION_SECRET', 32);
  response.cookies.set(
    registrationTransactionCookie,
    encryptRegistrationTransaction(registrationGrant, secret),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 15 * 60
    }
  );
}

export function clearRegistrationTransactionCookie(response: NextResponse) {
  response.cookies.set(registrationTransactionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0
  });
}

export async function customerApiRequest<T>(
  path: string,
  session: CustomerSession,
  init: RequestInit = {}
): Promise<T> {
  const baseUrl = requiredUrl(process.env.CUSTOMER_BACKEND_URL, 'CUSTOMER_BACKEND_URL').replace(/\/+$/, '');
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) {
    headers.set('content-type', 'application/json');
  }
  if (session.accessToken === 'dev' && session.subject) {
    headers.set('x-dev-subject', session.subject);
  } else {
    headers.set('authorization', `Bearer ${session.accessToken}`);
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) {
    const error = new Error(`Customer API request failed with ${response.status}`) as Error & {status: number};
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function currentCustomerProfile(session: CustomerSession) {
  return customerApiRequest<CustomerProfile>('/v1/me', session);
}

export function customerServiceHeaders(customerId?: string) {
  const key = required(process.env.CUSTOMER_INTERNAL_API_KEY, 'CUSTOMER_INTERNAL_API_KEY', 24);
  return {
    'x-customer-service-key': key,
    ...(customerId ? {'x-customer-id': customerId} : {})
  };
}

function touchSession(session: CustomerSession): CustomerSession {
  const now = Math.floor(Date.now() / 1000);
  return {...session, idleExpiresAt: now + idleSessionSeconds};
}

function required(value: string | undefined, name: string, minimum = 1) {
  if (!value || value.length < minimum) {
    throw new Error(`${name} is required${minimum > 1 ? ` and must contain at least ${minimum} characters` : ''}`);
  }
  return value;
}

function requiredUrl(value: string | undefined, name: string) {
  const parsed = new URL(required(value, name));
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  return parsed.toString().replace(/\/$/, '');
}
