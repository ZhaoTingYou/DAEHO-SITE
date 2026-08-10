import {cookies} from 'next/headers';
import {forbidden, redirect} from 'next/navigation';

import {
  hasAdminCapability,
  type AdminCapability
} from '@/lib/cms/admin-authorization-core.mjs';
import {createSignedAdminSession, parseSignedAdminSession} from '@/lib/cms/admin-session-core.mjs';
import {validateAdminIdentity, type AdminIdentity} from './admin-users';

const adminSessionCookie = 'daeho_admin_session';
const adminApiSessionCookie = 'daeho_admin_api_session';
const adminSessionCookiePath = '/admin';
const adminApiSessionCookiePath = '/api/admin';
const sessionMaxAgeSeconds = 60 * 60 * 8;
const loginAttemptWindowMs = 15 * 60 * 1000;
const loginLockMs = 15 * 60 * 1000;
const maxFailedLoginAttempts = 5;

type LoginAttemptState = {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
};

const failedLoginAttempts = new Map<string, LoginAttemptState>();

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  return getIdentityFromCookie(adminSessionCookie);
}

export async function assertAdminSession(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) {
    redirect('/admin/login');
  }
  return identity;
}

export async function assertAdminCapability(capability: AdminCapability): Promise<AdminIdentity> {
  const identity = await assertAdminSession();
  if (identity.mustChangePassword && capability !== 'account:self') {
    redirect('/admin/account?required=1');
  }
  if (!hasAdminCapability(identity.role, capability)) {
    forbidden();
  }
  return identity;
}

export async function hasAdminSession() {
  return Boolean(await getAdminIdentity());
}

export async function hasAdminApiSession() {
  return Boolean(await getIdentityFromCookie(adminApiSessionCookie));
}

export async function hasAdminApiCapability(capability: AdminCapability) {
  const identity = await getIdentityFromCookie(adminApiSessionCookie);
  return Boolean(
    identity
      && (!identity.mustChangePassword || capability === 'account:self')
      && hasAdminCapability(identity.role, capability)
  );
}

export async function createAdminSession(identity: AdminIdentity) {
  const cookieStore = await cookies();
  const value = createSignedAdminSession(identity, getSessionSecret(), Date.now());

  cookieStore.set(adminSessionCookie, value, {...cookieOptions(), path: adminSessionCookiePath});
  cookieStore.set(adminApiSessionCookie, value, {...cookieOptions(), path: adminApiSessionCookiePath});
}

export async function restoreAdminApiSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(adminSessionCookie)?.value;
  if (!value || !(await parseAndValidateSession(value))) {
    return false;
  }

  cookieStore.set(adminApiSessionCookie, value, {...cookieOptions(), path: adminApiSessionCookiePath});
  return true;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, '', {
    ...cookieOptions(),
    path: adminSessionCookiePath,
    maxAge: 0,
    expires: new Date(0)
  });
  cookieStore.set(adminApiSessionCookie, '', {
    ...cookieOptions(),
    path: adminApiSessionCookiePath,
    maxAge: 0,
    expires: new Date(0)
  });
}

export function isAdminLoginRateLimited(key: string) {
  const now = Date.now();
  const current = failedLoginAttempts.get(key);
  if (!current) {
    return false;
  }
  if (current.lockedUntil > now) {
    return true;
  }
  if (now - current.firstAttemptAt > loginAttemptWindowMs) {
    failedLoginAttempts.delete(key);
  }
  return false;
}

export function recordFailedAdminLogin(key: string) {
  const now = Date.now();
  const current = failedLoginAttempts.get(key);
  const next = current && now - current.firstAttemptAt <= loginAttemptWindowMs
    ? {...current, count: current.count + 1}
    : {count: 1, firstAttemptAt: now, lockedUntil: 0};
  if (next.count >= maxFailedLoginAttempts) {
    next.lockedUntil = now + loginLockMs;
  }
  failedLoginAttempts.set(key, next);
  cleanupLoginAttempts(now);
}

export function clearAdminLoginFailures(key: string) {
  failedLoginAttempts.delete(key);
}

async function getIdentityFromCookie(cookieName: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  return value ? parseAndValidateSession(value) : null;
}

async function parseAndValidateSession(value: string): Promise<AdminIdentity | null> {
  const identity = parseSignedAdminSession(value, getSessionSecret(), Date.now());
  if (!identity) {
    return null;
  }
  try {
    return await validateAdminIdentity(identity.id, identity.sessionVersion);
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureAdminCookie(),
    maxAge: sessionMaxAgeSeconds
  };
}

function getSessionSecret() {
  return process.env.CMS_ADMIN_SESSION_SECRET
    ?? process.env.CMS_ADMIN_API_KEY
    ?? process.env.CMS_ADMIN_PASSWORD
    ?? (process.env.NODE_ENV !== 'production' ? 'daeho-local-admin-session' : '');
}

function shouldUseSecureAdminCookie() {
  const configured = process.env.CMS_ADMIN_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === 'true') {
    return true;
  }
  if (configured === 'false' || isLocalHttpSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

function isLocalHttpSiteUrl(value?: string) {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function cleanupLoginAttempts(now: number) {
  for (const [key, value] of failedLoginAttempts) {
    const staleWindow = now - value.firstAttemptAt > loginAttemptWindowMs;
    const unlocked = value.lockedUntil === 0 || value.lockedUntil <= now;
    if (staleWindow && unlocked) {
      failedLoginAttempts.delete(key);
    }
  }
}
