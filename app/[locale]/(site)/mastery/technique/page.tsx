import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';

import {Reveal} from '@/components/motion/reveal';
import {ScrollText} from '@/components/motion/scroll-text';
import {SafeImage} from '@/components/safe-image';
import {RingDrawingBackground} from '@/components/specialty/ring-drawing-background';
import {TechniqueCarouselSection} from '@/components/specialty/technique-carousel-section';
import {TechniqueIntroSection} from '@/components/specialty/technique-intro-section';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {isTechniquePageVisible} from '@/lib/public-page-visibility';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;

  if (!isTechniquePageVisible) {
    notFound();
  }

  return getPageMetadata(locale, 'techniqueRecords');
}

export default async function TechniqueRecordPage({params}: Props) {
  if (!isTechniquePageVisible) {
    notFound();
  }

  const {locale} = await params;
  setRequestLocale(locale);
  const content = (await getLocaleMessages(locale)).specialtyPages.techniqueRecords;

  return (
    <main className="mobile-page-shell relative isolate overflow-hidden bg-white text-text">
      <RingDrawingBackground />

      <section className="relative z-10 pt-28">
        <div className="mx-auto max-w-[1220px] px-container pb-0 pt-[clamp(64px,8vw,116px)]">
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

      <TechniqueIntroSection
        title={content.intro.title}
        body={content.intro.body}
      />

      <TechniqueCarouselSection
        items={content.records.items}
        carouselLabel={locale === 'ko' ? '테크닉 캐러셀' : 'Technique carousel'}
        previousLabel={locale === 'ko' ? '이전 기술' : 'Previous technique'}
        nextLabel={locale === 'ko' ? '다음 기술' : 'Next technique'}
        goToSlideLabel={locale === 'ko' ? '기술 항목으로 이동' : 'Go to technique slide'}
      />
    </main>
  );
}
