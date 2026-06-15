'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useParams} from 'next/navigation';

import type {Locale} from '@/i18n/routing';
import {isLocale} from '@/lib/locales';

export default function NotFound() {
  const params = useParams<{locale?: Locale}>();
  const locale = isLocale(params.locale) ? params.locale : 'ko';
  const text = useTranslations('notFound');
  const nav = useTranslations('common.navigation');

  return (
    <main className="min-h-dvh bg-bg px-container py-section text-primary">
      <div className="mx-auto flex min-h-[72dvh] max-w-5xl flex-col justify-center gap-8 text-center">
        <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">404</p>
        <h1 className="font-heading text-[clamp(40px,7vw,84px)] font-semibold leading-none">
          {text('title')}
        </h1>
        <p className="mx-auto max-w-2xl font-body text-body leading-[1.75] text-text">{text('body')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href={`/${locale}`} className="link-sweep font-body text-sm font-semibold uppercase tracking-[0.12em]">
            {nav('items.home')}
          </Link>
          <Link href={`/${locale}/news`} className="link-sweep font-body text-sm font-semibold uppercase tracking-[0.12em]">
            {nav('items.news')}
          </Link>
          <Link href={`/${locale}/contact`} className="link-sweep font-body text-sm font-semibold uppercase tracking-[0.12em]">
            {nav('contactCta')}
          </Link>
        </div>
      </div>
    </main>
  );
}
