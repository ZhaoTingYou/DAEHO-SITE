import {createHash} from 'node:crypto';

type InquirySource = 'contact' | 'golf';

type InquiryProtectionOptions = {
  now?: () => number;
  duplicateWindowMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

type InquiryProtectionInput = {
  source: InquirySource;
  payload: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  allowedPagePathPrefixes: string[];
};

type InquiryProtectionBlocked = {
  allowed: false;
  status: 400 | 429;
  body: {
    error: string;
    retryAfterSeconds?: number;
    issues?: Array<{path: string; message: string}>;
  };
};

type InquiryProtectionAllowed = {
  allowed: true;
};

const defaultDuplicateWindowMs = 10 * 60 * 1000;
const defaultRateLimitWindowMs = 10 * 60 * 1000;
const defaultRateLimitMax = 5;

export function createInquiryProtectionGuard(options: InquiryProtectionOptions = {}) {
  const duplicateWindowMs = positiveNumber(options.duplicateWindowMs, defaultDuplicateWindowMs);
  const rateLimitWindowMs = positiveNumber(options.rateLimitWindowMs, defaultRateLimitWindowMs);
  const rateLimitMax = Math.max(1, Math.floor(positiveNumber(options.rateLimitMax, defaultRateLimitMax)));
  const now = options.now ?? Date.now;
  const recentFingerprints = new Map<string, number>();
  const recentIpHits = new Map<string, number[]>();

  return {
    check(input: InquiryProtectionInput): InquiryProtectionAllowed | InquiryProtectionBlocked {
      const currentTime = now();
      pruneExpiredEntries(recentFingerprints, currentTime);

      const honeypot = normalizedText(input.payload.website);
      if (honeypot) {
        return validationBlocked('website', 'Leave this field empty');
      }

      if (!isAllowedPagePath(normalizedText(input.payload.pagePath), input.allowedPagePathPrefixes)) {
        return validationBlocked('pagePath', 'Invalid page path');
      }

      const rateKey = hashValue([input.source, input.ipAddress || 'unknown'].join('\n'));
      const hits = (recentIpHits.get(rateKey) ?? []).filter((timestamp) => timestamp + rateLimitWindowMs > currentTime);

      if (hits.length >= rateLimitMax) {
        const retryAfterSeconds = secondsUntil(hits[0] + rateLimitWindowMs, currentTime);
        recentIpHits.set(rateKey, hits);
        return {
          allowed: false,
          status: 429,
          body: {
            error: 'Too many inquiries',
            retryAfterSeconds
          }
        };
      }

      const fingerprint = hashValue(buildFingerprint(input.source, input.payload));
      const duplicateExpiresAt = recentFingerprints.get(fingerprint) ?? 0;

      if (duplicateExpiresAt > currentTime) {
        return {
          allowed: false,
          status: 429,
          body: {
            error: 'Duplicate inquiry',
            retryAfterSeconds: secondsUntil(duplicateExpiresAt, currentTime)
          }
        };
      }

      hits.push(currentTime);
      recentIpHits.set(rateKey, hits);
      recentFingerprints.set(fingerprint, currentTime + duplicateWindowMs);

      return {allowed: true};
    },
    reset() {
      recentFingerprints.clear();
      recentIpHits.clear();
    }
  };
}

export function getInquiryProtectionConfigFromEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    duplicateWindowMs: readEnvNumber(env.INQUIRY_DUPLICATE_WINDOW_MS, defaultDuplicateWindowMs),
    rateLimitWindowMs: readEnvNumber(env.INQUIRY_RATE_LIMIT_WINDOW_MS, defaultRateLimitWindowMs),
    rateLimitMax: readEnvNumber(env.INQUIRY_RATE_LIMIT_MAX, defaultRateLimitMax)
  };
}

function buildFingerprint(source: InquirySource, payload: Record<string, unknown>) {
  const fields =
    source === 'golf'
      ? ['locale', 'name', 'contact', 'quantity', 'due', 'team', 'use', 'message', 'selectedHead', 'selectedShaft', 'selectedStyle', 'engravingSample']
      : ['locale', 'name', 'organization', 'contact', 'type', 'message'];

  return [source, ...fields.map((field) => normalizedText(payload[field]))].join('\n');
}

function isAllowedPagePath(pagePath: string, allowedPrefixes: string[]) {
  if (!pagePath || pagePath.startsWith('//') || pagePath.includes('://')) {
    return false;
  }

  return allowedPrefixes.some((prefix) => pagePath === prefix || pagePath.startsWith(`${prefix}?`));
}

function validationBlocked(path: string, message: string): InquiryProtectionBlocked {
  return {
    allowed: false,
    status: 400,
    body: {
      error: 'Validation failed',
      issues: [{path, message}]
    }
  };
}

function normalizedText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function pruneExpiredEntries(entries: Map<string, number>, currentTime: number) {
  for (const [key, expiresAt] of entries) {
    if (expiresAt <= currentTime) {
      entries.delete(key);
    }
  }
}

function secondsUntil(timestamp: number, currentTime: number) {
  return Math.max(1, Math.ceil((timestamp - currentTime) / 1000));
}

function positiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readEnvNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
