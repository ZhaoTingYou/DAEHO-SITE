import Image from 'next/image';
import Link from 'next/link';

import {DraggableScroll} from '@/components/draggable-scroll';
import type {HomeStatBandItem} from '@/components/home/home-stat-band';
import {AchievementRecordGallery, type AchievementFirstRecord} from '@/components/legacy/achievement-record-card';
import {AchievementPentagonStats} from '@/components/legacy/achievement-pentagon-stats';
import {resolveHeritageHeroImage, resolveHeritageHeroPlaceholder} from '@/components/legacy/heritage-hero-image';
import {HeritageHero} from '@/components/legacy/heritage-hero';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';
import {withLocale} from '@/lib/site-map';

type AchievementContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
  };
  gallery?: {
    items: Array<{
      title: string;
      image: string;
    }>;
  };
  copy?: Partial<Omit<AchievementPageCopy, 'firstRecords' | 'marketFeatures'>> & {
    firstRecords?: FirstRecordInput[];
    marketFeatures?: MarketFeatureInput[];
  };
};

type AchievementRecordsPageProps = {
  locale: Locale;
  content: AchievementContent;
};

type FirstRecord = AchievementFirstRecord;

type FirstRecordInput = Partial<FirstRecord>;

type MarketFeature = {
  value: string;
  title: string;
  accent: string;
  paragraphs: string[];
  image: string;
};

type MarketFeatureInput = Partial<Omit<MarketFeature, 'paragraphs'>> & {
  paragraphs?: string[] | string;
};

type AchievementPageCopy = {
  heroLabel: string;
  heroTitle: string;
  introLines: string[];
  imagePlaceholder: string;
  quoteTitle: string;
  quoteBody: string;
  firstTitle: string;
  firstHeading: string;
  marketLabel: string;
  marketTitle: string;
  marketIntro: string;
  archiveLabel: string;
  archiveTitle: string;
  discoverLead: string;
  cta: string;
  statBand: HomeStatBandItem[];
  firstRecords: FirstRecord[];
  marketFeatures: MarketFeature[];
};

