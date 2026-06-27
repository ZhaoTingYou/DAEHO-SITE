import Link from 'next/link';

import {
  LoyaltyFeatureCarousel,
  type LoyaltyFeatureSlide
} from '@/components/legacy/loyalty-feature-carousel';
import {HeritageHero} from '@/components/legacy/heritage-hero';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {imageExists} from '@/lib/image-exists';
import {withLocale} from '@/lib/site-map';

type LoyaltyContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
  };
  metrics: Array<{
    value: number;
    pad?: number;
    suffix?: string;
    label: string;
  }>;
  statement?: string;
  copy?: Partial<LoyaltyPageCopy>;
};

type LoyaltyCommitmentPageProps = {
  locale: Locale;
  content: LoyaltyContent;
};

type LoyaltyPageCopy = {
  heroLabel: string;
  heroTitle: string;
  introLines: string[];
  imagePlaceholder: string;
  quoteTitle: string;
  quoteBody: string;
  discoverLead: string;
  featureSlides: LoyaltyFeatureSlide[];
  cta: string;
};

const defaultPageCopy = {
  ko: {
    heroLabel: 'LOYALTY',
    heroTitle: 'RELATIONSHIP',
    introLines: [
      '대호가 생각하는 관계는 한 번의 제작으로 끝나지 않습니다.',
      '고객의 목적을 이해하고, 필요한 정보를 정확히 관리하며,',
      '납품 이후에도 다시 문의할 수 있는 제작사로 남는 것이 중요합니다.',
      '반복되는 신뢰는 과정의 안정성에서 만들어집니다.'
    ],
    imagePlaceholder: '여기는 이미지',
    quoteTitle: 'Loyalty, Built Through Time',
    quoteBody: '오래 함께한 시간은 가장 큰 증거입니다',
    discoverLead: '대호의 프로젝트 더 알아보기',
    featureSlides: [
      {
        kicker: '',
        title: '01. Repeat Trust',
        body: '고객이 다시 제작을 맡기는 이유는 단순히 이전 결과물이 만족스러웠기 때문만은 아닙니다. 처음 상담부터 디자인 제안, 수정, 제작, 검수, 납품까지 전 과정이 안정적으로 진행되었는지가 중요합니다. 대호는 고객이 다시 같은 프로젝트를 맡겼을 때, 이전의 기준과 정보를 바탕으로 더 효율적이고 정확하게 진행할 수 있도록 관리합니다.\n\n우승반지, 임관반지, 단체 기념반지는 같은 고객이 시즌, 기수, 연도에 따라 반복 제작을 요청하는 경우가 많습니다. 이때 중요한 것은 이전 제품의 구조와 기준을 이해하고, 새로운 프로젝트에 맞게 필요한 부분만 정확히 조정하는 능력입니다. 대호는 반복 제작 경험을 통해 고객이 다시 맡길 수 있는 제작 환경을 만들어왔습니다.',
        backgroundImage: 'legacy_loyalty_hero.png',
        previewImage: 'legacy_card_loyalty.png',
        accentStart: 'rgba(180,66,54,0.95)',
        accentEnd: 'rgba(40,72,50,0.88)'
      },
      {
        kicker: 'LOYALTY STANDARD',
        title: '02. Shared Memory',
        body: '한 번 제작된 상징은 팀과 개인의 기억 안에서 계속 사용됩니다. 대호는 이전 프로젝트의 의도와 사양을 기준으로 남겨, 다음 의뢰에서도 같은 이야기가 흔들리지 않고 이어질 수 있도록 돕습니다.',
        backgroundImage: 'home_stats_bg.png',
        previewImage: 'home_pillar_legacy.png',
        accentStart: 'rgba(111,103,160,0.88)',
        accentEnd: 'rgba(159,114,78,0.82)'
      },
      {
        kicker: 'LOYALTY STANDARD',
        title: '03. Documented Care',
        body: '제작 이후의 문의와 추가 요청도 관계의 일부입니다. 확인 사항을 기록하고 필요한 이미지를 정리해 두면, 다음 시즌의 제작이나 보완 요청까지 더 빠르고 정확하게 연결됩니다.',
        backgroundImage: 'chronicle_detail_01.png',
        previewImage: 'chronicle_detail_01.png',
        accentStart: 'rgba(54,80,110,0.9)',
        accentEnd: 'rgba(47,83,64,0.86)'
      }
    ],
    cta: 'DISCOVER MORE'
  },
  en: {
    heroLabel: 'LOYALTY',
    heroTitle: 'RELATIONSHIP',
    introLines: [
      'For DEAHO, loyalty does not end with a single commission.',
      'It begins by understanding the client, preserving the right information,',
      'and keeping a production flow that makes every return easier.',
      'Repeat trust is built through a process that stays stable over time.'
    ],
    imagePlaceholder: 'Image area',
    quoteTitle: 'Loyalty, Built Through Time',
    quoteBody: 'Time spent together is the clearest proof.',
    discoverLead: 'Discover more DEAHO projects',
    featureSlides: [
      {
        kicker: 'LOYALTY STANDARD',
        title: '01. Repeat Trust',
        body: 'Clients return not only because the previous result was satisfying, but because the full process remains clear: consultation, design direction, revisions, production, inspection, and delivery. DEAHO keeps the standards and context from each project so the next commission can begin with confidence and move with greater precision.',
        backgroundImage: 'legacy_loyalty_hero.png',
        previewImage: 'legacy_card_loyalty.png',
        accentStart: 'rgba(180,66,54,0.95)',
        accentEnd: 'rgba(40,72,50,0.88)'
      },
      {
        kicker: 'LOYALTY STANDARD',
        title: '02. Shared Memory',
        body: 'A symbol made once continues to live in the memory of a team or an individual. DEAHO preserves the intention and specifications of previous projects so the next request can continue the same story with consistency.',
        backgroundImage: 'home_stats_bg.png',
        previewImage: 'home_pillar_legacy.png',
        accentStart: 'rgba(111,103,160,0.88)',
        accentEnd: 'rgba(159,114,78,0.82)'
      },
      {
        kicker: 'LOYALTY STANDARD',
        title: '03. Documented Care',
        body: 'Questions after delivery and follow-up requests are part of the relationship. When checks and images are kept as a clear record, the next season or refinement request can move faster and more accurately.',
        backgroundImage: 'chronicle_detail_01.png',
        previewImage: 'chronicle_detail_01.png',
        accentStart: 'rgba(54,80,110,0.9)',
        accentEnd: 'rgba(47,83,64,0.86)'
      }
    ],
    cta: 'DISCOVER MORE'
  }
} satisfies Record<Locale, LoyaltyPageCopy>;

