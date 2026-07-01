import {createHash, createHmac, timingSafeEqual} from 'node:crypto';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

import {getStoredAdminPasswordStatus, verifyStoredAdminPassword} from './admin-password';

const adminSessionCookie = 'daeho_admin_session';
const adminSessionCookiePath = '/admin';
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

export async function assertAdminSession() {
  if (!(await hasAdminSession())) {
    redirect('/admin/login');
  }
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(adminSessionCookie)?.value;

  if (!value) {
    return false;
  }

  return verifySessionValue(value);
}

export async function createAdminSession(passwordVersion = getLocalPasswordVersion()) {
  const cookieStore = await cookies();
  const issuedAt = Date.now().toString();
  const versionToken = encodeSessionPart(passwordVersion);
  const signature = signValue(`${issuedAt}.${versionToken}`);

  cookieStore.set(adminSessionCookie, `${issuedAt}.${versionToken}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureAdminCookie(),
    path: adminSessionCookiePath,
    maxAge: sessionMaxAgeSeconds
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureAdminCookie(),
    path: adminSessionCookiePath,
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

  if (!expected) {
    return false;
  }

  return constantTimeEqual(password, expected);
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
  const next =
    current && now - current.firstAttemptAt <= loginAttemptWindowMs
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

  if (process.env.NODE_ENV !== 'production') {
    return 'Local dev password: admin';
  }

  return '';
}

async function verifySessionValue(value: string) {
  const [issuedAt, versionToken, signature] = value.split('.');

  if (!issuedAt || !versionToken || !signature || !constantTimeEqual(signature, signValue(`${issuedAt}.${versionToken}`))) {
    return false;
  }

  const issuedAtMs = Number(issuedAt);

  if (!Number.isFinite(issuedAtMs)) {
    return false;
  }

  if (Date.now() - issuedAtMs > sessionMaxAgeSeconds * 1000) {
    return false;
  }

  const sessionVersion = decodeSessionPart(versionToken);
  const currentVersion = await getCurrentPasswordVersion();

  return Boolean(sessionVersion) && constantTimeEqual(sessionVersion, currentVersion);
}

function signValue(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function getSessionSecret() {
  return (
    process.env.CMS_ADMIN_SESSION_SECRET ??
    process.env.CMS_ADMIN_API_KEY ??
    process.env.CMS_ADMIN_PASSWORD ??
    (process.env.NODE_ENV !== 'production' ? 'daeho-local-admin-session' : '')
  );
}

function getAdminPassword() {
  return (
    process.env.CMS_ADMIN_PASSWORD ??
    process.env.CMS_ADMIN_API_KEY ??
    (process.env.NODE_ENV !== 'production' ? 'admin' : '')
  );
}

async function getCurrentPasswordVersion() {
  try {
    const status = await getStoredAdminPasswordStatus();
    return status.version;
  } catch {
    if (!canUseLocalAdminPasswordFallback()) {
      return 'backend-unavailable';
    }

    return getLocalPasswordVersion();
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

  if (configured === 'false') {
    return false;
  }

  if (isLocalHttpSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
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
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]' ||
        url.hostname === '::1')
    );
  } catch {
    return false;
  }
}

function encodeSessionPart(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeSessionPart(value: string) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return '';
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

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