const defaultPageCopy = {
  ko: {
    heroLabel: 'ACHIEVEMENTS',
    heroTitle: 'RESULT',
    introLines: [
      '대호의 성과는 단순한 제작 수량이 아닙니다.',
      '우승반지와 임관반지 시장에서 쌓아온 대표성,',
      '국내 최초 기술 적용, 그리고 수많은 프로젝트를 통해',
      '기념반지 제작의 기준을 만들어왔습니다.'
    ],
    imagePlaceholder: '여기는 이미지',
    quoteTitle: 'Records that Became Standards',
    quoteBody: '대호가 만든 기록은 업계의 기준이 되었습니다',
    firstTitle: 'FIRST RECORDS',
    firstHeading: '국내 최초 기록',
    marketLabel: 'MARKET LEADERSHIP',
    marketTitle: '압도적인 시장 점유율',
    marketIntro:
      '대호의 시장 점유율은 단순한 숫자가 아니라, 오랜 시간 축적된 신뢰의 결과입니다.\n우승반지와 임관반지처럼 중요한 순간을 기념하는 제품은 디자인 완성도, 제작 안정성,\n납기 관리, 품질 검수까지 모든 기준이 충족되어야 선택받을 수 있습니다.\n대호는 수많은 팀과 기관의 프로젝트를 안정적으로 수행하며,\n국내 기념 주얼리 시장에서 가장 신뢰받는 제작 기준을 만들어가고 있습니다.',
    archiveLabel: 'PROJECT ARCHIVE',
    archiveTitle: '다양한 분야의 프로젝트',
    discoverLead: '대호의 프로젝트 더 알아보기',
    cta: 'DISCOVER MORE',
    statBand: [
      {
        value: '38',
        label: 'YEARS',
        body: '역사가 유구한\n장인기업'
      },
      {
        value: '95%',
        label: 'CHAMPIONSHIP\nRING SHARE',
        body: '국내 우승반지 시장에서\n가장 많이 선택받은\n제작 경험'
      },
      {
        value: '90%',
        label: 'COMMISSION\nRING SHARE',
        body: '국내 임관반지 분야에서\n축적한 전문 제작 기록'
      },
      {
        value: '0%',
        label: 'DELIVERY\nFAILURE',
        body: '한번의 납품사고도 없는\n전무후무한 기록'
      },
      {
        value: '100%',
        label: 'END-TO-END',
        body: '처음부터 끝까지\n전 공정 책임제'
      }
    ],
    firstRecords: [
      {
        image: 'legacy_achievement_01.png'
      },
      {
        image: 'legacy_achievement_02.png'
      },
      {
        image: 'legacy_achievement_03.png'
      }
    ],
    marketFeatures: [
      {
        value: '95%',
        title: 'CHAMPIONSHIP\nRING SHARE',
        accent: '국내 우승반지 시장에서\n가장 많이 선택된 제작 경험',
        paragraphs: [
          '우승의 순간은 단 한 번뿐이기에, 결과물은 완성도와 상징성을 모두 갖춰야 합니다.',
          '대호는 프로스포츠 우승반지 제작 경험을 바탕으로 팀의 역사와 승리의 의미를 하나의 반지로 완성해왔습니다.'
        ],
        image: 'legacy_achievement_02.png'
      },
      {
        value: '90%',
        title: 'COMMISSIONING\nRING SHARE',
        accent: '국내 임관반지 분야에서\n축적한 전문 제작 기록',
        paragraphs: [
          '임관반지는 개인의 출발이자 조직의 정체성을 함께 담는 상징물입니다.',
          '대호는 오랜 기간 임관반지를 제작하며 정확한 단체 주문 관리, 안정적인 품질, 세밀한 각인 기준을 축적해왔습니다.'
        ],
        image: 'legacy_achievement_03.png'
      }
    ]
  },
  en: {
    heroLabel: 'ACHIEVEMENTS',
    heroTitle: 'RESULT',
    introLines: [
      'DAEHO achievements are not simple production quantities.',
      'They are records of leadership in championship and commission rings,',
      'first domestic applications, and repeated projects that shaped',
      'the standard for commemorative ring production.'
    ],
    imagePlaceholder: 'Image area',
    quoteTitle: 'Records that Became Standards',
    quoteBody: 'The records DAEHO built became industry standards.',
    firstTitle: 'FIRST RECORDS',
    firstHeading: 'First records by DAEHO',
    marketLabel: 'MARKET LEADERSHIP',
    marketTitle: 'Dominant market share',
    marketIntro:
      'DAEHO market share is not only a number. It is the result of trust built over time. Products that commemorate important moments, such as championship rings and commission rings, are chosen only when design completion, production stability, delivery control, and inspection standards are all met.\nBy completing projects for many teams and institutions, DAEHO continues to build one of the most trusted production standards in Korea.',
    archiveLabel: 'PROJECT ARCHIVE',
    archiveTitle: 'Projects across many fields',
    discoverLead: 'Discover more DAEHO projects',
    cta: 'DISCOVER MORE',
    statBand: [
      {
        value: '38',
        label: 'YEARS',
        body: 'A heritage company\nwith enduring craft'
      },
      {
        value: '95%',
        label: 'CHAMPIONSHIP\nRING SHARE',
        body: 'The most selected maker\nin Korea championship ring production'
      },
      {
        value: '90%',
        label: 'COMMISSION\nRING SHARE',
        body: 'Specialized records built\nin Korea commission ring field'
      },
      {
        value: '0%',
        label: 'DELIVERY\nFAILURE',
        body: 'An unmatched record\nwith no delivery failures'
      },
      {
        value: '100%',
        label: 'END-TO-END',
        body: 'Full-process responsibility\nfrom start to finish'
      }
    ],
    firstRecords: [
      {
        image: 'legacy_achievement_01.png'
      },
      {
        image: 'legacy_achievement_02.png'
      },
      {
        image: 'legacy_achievement_03.png'
      }
    ],
    marketFeatures: [
      {
        value: '95%',
        title: 'CHAMPIONSHIP\nRING SHARE',
        accent: 'The most selected production record in Korea championship ring market',
        paragraphs: [
          'A championship moment happens only once, so the final object must hold both completion and symbolism.',
          'Based on professional sports championship ring experience, DAEHO has completed the history and meaning of victory as one ring.'
        ],
        image: 'legacy_achievement_02.png'
      },
      {
        value: '90%',
        title: 'COMMISSIONING\nRING SHARE',
        accent: 'Specialized production records built in Korea commission ring field',
        paragraphs: [
          'A commission ring symbolizes both a personal beginning and an organization identity.',
          'Through long-term commission ring production, DAEHO has accumulated accurate group order management, stable quality, and detailed engraving standards.'
        ],
        image: 'legacy_achievement_03.png'
      }
    ]
  }
} satisfies Record<Locale, AchievementPageCopy>;

