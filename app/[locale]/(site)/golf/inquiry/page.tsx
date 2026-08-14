import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {
  GolfInquiryFormFromQuery,
  GolfInquirySummary
} from '@/components/golf/golf-inquiry-query';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;

  if (!(await isGolfEnabledForSite())) {
    notFound();
  }

  return getPageMetadata(locale, 'golfInquiry');
}

export default async function GolfInquiryPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  if (!(await isGolfEnabledForSite())) {
    notFound();
  }

  const messages = await getPublicLocaleMessages(locale, ['golf-inquiry']);
  const text = messages.golfInquiry;
  const golf = messages.golf;

  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="bg-bg pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+32px)] md:pt-28">
        <div className="mx-auto grid min-h-[80svh] max-w-[1440px] gap-8 px-[var(--mobile-page-gutter)] py-[var(--mobile-section-space)] md:min-h-[82dvh] md:gap-12 md:px-container md:py-section lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal className="space-y-7">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">
              {text.hero.eyebrow}
            </p>
            <h1 className="mobile-display font-heading font-semibold text-primary md:text-[clamp(34px,5.8vw,68px)] md:leading-none">
              {text.hero.title}
            </h1>
            <p className="mobile-copy max-w-2xl break-words whitespace-pre-line font-body text-text md:text-body">{text.hero.body}</p>
            <Link href={resolveCmsHref(locale, text.editHref, '/golf')} className="link-sweep inline-flex min-h-11 items-center font-body text-[16px] font-semibold uppercase tracking-[0.08em] md:text-sm md:tracking-[0.12em]">
              {text.edit}
            </Link>
          </Reveal>
          <Reveal className="grid gap-4 bg-bg p-4 shadow-[0_24px_86px_rgba(16,29,48,0.08)] md:gap-5 md:p-7">
            <GolfInquirySummary golf={golf} text={text} />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg py-[var(--mobile-section-space)] md:py-section">
        <div className="mx-auto max-w-5xl px-[var(--mobile-page-gutter)] md:px-container">
          <Reveal className="bg-white p-4 shadow-[0_24px_86px_rgba(16,29,48,0.07)] md:p-8">
            <GolfInquiryFormFromQuery golf={golf} copy={messages.forms.golfInquiry} />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
