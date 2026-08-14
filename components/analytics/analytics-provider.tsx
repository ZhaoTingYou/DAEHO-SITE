'use client';

import Script from 'next/script';
import {usePathname, useSearchParams} from 'next/navigation';
import {Suspense, useEffect, useRef, useState} from 'react';

import {
  ANALYTICS_CONSENT_EVENT,
  classifyAnalyticsLink,
  parseAnalyticsConsent,
  sanitizeAnalyticsUrl,
  serializeAnalyticsConsent,
  type AnalyticsConsent
} from '@/lib/analytics-core.mjs';
import {clearInternalAnalyticsSession, InternalAnalyticsTracker} from './internal-analytics-tracker';
import {
  deleteGoogleAnalyticsCookies,
  denyGoogleAnalyticsConsent,
  initializeGoogleAnalytics,
  setAnalyticsRuntimeConsent,
  trackAnalyticsEvent
} from '@/lib/analytics';

type AnalyticsProviderProps = {
  children: React.ReactNode;
  locale: 'ko' | 'en';
  privacyHref?: string;
};

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';
const validMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId);
const copy = {
  ko: {
    title: '방문 분석 설정',
    body: '방문 경로와 사이트 이용 현황을 확인하기 위해 Google Analytics를 사용합니다. 동의한 경우에만 분석 쿠키가 설정됩니다.',
    accept: '분석 허용',
    reject: '거부',
    privacy: '개인정보처리방침'
  },
  en: {
    title: 'Analytics preferences',
    body: 'We use Google Analytics to understand how visitors reach and use this site. Analytics cookies are set only after you consent.',
    accept: 'Allow analytics',
    reject: 'Reject',
    privacy: 'Privacy Policy'
  }
} as const;

// 배너가 뜬 뒤 웹폰트가 교체되면 글자 높이가 달라진다. 배너는 화면 하단에 고정돼 있어서
// 높이가 줄면 내용이 그만큼 아래로 밀리고, 그게 레이아웃 이동으로 잡힌다.
// 글꼴이 확정된 뒤에 한 번만 그리면 이동이 생기지 않는다.
const FONT_SETTLE_TIMEOUT_MS = 3000;

export function AnalyticsProvider({children, locale, privacyHref}: AnalyticsProviderProps) {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown');
  const [bannerOpen, setBannerOpen] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [fontsSettled, setFontsSettled] = useState(false);

  useEffect(() => {
    let active = true;
    const settle = () => {
      if (active) {
        setFontsSettled(true);
      }
    };

    // 글꼴 로딩이 실패하거나 지연되어도 동의 배너가 영영 안 뜨는 일은 없어야 한다.
    const timer = window.setTimeout(settle, FONT_SETTLE_TIMEOUT_MS);
    const fonts = document.fonts;
    if (fonts?.ready) {
      fonts.ready.then(settle).catch(settle);
    } else {
      settle();
    }

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const storedConsent = parseAnalyticsConsent(document.cookie);
    if (storedConsent === 'denied') {
      clearInternalAnalyticsSession();
    }

    if (!validMeasurementId) {
      return;
    }

    let active = true;
    if (storedConsent === 'granted') {
      initializeGoogleAnalytics(measurementId);
    }
    setAnalyticsRuntimeConsent(storedConsent);
    queueMicrotask(() => {
      if (active) {
        setConsent(storedConsent);
        setBannerOpen(storedConsent === 'unknown');
      }
    });

    const openSettings = () => setBannerOpen(true);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, openSettings);
    return () => {
      active = false;
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, openSettings);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target) {
        return;
      }

      const classified = classifyAnalyticsLink(target.getAttribute('href') ?? '', window.location.origin);
      if (!classified) {
        return;
      }

      const {pagePath} = sanitizeAnalyticsUrl(window.location.href);
      trackAnalyticsEvent(classified.name, {
        cta_location: getCtaLocation(target),
        destination: classified.destination,
        platform: classified.platform,
        locale,
        page_path: pagePath
      });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [locale]);

  const updateConsent = (nextConsent: Exclude<AnalyticsConsent, 'unknown'>) => {
    document.cookie = serializeAnalyticsConsent(nextConsent, window.location.protocol === 'https:');
    if (nextConsent === 'granted') {
      initializeGoogleAnalytics(measurementId);
    }
    setConsent(nextConsent);
    setAnalyticsRuntimeConsent(nextConsent);
    setBannerOpen(false);

    if (nextConsent === 'denied') {
      denyGoogleAnalyticsConsent();
      deleteGoogleAnalyticsCookies();
      clearInternalAnalyticsSession();
      setAnalyticsReady(false);
    }
  };

  const markAnalyticsReady = () => {
    initializeGoogleAnalytics(measurementId);
    setAnalyticsRuntimeConsent('granted');
    setAnalyticsReady(true);
  };

  return (
    <>
      {children}
      {consent === 'granted' && validMeasurementId ? (
        <Script
          id="daeho-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          strategy="afterInteractive"
          onLoad={markAnalyticsReady}
          onReady={markAnalyticsReady}
        />
      ) : null}
      <Suspense fallback={null}>
        <AnalyticsPageView enabled={analyticsReady && consent === 'granted'} />
        {consent === 'granted' && validMeasurementId ? (
          <InternalAnalyticsTracker enabled={consent === 'granted'} locale={locale} />
        ) : null}
      </Suspense>
      {bannerOpen && validMeasurementId && fontsSettled ? (
          <ConsentBanner
            locale={locale}
            privacyHref={privacyHref}
          onAccept={() => updateConsent('granted')}
          onReject={() => updateConsent('denied')}
        />
      ) : null}
    </>
  );
}