function resolveAchievementCopy(locale: Locale, content: AchievementContent): AchievementPageCopy {
  const fallback = defaultPageCopy[locale];
  const copy = content.copy ?? {};
  const firstRecords = normalizeFirstRecords(copy.firstRecords, fallback.firstRecords);
  const marketFeatures = normalizeMarketFeatures(copy.marketFeatures);

  return {
    ...fallback,
    ...copy,
    introLines: copy.introLines?.length ? copy.introLines : fallback.introLines,
    statBand: copy.statBand?.length ? copy.statBand : fallback.statBand,
    firstRecords: firstRecords.length > 0 ? firstRecords : fallback.firstRecords,
    marketFeatures: marketFeatures.length > 0 ? marketFeatures : fallback.marketFeatures
  };
}

function normalizeFirstRecords(records: FirstRecordInput[] | undefined, fallbackRecords: FirstRecord[] = []): FirstRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((record, index) => ({
      image: record.image || fallbackRecords[index]?.image || ''
    }))
    .filter((record) => record.image);
}

function normalizeMarketFeatures(features: MarketFeatureInput[] | undefined): MarketFeature[] {
  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map((feature) => ({
      value: feature.value ?? '',
      title: feature.title ?? '',
      accent: feature.accent ?? '',
      paragraphs: normalizeParagraphs(feature.paragraphs),
      image: feature.image ?? ''
    }))
    .filter((feature) => feature.title && feature.image);
}

