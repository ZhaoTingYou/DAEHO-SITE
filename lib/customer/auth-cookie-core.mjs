import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

const loginTransactionTtlSeconds = 600;

export function sanitizeReturnTo(value, fallback = '/ko/my-daeho') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
      || value.includes('://') || value.includes('\\')) {
    return fallback;
  }
  return value;
}

export function profileProvisioningRequest(subject, claims) {
  const phone = claims?.phone_number_verified === true && typeof claims.phone_number === 'string'
    ? claims.phone_number
    : '';
  if (!subject || !/^\+8210\d{8}$/.test(phone)) return null;
  return {
    path: '/v1/internal/profiles/from-authenticated-phone',
    body: {subject, phone}
  };
}

export function createLoginTransaction({returnTo, now = Math.floor(Date.now() / 1000)} = {}) {
  const state = randomBytes(24).toString('base64url');
  const nonce = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const payload = {
    state,
    nonce,
    verifier,
    returnTo: sanitizeReturnTo(returnTo),
    expiresAt: now + loginTransactionTtlSeconds
  };

  return {
    ...payload,
    challenge,
    cookieValue(secret) {
      return signPayload(payload, secret);
    }
  };
}

export function verifyLoginTransaction(cookieValue, state, secret, now = Math.floor(Date.now() / 1000)) {
  const payload = verifyPayload(cookieValue, secret);
  if (!payload || payload.state !== state || !Number.isFinite(payload.expiresAt) || payload.expiresAt < now) {
    return null;
  }
  return payload;
}

export function encryptSession(session, secret) {
  return encryptPayload(session, secret);
}

export function encryptRegistrationTransaction(registrationGrant, secret, now = Math.floor(Date.now() / 1000)) {
  return encryptPayload({kind: 'registration', registrationGrant, expiresAt: now + 15 * 60}, secret);
}

export function decryptRegistrationTransaction(value, secret, now = Math.floor(Date.now() / 1000)) {
  const payload = decryptPayload(value, secret);
  if (payload?.kind !== 'registration' || typeof payload.registrationGrant !== 'string'
      || payload.registrationGrant.length < 32 || !Number.isFinite(payload.expiresAt)
      || payload.expiresAt < now) {
    return null;
  }
  return payload;
}

function encryptPayload(payload, secret) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  return ['v1', nonce.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

export function decryptSession(value, secret, now = Math.floor(Date.now() / 1000)) {
  const session = decryptPayload(value, secret);
  if (!session) {
    return null;
  }
  const deadline = session.absoluteExpiresAt ?? session.expiresAt;
  if (!Number.isFinite(deadline) || deadline < now
      || (Number.isFinite(session.idleExpiresAt) && session.idleExpiresAt < now)) {
    return null;
  }
  return session;
}

function decryptPayload(value, secret) {
  try {
    const [version, nonceValue, ciphertextValue, tagValue, extra] = String(value ?? '').split('.');
    if (version !== 'v1' || !nonceValue || !ciphertextValue || !tagValue || extra) {
      return null;
    }
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), Buffer.from(nonceValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final()
    ]).toString('utf8');
    return JSON.parse(plaintext);
  } catch {
    return null;
  }
}

function signPayload(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded, secret)}`;
}

function verifyPayload(value, secret) {
  try {
    const [encoded, suppliedSignature, extra] = String(value ?? '').split('.');
    if (!encoded || !suppliedSignature || extra) {
      return null;
    }
    const expectedSignature = signature(encoded, secret);
    const left = Buffer.from(suppliedSignature);
    const right = Buffer.from(expectedSignature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function signature(value, secret) {
  return createHmac('sha256', requiredSecret(secret)).update(value).digest('base64url');
}

function encryptionKey(secret) {
  return createHash('sha256').update(requiredSecret(secret)).digest();
}

function requiredSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters');
  }
  return secret;
}
