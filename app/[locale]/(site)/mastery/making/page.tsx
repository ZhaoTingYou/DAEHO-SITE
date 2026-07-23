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
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

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
  const content = (await getLocaleMessages(locale)).specialtyPages.technique;
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
    <main className="mobile-page-shell relative isolate overflow-hidden bg-white text-text">
      <section className="relative z-10 pt-28">
        <div className="mx-auto max-w-[1220px] px-container pb-[clamp(80px,8vw,132px)] pt-[clamp(70px,8vw,122px)]">
          <ScrollText className="mx-auto max-w-[720px] space-y-[18px] text-center">
            <h1 className="[font-family:'Cormorant_Garamond',serif] text-[clamp(40px,3.7vw,58px)] font-bold uppercase leading-none tracking-[0.04em] text-accent">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-xl whitespace-pre-line font-heading text-[15px] font-semibold leading-[1.85] text-primary">
              {content.hero.subtitle}
            </p>
          </ScrollText>
          <Reveal className="mx-auto mt-[clamp(52px,6vw,88px)] w-full max-w-[1120px] border border-primary/12 bg-white p-2">
            <SafeImage
              filename={content.hero.image}
              alt={content.hero.subtitle}
              aspect="max-md:aspect-[4/3] md:aspect-[21/9]"
              variant="plain"
              priority
            />
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 bg-white py-[72px] md:py-[clamp(86px,9vw,132px)]">
        <div className="mx-auto max-w-[1120px] px-container">
          <ScrollText className="border-l border-accent/45 py-[6px] pl-[clamp(28px,3.6vw,48px)] text-left">
            <p className="font-body text-[10px] font-semibold uppercase leading-none tracking-[0.34em] text-text/45">
              {content.process.eyebrow}
            </p>
            <h2 className="mt-[24px] font-heading text-[clamp(26px,2.55vw,36px)] font-semibold leading-[1.25] text-primary">
              {content.process.title}
            </h2>
          </ScrollText>
        </div>
      </section>

      <SpecialtyProcess steps={processSteps} />

      <section className="relative z-10 py-[clamp(86px,9vw,138px)]">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(54px,6vw,82px)] px-container">
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

      <section className="relative z-10 py-[clamp(104px,11vw,168px)]">
        <div className="mx-auto max-w-3xl px-container text-center">
          <ScrollText className="space-y-[18px]">
            <h2 className="[font-family:'MaruBuri',serif] text-[clamp(28px,2.7vw,34px)] font-semibold leading-[1.25] text-primary">
              {content.bespoke.title}
            </h2>
            <Link
              href={resolveCmsHref(locale, content.bespoke.href, '/mastery/creations')}
              className="link-sweep inline-flex [font-family:'Cormorant_Garamond',serif] text-[15px] font-bold uppercase leading-[19px] tracking-[0.2em] text-accent"
            >
              {content.bespoke.cta}
            </Link>
          </ScrollText>
        </div>
      </section>
    </main>
  );
}
