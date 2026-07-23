'use client';

import {
  sanitizeAnalyticsEvent,
  sanitizeAnalyticsUrl,
  type AnalyticsConsent,
  type AnalyticsEventName
} from '@/lib/analytics-core.mjs';

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __daehoAnalyticsMeasurementId?: string;
  }
}

let runtimeConsent: AnalyticsConsent = 'unknown';

export function setAnalyticsRuntimeConsent(consent: AnalyticsConsent) {
  runtimeConsent = consent;
}

export function initializeGoogleAnalytics(measurementId: string) {
  if (window.__daehoAnalyticsMeasurementId === measurementId && typeof window.gtag === 'function') {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });

  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true
  });
  window.__daehoAnalyticsMeasurementId = measurementId;
}

export function denyGoogleAnalyticsConsent() {
  window.gtag?.('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
}

export function trackAnalyticsEvent(name: AnalyticsEventName, parameters: Record<string, unknown> = {}) {
  if (runtimeConsent !== 'granted' || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const event = sanitizeAnalyticsEvent(name, parameters);
  if (event) {
    window.gtag('event', event.name, event.parameters);
  }
}

export function currentAnalyticsPagePath() {
  if (typeof window === 'undefined') {
    return '';
  }
  return sanitizeAnalyticsUrl(window.location.href).pagePath;
}

export function deleteGoogleAnalyticsCookies() {
  if (typeof document === 'undefined') {
    return;
  }

  const cookieNames = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));
  const hostname = window.location.hostname;
  const domains = hostname === 'localhost' ? [] : [hostname, `.${hostname}`, '.daeho.works'];
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  for (const name of new Set(cookieNames)) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax${secure}`;
    }
  }
}
