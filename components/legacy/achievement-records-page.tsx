import Image from 'next/image';
import Link from 'next/link';

import {DraggableScroll} from '@/components/draggable-scroll';
import type {HomeStatBandItem} from '@/components/home/home-stat-band';
import {AchievementPentagonStats} from '@/components/legacy/achievement-pentagon-stats';
import {HeritageHero} from '@/components/legacy/heritage-hero';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
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

type FirstRecord = {
  title: string;
  body: string;
  hoverText: string;
  image: string;
};

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
        title: 'FIRST INITIAL ENGRAVING',
        body: '국내 최초 이니셜 조각 적용',
        hoverText: '국내 기념반지 제작에서 개인 이니셜 조각을 적용한 첫 기록입니다.',
        image: 'legacy_achievement_01.png'
      },
      {
        title: 'FIRST ANTIQUE COATING',
        body: '국내 최초 엔티크 블랙 코팅 적용',
        hoverText: '금속의 입체감과 문양의 깊이를 살리는 엔티크 블랙 코팅을 국내 최초로 적용했습니다.',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: '국내 최초 반지 내부 디자인 적용',
        hoverText: '반지 외부뿐 아니라 내부까지 의미를 담는 디자인 접근을 국내 최초로 시도했습니다.',
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
        title: 'FIRST INITIAL ENGRAVING',
        body: 'First domestic application of initial engraving',
        hoverText: 'DAEHO introduced individual initial engraving as a first in Korea commemorative ring production.',
        image: 'legacy_achievement_01.png'
      },
      {
        title: 'FIRST ANTIQUE COATING',
        body: 'First domestic application of antique black coating',
        hoverText: 'DAEHO first applied antique black coating domestically to emphasize dimensional detail and pattern depth.',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: 'First domestic approach to interior ring design',
        hoverText: 'DAEHO first expanded ring design inward, giving the interior surface its own meaning and story.',
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
  const firstRecords = normalizeFirstRecords(copy.firstRecords);
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

function normalizeFirstRecords(records: FirstRecordInput[] | undefined): FirstRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((record) => ({
      title: record.title ?? '',
      body: record.body ?? '',
      hoverText: record.hoverText ?? record.body ?? '',
      image: record.image ?? ''
    }))
    .filter((record) => record.title && record.image);
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

  return (
    <main className="bg-white text-primary">
      <HeritageHero
        imagePlaceholder={copy.imagePlaceholder}
        label={copy.heroLabel}
        lines={copy.introLines}
        locale={locale}
        title={copy.heroTitle}
      />

      <div className="relative z-10 bg-white">
        <section className="bg-[#62302F] py-[clamp(84px,9vw,132px)] text-[#F4E6E1]">
          <AchievementPentagonStats items={copy.statBand} locale={locale} />
        </section>

        <section className="bg-[#f4efe6] py-[clamp(108px,12vw,176px)]">
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

        <section className="overflow-hidden bg-bg py-[clamp(104px,11vw,164px)]">
          <Reveal className="px-container text-center">
            <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
              {copy.firstTitle}
            </p>
            <h2 className={`${bodyTextClass} mt-[14px] text-[clamp(28px,2.8vw,40px)] leading-[1.25] text-primary`}>
              {copy.firstHeading}
            </h2>
          </Reveal>

          <Reveal className="mt-[clamp(30px,4vw,46px)]">
            <DraggableScroll
              ariaLabel={copy.firstHeading}
              className="mx-auto flex w-full gap-6 overflow-x-auto px-container pb-4 text-center [scrollbar-width:none] [touch-action:pan-x] lg:max-w-[1110px] lg:justify-center lg:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {copy.firstRecords.map((record) => (
                <article
                  key={record.title}
                  tabIndex={0}
                  aria-label={`${record.title}: ${record.hoverText}`}
                  className="achievement-record-card group flex w-[min(72vw,330px)] shrink-0 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  <div className="mb-6 flex min-h-[64px] flex-col justify-end text-center">
                    <p className={`${bodyTextClass} text-[15px] leading-tight text-primary`}>
                      {record.body}
                    </p>
                    <h3 className={`${englishTextClass} mt-2 whitespace-pre-line text-[15px] uppercase leading-[1.18] tracking-[0.04em] text-primary`}>
                      {record.title}
                    </h3>
                  </div>
                  <div className="achievement-record-card__stage relative aspect-[3/4] [perspective:1200px]">
                    <div className="achievement-record-card__inner relative h-full w-full transition-transform duration-700 ease-[var(--ease-expo)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus:[transform:rotateY(180deg)] motion-reduce:transition-none">
                      <div className="achievement-record-card__front absolute inset-0 overflow-hidden bg-[#d8d8d8] [backface-visibility:hidden]">
                        <Image
                          src={`/images/${record.image}`}
                          alt={record.title}
                          fill
                          sizes="(min-width: 1024px) 330px, 72vw"
                          className="pointer-events-none object-cover"
                        />
                      </div>
                      <div className="achievement-record-card__back absolute inset-0 flex flex-col justify-between overflow-hidden bg-[#62302F] px-7 py-8 text-[#F4E6E1] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <p className={`${englishTextClass} text-[13px] uppercase leading-none tracking-[0.12em] text-[#D7A6A0]`}>
                          {copy.firstTitle}
                        </p>
                        <div className="grid gap-4 text-center">
                          <h3 className={`${englishTextClass} whitespace-pre-line text-[clamp(22px,2.1vw,31px)] uppercase leading-[1.04] tracking-[0.04em] text-white`}>
                            {record.title}
                          </h3>
                          <p className={`${bodyTextClass} text-[clamp(15px,1.15vw,17px)] leading-[1.72] text-[#F4E6E1]`}>
                            {record.hoverText}
                          </p>
                        </div>
                        <span className="mx-auto h-px w-14 bg-[#D7A6A0]/70" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </DraggableScroll>
          </Reveal>
        </section>

        <section className="bg-[#f4efe6] px-container py-[clamp(116px,12vw,182px)]">
          <div className="mx-auto max-w-[980px]">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
                {copy.marketLabel}
              </p>
              <h2 className={`${bodyTextClass} mt-[14px] text-[clamp(29px,2.7vw,40px)] leading-[1.25] text-primary`}>
                {copy.marketTitle}
              </h2>
              <p className={`${bodyTextClass} mt-[26px] whitespace-pre-line text-[15px] leading-[1.82] text-[#252525]`}>
                {copy.marketIntro}
              </p>
            </Reveal>

            <div className="mt-[clamp(86px,10vw,132px)] space-y-[clamp(112px,14vw,180px)]">
              {copy.marketFeatures.map((item, index) => (
                <Reveal
                  key={item.value}
                  className={`grid gap-10 md:items-center md:gap-[clamp(56px,7vw,92px)] ${
                    index % 2 === 1
                      ? 'md:grid-cols-[minmax(248px,0.34fr)_minmax(0,0.66fr)]'
                      : 'md:grid-cols-[minmax(0,0.66fr)_minmax(248px,0.34fr)]'
                  }`}
                >
                  {index % 2 === 1 ? <MarketText item={item} locale={locale} /> : null}
                  <MarketImage image={item.image} alt={item.title} />
                  {index % 2 === 0 ? <MarketText item={item} locale={locale} /> : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-white py-[clamp(100px,10vw,154px)]">
          <Reveal className="px-container text-center">
            <p className={`${englishTextClass} text-[15px] uppercase leading-none tracking-[0.08em] text-accent`}>
              {copy.archiveLabel}
            </p>
            <h2 className={`${bodyTextClass} mt-[14px] text-[clamp(28px,2.8vw,40px)] leading-[1.25] text-primary`}>
              {copy.archiveTitle}
            </h2>
          </Reveal>

          <Reveal className="mx-auto mt-[clamp(32px,4vw,48px)] flex max-w-[1540px] justify-center px-container">
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
              className="flex gap-6 overflow-x-auto px-container pb-4 [scrollbar-width:none] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden"
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
                      src={`/images/${image}`}
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

        <section className="bg-white py-[clamp(104px,11vw,168px)]">
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
      </div>
    </main>
  );
}

function MarketImage({image, alt}: {image: string; alt: string}) {
  return (
    <div className="relative aspect-[1.45/1] w-full overflow-hidden bg-white">
      <Image
        src={`/images/${image}`}
        alt={alt}
        fill
        sizes="(min-width: 768px) 760px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function MarketText({item, locale}: {item: MarketFeature; locale: Locale}) {
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;

  return (
    <div className="mx-auto max-w-[270px] text-primary md:mx-0">
      <p className={`${englishTextClass} text-[clamp(36px,4.2vw,58px)] leading-none text-primary`}>
        {item.value}
      </p>
      <h3 className={`${englishTextClass} mt-3 whitespace-pre-line text-[18px] uppercase leading-[1.08] tracking-[0.04em] text-primary`}>
        {item.title}
      </h3>
      <p className={`${bodyTextClass} mt-6 whitespace-pre-line text-[15px] leading-[1.62] text-accent`}>
        {item.accent}
      </p>
      <div className="mt-6 space-y-[14px]">
        {item.paragraphs.map((paragraph) => (
          <p key={paragraph} className={`${bodyTextClass} text-[15px] leading-[1.82] text-[#252525]`}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
