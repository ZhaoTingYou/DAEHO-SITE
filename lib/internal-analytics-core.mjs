export const INTERNAL_ANALYTICS_STORAGE_KEY = 'daeho_internal_analytics_session_v1';
export const INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function classifyTrafficSource(input = {}) {
  const source = cleanValue(input.source);
  const medium = cleanValue(input.medium);
  const host = cleanHost(input.referrerHost);
  const candidate = source.toLowerCase();

  const channel =
    candidate === 'google' ? 'google' :
    candidate === 'naver' || candidate === 'naver_blog' ? 'naver' :
    candidate === 'instagram' ? 'instagram' :
    candidate === 'kakao' ? 'kakao' :
    candidate === 'qr' ? 'qr' :
    isHost(host, 'google.com') ? 'google' :
    isHost(host, 'naver.com') ? 'naver' :
    isHost(host, 'instagram.com') ? 'instagram' :
    isHost(host, 'kakao.com') || isHost(host, 'kakao.co.kr') ? 'kakao' :
    medium.toLowerCase() === 'social' ? 'social' :
    host ? 'referral' :
    source ? 'other' :
    'direct';

  return {
    channel,
    source: source || (host || '(direct)'),
    medium: medium || (host ? 'referral' : '(none)'),
    campaign: cleanValue(input.campaign),
    content: cleanValue(input.content)
  };
}

export function sanitizeReferrerHost(referrer, siteOrigin) {
  const referrerUrl = parseAbsoluteUrl(referrer);
  const originUrl = parseAbsoluteUrl(siteOrigin);

  if (!referrerUrl || !originUrl || referrerUrl.origin === originUrl.origin) {
    return '';
  }

  return cleanHost(referrerUrl.hostname);
}

export function classifyDevice(viewportWidth, userAgentDataMobile) {
  if (userAgentDataMobile === true) {
    return 'mobile';
  }

  const width = Number(viewportWidth);
  if (!Number.isFinite(width) || width < 768) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

export function resolveSessionState(storedState, nowMs, seed = {}) {
  const sessionId = cleanValue(seed.sessionId) || createSessionId();
  const validStoredState = isValidStoredState(storedState);
  const isNew = !validStoredState || nowMs - storedState.lastActivityAt > INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS;

  return {
    sessionId: isNew ? sessionId : storedState.sessionId,
    lastActivityAt: nowMs,
    isNew
  };
}

function cleanValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanHost(value) {
  const input = cleanValue(value).toLowerCase();
  if (!input) {
    return '';
  }

  if (!/^[a-z0-9.-]+(?::\d+)?(?:[/?#].*)?$/.test(input) && !input.includes('://')) {
    return '';
  }

  const url = parseUrl(input.includes('://') ? input : `https://${input}`);
  if (!url || !url.hostname) {
    return '';
  }

  return url.hostname.replace(/^www\./, '');
}

function parseUrl(value) {
  const input = cleanValue(value);
  if (!input) {
    return null;
  }

  try {
    return new URL(input, input.includes('://') ? undefined : 'https://placeholder.invalid');
  } catch {
    return null;
  }
}

function parseAbsoluteUrl(value) {
  const input = cleanValue(value);
  if (!input || !input.includes('://')) {
    return null;
  }

  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isHost(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isValidStoredState(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    isUuid(value.sessionId) &&
    Number.isFinite(value.lastActivityAt)
  );
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function createSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : random & 0x3 | 0x8;
    return value.toString(16);
  });
}
