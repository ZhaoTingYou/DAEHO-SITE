'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useParams} from 'next/navigation';

import type {Locale} from '@/i18n/routing';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {isLocale} from '@/lib/locales';

export default function NotFound() {
  const params = useParams<{locale?: Locale}>();
  const locale = isLocale(params.locale) ? params.locale : 'ko';
  const text = useTranslations('notFound');
  const nav = useTranslations('common.navigation');
  const hrefs = nav.raw('hrefs') as Record<string, string>;

  return (
    <main className="mobile-page-shell min-h-[80svh] bg-bg px-[var(--mobile-page-gutter)] py-[var(--mobile-section-space)] text-primary md:min-h-dvh md:px-container md:py-section">
      <div className="mx-auto flex min-h-[68svh] max-w-5xl flex-col justify-center gap-6 text-center md:min-h-[72dvh] md:gap-8">
        <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">404</p>
        <h1 className="mobile-display font-heading font-semibold text-primary md:text-[clamp(40px,7vw,84px)] md:leading-none">
          {text('title')}
        </h1>
        <p className="mobile-copy mx-auto max-w-2xl break-words font-body text-text md:text-body">{text('body')}</p>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link href={resolveCmsHref(locale, hrefs.home, '/')} className="link-sweep flex min-h-11 items-center justify-center font-body text-[16px] font-semibold uppercase tracking-[0.08em] md:inline-flex md:text-sm md:tracking-[0.12em]">
            {nav('items.home')}
          </Link>
          <Link href={resolveCmsHref(locale, hrefs.news, '/news')} className="link-sweep flex min-h-11 items-center justify-center font-body text-[16px] font-semibold uppercase tracking-[0.08em] md:inline-flex md:text-sm md:tracking-[0.12em]">
            {nav('items.news')}
          </Link>
          <Link href={resolveCmsHref(locale, hrefs.contact, '/contact')} className="link-sweep flex min-h-11 items-center justify-center font-body text-[16px] font-semibold uppercase tracking-[0.08em] md:inline-flex md:text-sm md:tracking-[0.12em]">
            {nav('contactCta')}
          </Link>
        </div>
      </div>
    </main>
  );
}
