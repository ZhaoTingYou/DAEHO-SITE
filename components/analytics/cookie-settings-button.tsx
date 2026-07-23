'use client';

import {ANALYTICS_CONSENT_EVENT} from '@/lib/analytics-core.mjs';

type CookieSettingsButtonProps = {
  locale: 'ko' | 'en';
};

export function CookieSettingsButton({locale}: CookieSettingsButtonProps) {
  return (
    <button
      type="button"
      className="footer-link footer-link--legal"
      onClick={() => window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT))}
    >
      {locale === 'ko' ? '쿠키 설정' : 'Cookie settings'}
    </button>
  );
}
