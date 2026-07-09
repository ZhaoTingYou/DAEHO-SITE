import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';

import {Reveal} from '@/components/motion/reveal';
import {ScrollText} from '@/components/motion/scroll-text';
import {SafeImage} from '@/components/safe-image';
import {RingDrawingBackground} from '@/components/specialty/ring-drawing-background';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';

type Props = {
  params: Promise<{locale: Locale}>;
};

type TechniqueRecordItem = {
  number: string;
  title: string;
  scope: string;
  status: string;
  body: string;
  image: string;
};

type TechniqueStandardItem = {
  title: string;
  body: string;
  image: string;
};

type TechniqueEvidenceRow = {
  label: string;
  value: string;
  proof: string;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'techniqueRecords');
}

export default async function TechniqueRecordPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = (await getLocaleMessages(locale)).specialtyPages.techniqueRecords;

  return (
    <main className="relative isolate overflow-hidden bg-white text-text">
      <RingDrawingBackground />

      <section className="relative z-10 pt-28">
        <div className="mx-auto max-w-[1220px] px-container pb-[clamp(72px,8vw,124px)] pt-[clamp(64px,8vw,116px)]">
          <ScrollText className="mx-auto max-w-[760px] space-y-[18px] text-center">
            <p className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.32em] text-accent">
              {content.hero.eyebrow}
            </p>
            <h1 className="[font-family:'Cormorant_Garamond',serif] text-[clamp(48px,6.2vw,86px)] font-bold uppercase leading-[0.9] tracking-[0.05em] text-primary">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-[660px] whitespace-pre-line font-heading text-[15px] font-semibold leading-[1.85] text-primary/82">
              {content.hero.body}
            </p>
          </ScrollText>

          <Reveal className="mx-auto mt-[clamp(46px,6vw,78px)] w-full max-w-[1120px] border border-primary/12 bg-white p-2 shadow-[0_30px_100px_rgba(16,29,48,.08)]">
            <SafeImage
              filename={content.hero.image}
              alt={content.hero.title}
              aspect="aspect-[21/9]"
              variant="plain"
              sizes="(min-width: 1024px) 1120px, 100vw"
              priority
            />
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 border-y border-primary/10 bg-white/88 py-[clamp(72px,8vw,118px)]">
        <div className="mx-auto max-w-[1180px] px-container">
          <ScrollText className="grid gap-[clamp(30px,4vw,56px)] lg:grid-cols-[minmax(220px,0.34fr)_minmax(0,0.66fr)]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.3em] text-accent">
                {content.records.eyebrow}
              </p>
              <h2 className="mt-5 font-heading text-[clamp(26px,2.7vw,38px)] font-semibold leading-[1.2] text-primary">
                {content.records.title}
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {content.records.items.map((item) => (
                <TechniqueRecordCard key={item.number} item={item} />
              ))}
            </div>
          </ScrollText>
        </div>
      </section>

      <section className="relative z-10 bg-white py-[clamp(82px,9vw,136px)]">
        <div className="mx-auto max-w-[1120px] px-container">
          <ScrollText className="mx-auto max-w-[760px] text-center">
            <p className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.3em] text-accent">
              {content.standards.eyebrow}
            </p>
            <h2 className="mt-5 font-heading text-[clamp(27px,2.8vw,40px)] font-semibold leading-[1.18] text-primary">
              {content.standards.title}
            </h2>
          </ScrollText>

          <div className="mt-[clamp(40px,5vw,70px)] grid gap-5 md:grid-cols-2">
            {content.standards.items.map((item) => (
              <TechniqueStandardCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-white/92 py-[clamp(76px,8vw,124px)]">
        <div className="mx-auto max-w-[1040px] px-container">
          <ScrollText className="mx-auto max-w-[720px] text-center">
            <p className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.3em] text-accent">
              {content.evidence.eyebrow}
            </p>
            <h2 className="mt-5 font-heading text-[clamp(26px,2.6vw,36px)] font-semibold leading-[1.24] text-primary">
              {content.evidence.title}
            </h2>
          </ScrollText>

          <Reveal className="mt-[clamp(34px,4.5vw,58px)] border-y border-primary/18 bg-white">
            <div className="divide-y divide-primary/12">
              {content.evidence.rows.map((row) => (
                <EvidenceRow key={row.label} row={row} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 bg-white py-[clamp(88px,9vw,142px)]">
        <div className="mx-auto max-w-3xl px-container text-center">
          <ScrollText className="space-y-7">
            <h2 className="font-heading text-[clamp(28px,2.8vw,38px)] font-semibold leading-[1.22] text-primary">
              {content.cta.title}
            </h2>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={withLocale(locale, '/mastery/making')}
                className="link-sweep inline-flex min-h-11 items-center font-body text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-accent"
              >
                {content.cta.makingLabel}
              </Link>
              <span className="hidden h-4 w-px bg-primary/18 sm:block" aria-hidden="true" />
              <Link
                href={withLocale(locale, '/mastery/creations')}
                className="link-sweep inline-flex min-h-11 items-center font-body text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-accent"
              >
                {content.cta.creationsLabel}
              </Link>
            </div>
          </ScrollText>
        </div>
      </section>
    </main>
  );
}

function TechniqueRecordCard({item}: {item: TechniqueRecordItem}) {
  return (
    <article className="border border-primary/12 bg-white p-3 shadow-[0_18px_70px_rgba(16,29,48,.06)]">
      <SafeImage filename={item.image} alt={item.title} aspect="aspect-[4/5]" variant="plain" sizes="(min-width: 1024px) 320px, 100vw" />
      <div className="space-y-4 px-2 pb-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <p className="font-body text-[13px] font-semibold uppercase leading-none tracking-[0.2em] text-accent">
            {item.number}
          </p>
          <p className="border border-primary/14 px-2 py-1 font-body text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-subtext">
            {item.status}
          </p>
        </div>
        <h3 className="font-heading text-[clamp(19px,1.7vw,23px)] font-semibold leading-[1.28] text-primary">
          {item.title}
        </h3>
        <p className="font-body text-[12px] font-semibold uppercase leading-5 tracking-[0.12em] text-primary/60">
          {item.scope}
        </p>
        <p className="whitespace-pre-line font-body text-[15px] leading-7 text-text">
          {item.body}
        </p>
      </div>
    </article>
  );
}

function TechniqueStandardCard({item}: {item: TechniqueStandardItem}) {
  return (
    <article className="grid gap-5 border-t border-primary/16 pt-5 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
      <SafeImage filename={item.image} alt={item.title} aspect="aspect-square" variant="plain" sizes="(min-width: 768px) 150px, 100vw" />
      <div className="max-w-[440px] space-y-3">
        <h3 className="font-heading text-[clamp(20px,1.8vw,25px)] font-semibold leading-[1.26] text-primary">
          {item.title}
        </h3>
        <p className="whitespace-pre-line font-body text-[15px] leading-7 text-text">
          {item.body}
        </p>
      </div>
    </article>
  );
}

function EvidenceRow({row}: {row: TechniqueEvidenceRow}) {
  return (
    <div className="grid gap-3 px-4 py-5 md:grid-cols-[0.28fr_0.42fr_0.3fr] md:items-center md:px-6">
      <p className="font-body text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-accent">
        {row.label}
      </p>
      <p className="font-heading text-[18px] font-semibold leading-[1.35] text-primary">
        {row.value}
      </p>
      <p className="font-body text-[13px] font-medium leading-6 text-subtext md:text-right">
        {row.proof}
      </p>
    </div>
  );
}