function normalizeParagraphs(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((paragraph): paragraph is string => typeof paragraph === 'string' && paragraph.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  return [];
}

export function AchievementRecordsPage({locale, content}: AchievementRecordsPageProps) {
  const copy = resolveAchievementCopy(locale, content);
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;
  const archiveImages = (content.gallery?.items.map((item) => item.image).filter(Boolean) ?? []).slice(0, 7);
  const loopedArchiveImages = archiveImages.length > 1
    ? [...archiveImages, ...archiveImages]
    : archiveImages;
  const heroImage = resolveHeritageHeroImage(content.hero.image, copy.imagePlaceholder);

  return (
    <main className="mobile-page-shell bg-white text-primary">
      <HeritageHero
        image={heroImage}
        imageAlt={content.hero.subtitle || copy.heroTitle}
        imagePlaceholder={resolveHeritageHeroPlaceholder(copy.imagePlaceholder)}
        label={copy.heroLabel}
        lines={copy.introLines}
        title={copy.heroTitle}
      />

      <div className="relative z-10 bg-white">
        <section className="mobile-section bg-[#62302F] text-[#F4E6E1] md:py-[clamp(84px,9vw,132px)]">
          <AchievementPentagonStats items={copy.statBand} locale={locale} />
        </section>

        <section className="mobile-section bg-[#f4efe6] md:py-[clamp(108px,12vw,176px)]">
          <Reveal className="mx-auto max-w-[760px] text-center text-primary md:px-container">
            <div className="mx-auto mb-[clamp(34px,4vw,52px)] h-px w-16 bg-primary/35" aria-hidden="true" />
            <p className={`${englishTextClass} text-[clamp(23px,2vw,30px)] italic leading-tight tracking-normal text-primary`}>
              {copy.quoteTitle}
            </p>
            <p className={`${bodyTextClass} mobile-copy mt-[14px] text-primary md:text-[clamp(25px,2.6vw,38px)] md:leading-[1.28]`}>
              {copy.quoteBody}
            </p>
            <div className="mx-auto mt-[clamp(34px,4vw,52px)] h-px w-16 bg-primary/35" aria-hidden="true" />
          </Reveal>
        </section>

        <section className="overflow-hidden bg-bg mobile-section md:py-[clamp(104px,11vw,164px)]">
          <div className="text-center md:px-container">
            <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
              {copy.firstTitle}
            </p>
            <h2 className={`${bodyTextClass} mobile-display mt-[14px] text-primary md:text-[clamp(28px,2.8vw,40px)] md:leading-[1.25]`}>
              {copy.firstHeading}
            </h2>
          </div>

          <div className="mt-[clamp(30px,4vw,46px)]" aria-label={copy.firstHeading}>
            <AchievementRecordGallery
              records={copy.firstRecords}
              imageAltPrefix={copy.firstHeading}
            />
          </div>
        </section>

        <section className="bg-[#f4efe6] mobile-section md:px-container md:py-[clamp(116px,12vw,182px)]">
          <div className="mx-auto max-w-[980px]">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
                {copy.marketLabel}
              </p>
              <h2 className={`${bodyTextClass} mobile-display mt-[14px] text-primary md:text-[clamp(29px,2.7vw,40px)] md:leading-[1.25]`}>
                {copy.marketTitle}
              </h2>
              <p className={`${bodyTextClass} mobile-copy mt-[26px] whitespace-pre-line text-[#252525] md:text-[15px] md:leading-[1.82]`}>
                {copy.marketIntro}
              </p>
            </Reveal>

            <div className="mt-12 space-y-20 md:mt-[clamp(86px,10vw,132px)] md:space-y-[clamp(112px,14vw,180px)]">
              {copy.marketFeatures.map((item, index) => (
                <Reveal
                  key={item.value}
                  className={`grid gap-6 md:items-center md:gap-[clamp(56px,7vw,92px)] ${
                    index % 2 === 1
                      ? 'md:grid-cols-[minmax(248px,0.34fr)_minmax(0,0.66fr)]'
                      : 'md:grid-cols-[minmax(0,0.66fr)_minmax(248px,0.34fr)]'
                  }`}
                >
                  <MarketText item={item} locale={locale} className={`order-1 ${index % 2 === 1 ? 'md:order-none' : 'md:order-2'}`} />
                  <MarketImage image={item.image} alt={item.title} className={`order-2 ${index % 2 === 1 ? 'md:order-none' : 'md:order-1'}`} />
                  <MarketText item={item} locale={locale} className="order-3 md:hidden" bodyOnly />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mobile-section overflow-hidden bg-white md:py-[clamp(100px,10vw,154px)]">
          <Reveal className="text-center md:px-container">
            <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
              {copy.archiveLabel}
            </p>
            <h2 className={`${bodyTextClass} mobile-display mt-[14px] text-primary md:text-[clamp(28px,2.8vw,40px)] md:leading-[1.25]`}>
              {copy.archiveTitle}
            </h2>
          </Reveal>

          <Reveal className="mx-auto mt-[clamp(32px,4vw,48px)] flex max-w-[1540px] justify-center md:px-container">
            <p
              className={`archive-drag-hint ${englishTextClass} text-[13px] uppercase leading-none tracking-[0.22em]`}
              aria-hidden="true"
            >
              <span className="archive-drag-hint__arrow archive-drag-hint__arrow--left">←</span>
              <span>DRAG</span>
              <span className="archive-drag-hint__arrow archive-drag-hint__arrow--right">→</span>
            </p>
          </Reveal>

          <Reveal className="mt-6">
            <DraggableScroll
              ariaLabel={copy.archiveTitle}
              autoScroll
              autoScrollResetRatio={archiveImages.length > 1 ? 0.5 : 1}
              autoScrollSpeed={48}
              className="flex gap-6 overflow-x-auto px-[var(--mobile-page-gutter)] pb-4 [scrollbar-width:none] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden md:px-container"
            >
              {loopedArchiveImages.map((image, index) => {
                const isDuplicate = index >= archiveImages.length;
                const imageIndex = index % archiveImages.length;

                return (
                  <div
                    key={`${image}-${index}`}
                    aria-hidden={isDuplicate ? true : undefined}
                    className="relative aspect-[3/4] w-[min(46vw,300px)] shrink-0 overflow-hidden bg-[#d8d8d8]"
                  >
                    <Image
                      src={imageSrc(image)}
                      alt={isDuplicate ? '' : `${copy.archiveTitle} ${imageIndex + 1}`}
                      fill
                      sizes="(min-width: 1024px) 300px, 46vw"
                      className="pointer-events-none object-cover"
                    />
                  </div>
                );
              })}
            </DraggableScroll>
          </Reveal>
        </section>

        <section className="mobile-section bg-white md:py-[clamp(104px,11vw,168px)]">
          <Reveal className="mx-auto max-w-3xl text-center md:px-container">
            <p className="mobile-copy [font-family:'MaruBuri',serif] font-semibold text-primary md:text-[clamp(28px,2.7vw,34px)] md:leading-[1.25]">
              {copy.discoverLead}
            </p>
            <Link
              href={withLocale(locale, '/mastery/creations')}
              className={`${englishTextClass} link-sweep mobile-tap-target mt-[10px] inline-flex items-center text-[16px] uppercase leading-[19px] tracking-[0.2em] text-accent md:min-h-0 md:min-w-0 md:text-[15px]`}
            >
              {copy.cta}
            </Link>
          </Reveal>
        </section>
      </div>
    </main>
  );
}

function MarketImage({image, alt, className}: {image: string; alt: string; className: string}) {
  return (
    <div className={`${className} mobile-media-landscape relative aspect-[4/3] w-full overflow-hidden bg-white md:aspect-[1.45/1]`}>
      <Image
        src={imageSrc(image)}
        alt={alt}
        fill
        sizes="(min-width: 768px) 760px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function MarketText({item, locale, className, bodyOnly = false}: {item: MarketFeature; locale: Locale; className: string; bodyOnly?: boolean}) {
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;

  return (
    <div className={`${className} mx-auto max-w-[270px] text-primary md:mx-0`}>
      {!bodyOnly ? <>
      <p className={`${englishTextClass} text-[36px] leading-none text-primary md:text-[clamp(36px,4.2vw,58px)]`}>
        {item.value}
      </p>
      <h3 className={`${englishTextClass} mt-3 whitespace-pre-line text-[18px] uppercase leading-[1.08] tracking-[0.04em] text-primary`}>
        {item.title}
      </h3>
      </> : null}
      {!bodyOnly ? (
        <p className={`${bodyTextClass} mobile-copy mt-6 whitespace-pre-line text-accent md:text-[15px] md:leading-[1.62]`}>
          {item.accent}
        </p>
      ) : null}
      <div className={`${bodyOnly ? '' : 'mt-6'} space-y-[14px] ${bodyOnly ? '' : 'hidden md:block'}`}>
        {item.paragraphs.map((paragraph) => (
          <p key={paragraph} className={`${bodyTextClass} mobile-copy text-[#252525] md:text-[15px] md:leading-[1.82]`}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