function resolveLoyaltyCopy(locale: Locale, content: LoyaltyContent): LoyaltyPageCopy {
  const fallback = defaultPageCopy[locale];
  const copy = content.copy ?? {};

  return {
    ...fallback,
    ...copy,
    introLines: copy.introLines?.length ? copy.introLines : fallback.introLines,
    featureSlides: normalizeLoyaltySlides(copy.featureSlides?.length ? copy.featureSlides : fallback.featureSlides)
  };
}

function normalizeLoyaltySlides(slides: LoyaltyFeatureSlide[]): LoyaltyFeatureSlide[] {
  const fallbackImage = 'legacy_loyalty_hero.png';

  return slides.map((slide) => {
    const backgroundImage = imageExists(slide.backgroundImage) ? slide.backgroundImage : fallbackImage;
    const previewImage = imageExists(slide.previewImage) ? slide.previewImage : backgroundImage;

    return {
      ...slide,
      backgroundImage,
      previewImage
    };
  });
}

export function LoyaltyCommitmentPage({locale, content}: LoyaltyCommitmentPageProps) {
  const copy = resolveLoyaltyCopy(locale, content);
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;

  return (
    <main className="bg-white text-primary">
      <HeritageHero
        imagePlaceholder={copy.imagePlaceholder}
        label={copy.heroLabel}
        lines={copy.introLines}
        locale={locale}
        title={copy.heroTitle}
      />

      <section className="relative z-10 bg-[#f4f1ee] py-[clamp(108px,12vw,176px)]">
        <Reveal className="mx-auto max-w-[760px] px-container text-center text-primary">
          <div className="mx-auto mb-[clamp(34px,4vw,52px)] h-px w-16 bg-primary/35" aria-hidden="true" />
          <p className={`${englishTextClass} text-[clamp(23px,2vw,30px)] italic leading-tight tracking-normal text-primary`}>
            {copy.quoteTitle}
          </p>
          <p className={`${bodyTextClass} mt-[14px] text-[clamp(25px,2.6vw,38px)] leading-[1.28] text-primary`}>
            {copy.quoteBody}
          </p>
          <div className="mx-auto mt-[clamp(34px,4vw,52px)] h-px w-16 bg-primary/35" aria-hidden="true" />
        </Reveal>
      </section>

      <section className="relative z-10 bg-white px-[clamp(20px,2.4vw,36px)] pb-[clamp(30px,5vw,56px)] pt-0">
        <LoyaltyFeatureCarousel slides={copy.featureSlides} imageAlt={content.hero.subtitle} locale={locale} />
      </section>

      <section className="relative z-10 bg-white py-[clamp(104px,11vw,168px)]">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <p className="[font-family:'MaruBuri',serif] text-[clamp(28px,2.7vw,34px)] font-semibold leading-[1.25] text-primary">
            {copy.discoverLead}
          </p>
          <Link
            href={withLocale(locale, '/mastery/creations')}
            className={`${englishTextClass} link-sweep mt-[10px] inline-flex text-[15px] uppercase leading-[19px] tracking-[0.2em] text-accent`}
          >
            {copy.cta}
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
