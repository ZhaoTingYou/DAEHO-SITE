import {createHash, createHmac, timingSafeEqual} from 'node:crypto';

import {cookies} from 'next/headers';
import {forbidden, redirect} from 'next/navigation';

import {
  hasAdminCapability,
  type AdminCapability
} from '@/lib/cms/admin-authorization-core.mjs';
import {getStoredAdminPasswordStatus, verifyStoredAdminPassword} from './admin-password';
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
  if ((identity.mustChangePassword && capability !== 'account:self')
      || !hasAdminCapability(identity.role, capability)) {
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

export async function createAdminSession(identity: AdminIdentity | string = getLocalPasswordVersion()) {
  const cookieStore = await cookies();
  const value = typeof identity === 'string'
    ? createLegacySessionValue(identity)
    : createSignedAdminSession(identity, getSessionSecret(), Date.now());

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

export async function verifyAdminPassword(password: string) {
  try {
    const verification = await verifyStoredAdminPassword(password);
    return {valid: verification.valid, version: verification.version};
  } catch {
    if (!canUseLocalAdminPasswordFallback()) {
      return {valid: false, version: 'backend-unavailable'};
    }
    return {valid: validateAdminPassword(password), version: getLocalPasswordVersion()};
  }
}

export function validateAdminPassword(password: string) {
  const expected = getAdminPassword();
  return Boolean(expected) && constantTimeEqual(password, expected);
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

export function getAdminPasswordHint() {
  if (process.env.CMS_ADMIN_PASSWORD || process.env.CMS_ADMIN_API_KEY) {
    return '';
  }
  return process.env.NODE_ENV !== 'production' ? 'Local dev password: admin' : '';
}

async function getIdentityFromCookie(cookieName: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  return value ? parseAndValidateSession(value) : null;
}

async function parseAndValidateSession(value: string): Promise<AdminIdentity | null> {
  const identity = parseSignedAdminSession(value, getSessionSecret(), Date.now());
  if (identity) {
    try {
      return await validateAdminIdentity(identity.id, identity.sessionVersion);
    } catch {
      return null;
    }
  }

  if (await verifyLegacySessionValue(value)) {
    return {
      id: 'legacy-shared-password',
      email: '',
      role: 'OWNER',
      sessionVersion: 1,
      expiresAt: null,
      mustChangePassword: false
    };
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureAdminCookie(),
    maxAge: sessionMaxAgeSeconds
  };
}

function createLegacySessionValue(passwordVersion: string) {
  const issuedAt = Date.now().toString();
  const versionToken = Buffer.from(passwordVersion, 'utf8').toString('base64url');
  const signature = signLegacyValue(`${issuedAt}.${versionToken}`);
  return `${issuedAt}.${versionToken}.${signature}`;
}

async function verifyLegacySessionValue(value: string) {
  const [issuedAt, versionToken, signature, extra] = value.split('.');
  if (extra || !issuedAt || !versionToken || !signature
      || !constantTimeEqual(signature, signLegacyValue(`${issuedAt}.${versionToken}`))) {
    return false;
  }
  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs) || Date.now() < issuedAtMs
      || Date.now() - issuedAtMs > sessionMaxAgeSeconds * 1000) {
    return false;
  }
  try {
    const sessionVersion = Buffer.from(versionToken, 'base64url').toString('utf8');
    return Boolean(sessionVersion) && constantTimeEqual(sessionVersion, await getCurrentPasswordVersion());
  } catch {
    return false;
  }
}

function signLegacyValue(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function getSessionSecret() {
  return process.env.CMS_ADMIN_SESSION_SECRET
    ?? process.env.CMS_ADMIN_API_KEY
    ?? process.env.CMS_ADMIN_PASSWORD
    ?? (process.env.NODE_ENV !== 'production' ? 'daeho-local-admin-session' : '');
}

function getAdminPassword() {
  return process.env.CMS_ADMIN_PASSWORD
    ?? process.env.CMS_ADMIN_API_KEY
    ?? (process.env.NODE_ENV !== 'production' ? 'admin' : '');
}

async function getCurrentPasswordVersion() {
  try {
    return (await getStoredAdminPasswordStatus()).version;
  } catch {
    return canUseLocalAdminPasswordFallback() ? getLocalPasswordVersion() : 'backend-unavailable';
  }
}

function getLocalPasswordVersion() {
  return `local:${createHash('sha256').update(getAdminPassword()).digest('hex')}`;
}

function canUseLocalAdminPasswordFallback() {
  return process.env.CMS_PREVIEW_STATIC === 'true' || !process.env.CMS_BACKEND_URL;
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

function constantTimeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
