import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';

import {GolfInquiryForm} from '@/components/forms/golf-inquiry-form';
import {Reveal} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{head?: string; shaft?: string; engraving?: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'golfInquiry');
}

export default async function GolfInquiryPage({params, searchParams}: Props) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const text = messages.golfInquiry;
  const golf = messages.golf;
  const selectedHead = golf.heads.items.find((item) => item.id === query.head) ?? golf.heads.items[0];
  const selectedShaft =
    golf.shafts.items.find((item) => item.id === query.shaft) ?? golf.shafts.items[0];
  const engravingSample = query.engraving?.trim().slice(0, 80) || 'JUDY KIM 2026.05.03';

  return (
    <main className="bg-bg text-text">
      <section className="bg-bg pt-28">
        <div className="mx-auto grid min-h-[82dvh] max-w-[1440px] gap-12 px-container py-section lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal className="space-y-7">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">
              {text.hero.eyebrow}
            </p>
            <h1 className="font-heading text-[clamp(34px,5.8vw,68px)] font-semibold leading-none text-primary">
              {text.hero.title}
            </h1>
            <p className="max-w-2xl font-body text-body leading-[1.75] text-text">{text.hero.body}</p>
            <Link href={withLocale(locale, '/golf')} className="link-sweep inline-flex font-body text-sm font-semibold uppercase tracking-[0.12em]">
              {text.edit}
            </Link>
          </Reveal>
          <Reveal className="grid gap-5 bg-bg p-5 shadow-[0_24px_86px_rgba(16,29,48,0.08)] md:p-7">
            <SafeImage
              filename={selectedShaft.image}
              alt={`${selectedHead.label} ${selectedShaft.label}`}
              aspect="aspect-[4/3]"
              variant="plain"
              priority
            />
            <div className="space-y-4 bg-white p-5">
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

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-5xl px-container">
          <Reveal className="bg-white p-5 shadow-[0_24px_86px_rgba(16,29,48,0.07)] md:p-8">
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
    <div className="flex items-center justify-between gap-5 border-t border-hairline pt-4 font-body text-sm">
      <span className="font-semibold uppercase tracking-[0.14em] text-subtext">{label}</span>
      <span className="text-right font-semibold text-primary">{value}</span>
    </div>
  );
}
