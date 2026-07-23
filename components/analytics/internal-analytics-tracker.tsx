'use client';

import {usePathname, useSearchParams} from 'next/navigation';
import {useEffect, useRef} from 'react';

import {sanitizeAnalyticsUrl} from '@/lib/analytics-core.mjs';
import {
  classifyDevice,
  classifyTrafficSource,
  INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS,
  INTERNAL_ANALYTICS_STORAGE_KEY,
  resolveSessionState,
  sanitizeReferrerHost,
  type TrafficAttribution
} from '@/lib/internal-analytics-core.mjs';

type InternalAnalyticsTrackerProps = {
  enabled: boolean;
  locale: 'ko' | 'en';
};

type StoredInternalAnalyticsSession = {
  sessionId: string;
  lastActivityAt: number;
  attribution: TrafficAttribution;
  landingPath: string;
  referrerHost: string;
};

export function InternalAnalyticsTracker({enabled, locale}: InternalAnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const lastPageKey = useRef('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const currentUrl = `${window.location.origin}${pathname}${search ? `?${search}` : ''}`;
    const {pagePath} = sanitizeAnalyticsUrl(currentUrl);
    const pageKey = `${pagePath}|${document.title}`;
    if (lastPageKey.current === pageKey) {
      return;
    }

    lastPageKey.current = pageKey;

    const now = Date.now();
    const storedSession = readStoredSession();
    const resolution = resolveSessionState(storedSession, now, {
      sessionId: crypto.randomUUID()
    });
    const session = canReuseFirstTouch(storedSession, resolution.isNew, now) && storedSession
      ? {
          sessionId: resolution.sessionId,
          lastActivityAt: resolution.lastActivityAt,
          attribution: storedSession.attribution,
          landingPath: storedSession.landingPath,
          referrerHost: storedSession.referrerHost
        }
      : createSession(resolution.sessionId, resolution.lastActivityAt, currentUrl, pagePath);

    writeStoredSession(session);

    const pageViewId = crypto.randomUUID();
    void fetch('/api/cms/analytics/page-view', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      keepalive: true,
      body: JSON.stringify({
        sessionId: session.sessionId,
        pageViewId,
        ...session.attribution,
        referrerHost: session.referrerHost,
        landingPath: session.landingPath,
        pagePath,
        pageTitle: document.title,
        locale,
        deviceClass: classifyDevice(window.innerWidth, false)
      })
    }).catch(() => undefined);
  }, [enabled, locale, pathname, search]);

  return null;
}

export function clearInternalAnalyticsSession() {
  try {
    window.localStorage.removeItem(INTERNAL_ANALYTICS_STORAGE_KEY);
  } catch {
    // Privacy controls must remain responsive when browser storage is unavailable.
  }
}

function createSession(sessionId: string, lastActivityAt: number, currentUrl: string, landingPath: string): StoredInternalAnalyticsSession {
  const url = new URL(currentUrl);
  const referrerHost = sanitizeReferrerHost(document.referrer, window.location.origin);

  return {
    sessionId,
    lastActivityAt,
    attribution: classifyTrafficSource({
      source: url.searchParams.get('utm_source') ?? undefined,
      medium: url.searchParams.get('utm_medium') ?? undefined,
      campaign: url.searchParams.get('utm_campaign') ?? undefined,
      content: url.searchParams.get('utm_content') ?? undefined,
      referrerHost
    }),
    landingPath,
    referrerHost
  };
}

function canReuseFirstTouch(
  storedSession: StoredInternalAnalyticsSession | null,
  isNew: boolean,
  now: number
) {
  return Boolean(
    storedSession &&
    !isNew &&
    now - storedSession.lastActivityAt <= INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS
  );
}

function readStoredSession(): StoredInternalAnalyticsSession | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(INTERNAL_ANALYTICS_STORAGE_KEY) ?? 'null');
    return isStoredSession(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredInternalAnalyticsSession) {
  try {
    window.localStorage.setItem(INTERNAL_ANALYTICS_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Tracking remains best-effort when storage is unavailable.
  }
}

function isStoredSession(value: unknown): value is StoredInternalAnalyticsSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.sessionId === 'string' &&
    typeof session.lastActivityAt === 'number' &&
    typeof session.landingPath === 'string' &&
    typeof session.referrerHost === 'string' &&
    isAttribution(session.attribution)
  );
}

function isAttribution(value: unknown): value is TrafficAttribution {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const attribution = value as Record<string, unknown>;
  return ['channel', 'source', 'medium', 'campaign', 'content'].every(
    (key) => typeof attribution[key] === 'string'
  );
}