function AnalyticsPageView({enabled}: {enabled: boolean}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const lastPageView = useRef('');

  useEffect(() => {
    if (!enabled || typeof window.gtag !== 'function') {
      return;
    }

    const {pageLocation, pagePath} = sanitizeAnalyticsUrl(`${window.location.origin}${pathname}${search ? `?${search}` : ''}`);
    if (lastPageView.current === pageLocation) {
      return;
    }

    lastPageView.current = pageLocation;
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: pageLocation,
      page_path: pagePath
    });
  }, [enabled, pathname, search]);

  return null;
}

function ConsentBanner({
  locale,
  privacyHref,
  onAccept,
  onReject
}: {
  locale: 'ko' | 'en';
  privacyHref?: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const text = copy[locale];

  return (
    <section
      data-analytics-consent-banner
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-hairline bg-white px-container py-4 shadow-[0_-12px_32px_rgba(13,30,46,0.08)] md:py-5"
      role="dialog"
      aria-modal="false"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-description"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="max-w-3xl">
          <h2 id="analytics-consent-title" className="font-body text-[15px] font-semibold text-primary md:text-base">
            {text.title}
          </h2>
          <p id="analytics-consent-description" className="mt-1 font-body text-[13px] leading-6 text-subtext md:text-sm">
            {text.body}{' '}
            <a href={privacyHref ?? `/${locale}/privacy`} className="underline decoration-hairline underline-offset-4 hover:text-accent focus-visible:text-accent">
              {text.privacy}
            </a>
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:min-w-[260px]">
          <button
            type="button"
            className="min-h-11 border border-primary bg-white px-5 py-2 font-body text-[14px] font-semibold text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:flex-1"
            onClick={onReject}
          >
            {text.reject}
          </button>
          <button
            type="button"
            className="min-h-11 border border-accent bg-accent px-5 py-2 font-body text-[14px] font-semibold text-white transition-colors hover:border-primary hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:flex-1"
            onClick={onAccept}
          >
            {text.accept}
          </button>
        </div>
      </div>
    </section>
  );
}

function getCtaLocation(element: Element) {
  const explicitLocation = element.closest<HTMLElement>('[data-analytics-location]')?.dataset.analyticsLocation;
  if (explicitLocation) {
    return explicitLocation;
  }
  if (element.closest('header')) {
    return 'header';
  }
  if (element.closest('footer')) {
    return 'footer';
  }
  if (element.closest('[data-golf-configurator]')) {
    return 'golf_configurator';
  }
  return 'content';
}
