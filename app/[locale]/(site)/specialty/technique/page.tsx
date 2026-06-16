import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';

import {Reveal} from '@/components/motion/reveal';
import {ScrollText} from '@/components/motion/scroll-text';
import {SafeImage} from '@/components/safe-image';
import {SectionIntro} from '@/components/section-intro';
import {SpecialtyDetailTriplet} from '@/components/specialty/specialty-detail-triplet';
import {SpecialtyProcess} from '@/components/specialty/specialty-process';
import type {Locale} from '@/i18n/routing';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'technique');
}

export default async function TechniquePage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = getLocaleMessages(locale).specialtyPages.technique;
  const processSteps = content.process.steps.map((step) => ({
    ...step,
    hasImage: imageExists(step.image)
  }));
  const detailItems = content.details.items.map((item, index) => ({
    ...item,
    number: String(index + 1).padStart(2, '0'),
    hasImage: imageExists(item.image)
  }));

  return (
    <main className="bg-bg text-text">
      <section className="bg-white pt-28">
        <div className="mx-auto max-w-[1280px] px-container pb-[clamp(72px,8vw,128px)] pt-[clamp(64px,8vw,120px)]">
          <ScrollText className="mx-auto max-w-3xl space-y-6 text-center">
            {content.hero.eyebrow ? (
              <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
                {content.hero.eyebrow}
              </p>
            ) : null}
            <h1 className="[font-family:'Cormorant_Garamond',serif] text-[clamp(36px,3.4vw,52px)] font-bold uppercase leading-none tracking-normal text-accent">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-xl font-heading text-[14px] font-semibold leading-[1.85] text-primary">
              {content.hero.subtitle}
            </p>
          </ScrollText>
          <Reveal className="mx-auto mt-[clamp(48px,6vw,88px)] w-full max-w-[1180px]">
            <SafeImage
              filename={content.hero.image}
              alt={content.hero.subtitle}
              aspect="aspect-[21/9]"
              variant="plain"
              priority
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg pb-[clamp(48px,5vw,80px)] pt-section">
        <div className="mx-auto max-w-[1180px] px-container">
          <ScrollText>
            <SectionIntro
              eyebrow={content.process.eyebrow}
              title={content.process.title}
              variant="specialty"
            >
              {content.process.body ? <p>{content.process.body}</p> : null}
            </SectionIntro>
          </ScrollText>
        </div>
      </section>

      <SpecialtyProcess steps={processSteps} />

      <section className="bg-white py-section">
        <div className="mx-auto max-w-[1180px] space-y-[clamp(56px,6vw,88px)] px-container">
          <ScrollText>
            <SectionIntro
              eyebrow={content.details.eyebrow}
              title={content.details.title}
              variant="specialty"
            >
              <p>{content.details.body}</p>
            </SectionIntro>
          </ScrollText>
          <SpecialtyDetailTriplet items={detailItems} />
        </div>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-container lg:grid-cols-2 lg:gap-16">
          <ScrollText className="order-2 max-w-md space-y-5 lg:order-1">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-accent">
              {content.bespoke.eyebrow}
            </p>
            <h2 className="font-heading text-[clamp(22px,2.4vw,32px)] font-semibold leading-[1.25] text-primary">
              {content.bespoke.title}
            </h2>
            <p className="font-body text-[14px] leading-[1.85] text-text">
              {content.bespoke.body}
            </p>
            <Link
              href={withLocale(locale, '/specialty/collection')}
              className="link-sweep inline-flex pt-1 font-body text-[12px] font-semibold uppercase tracking-[0.16em]"
            >
              {content.bespoke.cta}
            </Link>
          </ScrollText>
          <Reveal className="order-1 lg:order-2">
            <SafeImage
              filename={content.bespoke.image}
              alt={content.bespoke.body}
              aspect="aspect-[4/3]"
              variant="plain"
            />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
