import {createHmac, timingSafeEqual} from 'node:crypto';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

const adminSessionCookie = 'deaho_admin_session';
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

export async function createAdminSession() {
  const cookieStore = await cookies();
  const issuedAt = Date.now().toString();
  const signature = signValue(issuedAt);

  cookieStore.set(adminSessionCookie, `${issuedAt}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: sessionMaxAgeSeconds
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie);
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

function verifySessionValue(value: string) {
  const [issuedAt, signature] = value.split('.');

  if (!issuedAt || !signature || !constantTimeEqual(signature, signValue(issuedAt))) {
    return false;
  }

  const issuedAtMs = Number(issuedAt);

  if (!Number.isFinite(issuedAtMs)) {
    return false;
  }

  return Date.now() - issuedAtMs <= sessionMaxAgeSeconds * 1000;
}

function signValue(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function getSessionSecret() {
  return (
    process.env.CMS_ADMIN_SESSION_SECRET ??
    process.env.CMS_ADMIN_API_KEY ??
    process.env.CMS_ADMIN_PASSWORD ??
    (process.env.NODE_ENV !== 'production' ? 'deaho-local-admin-session' : '')
  );
}

function getAdminPassword() {
  return (
    process.env.CMS_ADMIN_PASSWORD ??
    process.env.CMS_ADMIN_API_KEY ??
    (process.env.NODE_ENV !== 'production' ? 'admin' : '')
  );
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
