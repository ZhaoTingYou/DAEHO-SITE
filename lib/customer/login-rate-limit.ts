import 'server-only';

import {createHmac} from 'node:crypto';
import {createLoginRateLimiter, type LoginRateLimitKeys} from './login-rate-limit-core.mjs';

const limiter = createLoginRateLimiter();

export function loginRateLimitKeys(request: Request, username: string, secret: string): LoginRateLimitKeys {
  const forwarded = request.headers.get('x-daeho-client-ip')
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  return {
    ip: fingerprint(secret, `ip:${forwarded}`),
    username: fingerprint(secret, `username:${username}`)
  };
}

export function reserveLoginAttempt(keys: LoginRateLimitKeys, now = Date.now()) {
  return limiter.reserve(keys, now);
}

export function clearSuccessfulLogin(keys: LoginRateLimitKeys) {
  limiter.releaseSuccessful(keys);
}

function fingerprint(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}
