import {createHmac, timingSafeEqual} from 'node:crypto';

const sessionMaxAgeMs = 8 * 60 * 60 * 1000;
const base64urlPattern = /^[A-Za-z0-9_-]+$/;

export function createSignedAdminSession(identity, secret, issuedAtMs) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('CMS admin session secret is required.');
  }
  const payload = Buffer.from(JSON.stringify({issuedAtMs, identity}), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function parseSignedAdminSession(value, secret, nowMs) {
  if (typeof value !== 'string' || typeof secret !== 'string' || secret.length === 0) {
    return null;
  }
  const parts = value.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [payload, signature] = parts;
  if (!base64urlPattern.test(payload) || !base64urlPattern.test(signature)
      || !constantTimeEqual(signature, sign(payload, secret))) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== payload) {
      return null;
    }
    const parsed = JSON.parse(decoded);
    if (!isFiniteInteger(parsed?.issuedAtMs) || !Number.isFinite(nowMs)) {
      return null;
    }
    const age = nowMs - parsed.issuedAtMs;
    if (age < 0 || age > sessionMaxAgeMs || !isAdminIdentity(parsed.identity)) {
      return null;
    }
    return parsed.identity;
  } catch {
    return null;
  }
}

function isAdminIdentity(value) {
  return value !== null
    && typeof value === 'object'
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.email === 'string'
    && value.email.length > 0
    && (value.role === 'OWNER' || value.role === 'EDITOR')
    && isFiniteInteger(value.sessionVersion)
    && value.sessionVersion >= 1
    && (value.expiresAt === null
      || (typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt))))
    && typeof value.mustChangePassword === 'boolean';
}

function isFiniteInteger(value) {
  return Number.isSafeInteger(value);
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function constantTimeEqual(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
