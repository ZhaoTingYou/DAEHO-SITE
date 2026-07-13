import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {GolfInquiryForm} from '@/components/forms/golf-inquiry-form';
import {Reveal} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{head?: string; shaft?: string; engraving?: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;

  if (!(await isGolfEnabledForSite())) {
    notFound();
  }

  return getPageMetadata(locale, 'golfInquiry');
}

export default async function GolfInquiryPage({params, searchParams}: Props) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  if (!(await isGolfEnabledForSite())) {
    notFound();
  }

  const messages = await getLocaleMessages(locale);
  const text = messages.golfInquiry;
  const golf = messages.golf;
  const selectedHead = golf.heads.items.find((item) => item.id === query.head) ?? golf.heads.items[0];
  const selectedShaft =
    golf.shafts.items.find((item) => item.id === query.shaft) ?? golf.shafts.items[0];
  const engravingSample = query.engraving?.trim().slice(0, 80) || 'JUDY KIM 2026.05.03';

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
            <Link href={withLocale(locale, '/golf')} className="link-sweep inline-flex min-h-11 items-center font-body text-[16px] font-semibold uppercase tracking-[0.08em] md:text-sm md:tracking-[0.12em]">
              {text.edit}
            </Link>
          </Reveal>
          <Reveal className="grid gap-4 bg-bg p-4 shadow-[0_24px_86px_rgba(16,29,48,0.08)] md:gap-5 md:p-7">
            <SafeImage
              filename={selectedShaft.image}
              alt={`${selectedHead.label} ${selectedShaft.label}`}
              aspect="aspect-[4/3]"
              variant="plain"
              priority
            />
            <div className="space-y-4 bg-white p-4 md:p-5">
              <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">
                {text.summary}
              </p>
              <SpecRow label={text.head} value={selectedHead.label} />
              <SpecRow label={text.shaft} value={selectedShaft.label} />
              <SpecRow label={text.engraving} value={engravingSample} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-bg py-[var(--mobile-section-space)] md:py-section">
        <div className="mx-auto max-w-5xl px-[var(--mobile-page-gutter)] md:px-container">
          <Reveal className="bg-white p-4 shadow-[0_24px_86px_rgba(16,29,48,0.07)] md:p-8">
            <GolfInquiryForm
              copy={messages.forms.golfInquiry}
              configuration={{
                head: selectedHead.label,
                shaft: selectedShaft.label,
                engraving: engravingSample
              }}
            />
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function SpecRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex flex-col gap-1 border-t border-hairline pt-4 font-body text-[16px] leading-6 md:flex-row md:items-center md:justify-between md:gap-5 md:text-sm">
      <span className="font-semibold uppercase tracking-[0.08em] text-subtext md:tracking-[0.14em]">{label}</span>
      <span className="break-words font-semibold text-primary md:text-right">{value}</span>
    </div>
  );
}
