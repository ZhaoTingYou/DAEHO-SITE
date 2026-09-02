'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

export function AccountNavLink({locale, variant = 'text'}: {locale: 'ko' | 'en'; variant?: 'text' | 'icon' | 'mobile-menu'}) {
  const text = useTranslations('common.navigation');
  const [state, setState] = useState<{loaded: boolean; enabled: boolean; authenticated: boolean}>({loaded: false, enabled: false, authenticated: false});
  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((payload: {enabled?: boolean; authenticated?: boolean}) => setState({loaded: true, enabled: Boolean(payload.enabled), authenticated: Boolean(payload.authenticated)}))
      .catch(() => setState({loaded: true, enabled: false, authenticated: false}));
  }, []);
  if (!state.loaded || !state.enabled) {
    return variant === 'icon' ? <span className="h-11 w-11" aria-hidden="true" /> : null;
  }
  const href = state.authenticated ? `/${locale}/my-daeho` : `/${locale}/login`;
  const label = state.authenticated ? text('accountDashboard') : text('accountLogin');
  if (variant === 'icon') {
    return (
      <Link href={href} aria-label={label} className="flex h-11 w-11 items-center justify-center">
        <span aria-hidden="true" className="relative h-5 w-5 rounded-full border border-current before:absolute before:left-1/2 before:top-[3px] before:h-[5px] before:w-[5px] before:-translate-x-1/2 before:rounded-full before:border before:border-current after:absolute after:bottom-[3px] after:left-1/2 after:h-[5px] after:w-[10px] after:-translate-x-1/2 after:rounded-t-full after:border after:border-b-0 after:border-current" />
      </Link>
    );
  }
  if (variant === 'mobile-menu') {
    return <Link href={href} className="site-header-mobile-nav-label flex min-h-14 items-center border-b border-hairline pb-4 font-body text-[15px] font-semibold uppercase tracking-[0.22em]">{label}</Link>;
  }
  return <Link href={href} className="site-nav-link shrink-0">{label}</Link>;
}
