import Image from 'next/image';
import Link from 'next/link';

import {HomeStatBand, type HomeStatBandItem} from '@/components/home/home-stat-band';
import {Reveal, RevealItem} from '@/components/motion/reveal';
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
};

type AchievementRecordsPageProps = {
  locale: Locale;
  content: AchievementContent;
};

type FirstRecord = {
  title: string;
  body: string;
  image: string;
};

type MarketFeature = {
  value: string;
  title: string;
  accent: string;
  paragraphs: string[];
  image: string;
};

const pageCopy = {
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
    marketLabel: 'MARKET LEADERSHIP',
    marketTitle: '압도적인 시장 점유율',
    marketIntro:
      '대호의 시장 점유율은 단순한 숫자가 아니라, 오랜 시간 축적된 신뢰의 결과입니다. 우승반지와 임관반지처럼 중요한 순간을 기념하는 제품은 디자인 완성도, 제작 안정성, 납기 관리, 품질 검수까지 모든 기준이 충족되어야 선택받을 수 있습니다.\n대호는 수많은 팀과 기관의 프로젝트를 안정적으로 수행하며, 국내 기념 주얼리 시장에서 가장 신뢰받는 제작 기준을 만들어가고 있습니다.',
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
        body: '국내 우승반지 시장에서\n가장 많이 선택받은 제작 경험'
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
        label: 'END-TO\n-END',
        body: '처음부터 끝까지\n전 공정 책임제'
      }
    ],
    firstRecords: [
      {
        title: 'FIRST INITIAL ENGRAVING',
        body: '국내 최초 이니셜 조각 적용',
        image: 'legacy_achievement_01.png'
      },
      {
        title: 'FIRST ANTIQUE COATING',
        body: '국내 최초 엔티크 블랙 코팅 적용',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: '국내 최초 반지 내부 디자인 적용',
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
        accent: '국내 임관반지 분야에서 축적한 전문 제작 기록',
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
      'DEAHO achievements are not simple production quantities.',
      'They are records of leadership in championship and commission rings,',
      'first domestic applications, and repeated projects that shaped',
      'the standard for commemorative ring production.'
    ],
    imagePlaceholder: 'Image area',
    quoteTitle: 'Records that Became Standards',
    quoteBody: 'The records DEAHO built became industry standards.',
    firstTitle: 'FIRST RECORDS',
    marketLabel: 'MARKET LEADERSHIP',
    marketTitle: 'Dominant market share',
    marketIntro:
      'DEAHO market share is not only a number. It is the result of trust built over time. Products that commemorate important moments, such as championship rings and commission rings, are chosen only when design completion, production stability, delivery control, and inspection standards are all met.\nBy completing projects for many teams and institutions, DEAHO continues to build one of the most trusted production standards in Korea.',
    archiveLabel: 'PROJECT ARCHIVE',
    archiveTitle: 'Projects across many fields',
    discoverLead: 'Discover more DEAHO projects',
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
        label: 'END-TO\n-END',
        body: 'Full-process responsibility\nfrom start to finish'
      }
    ],
    firstRecords: [
      {
        title: 'FIRST INITIAL ENGRAVING',
        body: 'First domestic application of initial engraving',
        image: 'legacy_achievement_01.png'
      },
      {
        title: 'FIRST ANTIQUE COATING',
        body: 'First domestic application of antique black coating',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: 'First domestic approach to interior ring design',
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
          'Based on professional sports championship ring experience, DEAHO has completed the history and meaning of victory as one ring.'
        ],
        image: 'legacy_achievement_02.png'
      },
      {
        value: '90%',
        title: 'COMMISSIONING\nRING SHARE',
        accent: 'Specialized production records built in Korea commission ring field',
        paragraphs: [
          'A commission ring symbolizes both a personal beginning and an organization identity.',
          'Through long-term commission ring production, DEAHO has accumulated accurate group order management, stable quality, and detailed engraving standards.'
        ],
        image: 'legacy_achievement_03.png'
      }
    ]
  }
} satisfies Record<Locale, {
  heroLabel: string;
  heroTitle: string;
  introLines: string[];
  imagePlaceholder: string;
  quoteTitle: string;
  quoteBody: string;
  firstTitle: string;
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
}>;

export function AchievementRecordsPage({locale, content}: AchievementRecordsPageProps) {
  const copy = pageCopy[locale];
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;
  const archiveImages = [
    ...(content.gallery?.items.map((item) => item.image) ?? []),
    'news_card_01.png',
    'home_ring_01.png',
    'collection_ring_03.png'
  ].slice(0, 7);

  return (
    <main className="bg-white text-primary">
      <section className="grid min-h-[100svh] place-items-center bg-white py-24">
        <div className="mx-auto max-w-3xl px-container text-center">
          <Reveal className="space-y-5 text-[#252525]">
            <p className={`${englishTextClass} text-[15px] uppercase leading-none text-accent`}>
              {copy.heroLabel}
            </p>
            <h1 className={`${englishTextClass} text-[clamp(30px,3.4vw,44px)] uppercase leading-none text-primary`}>
              {copy.heroTitle}
            </h1>
            <div className="mx-auto max-w-[520px] space-y-1.5">
              {copy.introLines.map((line) => (
                <p key={line} className={`${bodyTextClass} text-[15px] leading-[1.65] text-[#252525]`}>
                  {line}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white pb-4">
        <div className="px-container">
          <p className={`${bodyTextClass} text-[15px] leading-none text-[#252525]`}>
            {copy.imagePlaceholder}
          </p>
        </div>
      </section>

      <section className="bg-[#62302F] py-[clamp(92px,10vw,150px)] text-[#F4E6E1]">
        <HomeStatBand items={copy.statBand} locale={locale} />
      </section>

      <section className="bg-[#f4efe6] py-[clamp(100px,12vw,174px)]">
        <Reveal className="mx-auto max-w-4xl px-container text-center text-primary">
          <p className={`${englishTextClass} text-[clamp(58px,7vw,92px)] leading-none text-black`}>“</p>
          <p className={`${englishTextClass} mt-7 text-[clamp(24px,2.4vw,34px)] italic leading-tight text-primary`}>
            {copy.quoteTitle}
          </p>
          <p className={`${bodyTextClass} mt-4 text-[clamp(24px,2.8vw,40px)] leading-tight text-primary`}>
            {copy.quoteBody}
          </p>
          <p className={`${englishTextClass} mt-7 text-[clamp(58px,7vw,92px)] leading-none text-black`}>”</p>
        </Reveal>
      </section>

      <section className="bg-white px-container py-[clamp(96px,11vw,160px)]">
        <div className="mx-auto max-w-[1120px]">
          <Reveal className="text-center">
            <h2 className={`${englishTextClass} text-[clamp(28px,3vw,42px)] uppercase leading-none text-primary`}>
              {copy.firstTitle}
            </h2>
          </Reveal>
          <Reveal className="mt-16 grid gap-12 text-center md:grid-cols-3">
            {copy.firstRecords.map((record) => (
              <RevealItem key={record.title}>
                <article>
                  <div className="relative mx-auto aspect-square w-[min(58vw,250px)] overflow-hidden bg-[#d8d8d8]">
                    <Image
                      src={`/images/${record.image}`}
                      alt={record.title}
                      fill
                      sizes="(min-width: 768px) 250px, 58vw"
                      className="object-cover opacity-0"
                    />
                  </div>
                  <h3 className={`${englishTextClass} mt-8 whitespace-pre-line text-[13px] uppercase leading-[1.18] text-primary`}>
                    {record.title}
                  </h3>
                  <p className={`${bodyTextClass} mt-2 text-[13px] leading-tight text-primary`}>
                    {record.body}
                  </p>
                </article>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#f4efe6] px-container py-[clamp(118px,13vw,190px)]">
        <div className="mx-auto max-w-[1120px]">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className={`${englishTextClass} text-[12px] uppercase leading-none text-accent`}>
              {copy.marketLabel}
            </p>
            <h2 className={`${bodyTextClass} mt-3 text-[clamp(27px,3vw,42px)] leading-tight text-primary`}>
              {copy.marketTitle}
            </h2>
            <p className={`${bodyTextClass} mt-8 whitespace-pre-line text-[15px] leading-[1.85] text-[#252525]`}>
              {copy.marketIntro}
            </p>
          </Reveal>

          <div className="mt-[clamp(88px,11vw,150px)] space-y-[clamp(90px,12vw,160px)]">
            {copy.marketFeatures.map((item, index) => (
              <Reveal
                key={item.value}
                className={`grid gap-10 md:grid-cols-[1fr_0.48fr] md:items-center md:gap-16 lg:gap-24 ${
                  index % 2 === 1 ? 'md:grid-cols-[0.48fr_1fr]' : ''
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

      <section className="overflow-hidden bg-white py-[clamp(92px,10vw,150px)]">
        <Reveal className="px-container text-center">
          <p className={`${englishTextClass} text-[12px] uppercase leading-none text-accent`}>
            {copy.archiveLabel}
          </p>
          <h2 className={`${bodyTextClass} mt-3 text-[clamp(27px,3vw,42px)] leading-tight text-primary`}>
            {copy.archiveTitle}
          </h2>
        </Reveal>

        <Reveal className="mt-16 flex gap-6 overflow-x-auto px-container pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {archiveImages.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="relative aspect-[3/4] w-[min(46vw,300px)] shrink-0 overflow-hidden bg-[#d8d8d8]"
            >
              <Image
                src={`/images/${image}`}
                alt={`${copy.archiveTitle} ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 300px, 46vw"
                className="object-cover"
              />
            </div>
          ))}
        </Reveal>
      </section>

      <section className="bg-white pb-24 pt-[clamp(44px,6vw,86px)] md:pb-28">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <p className={`${bodyTextClass} text-[clamp(26px,2.5vw,38px)] leading-tight text-primary`}>
            {copy.discoverLead}
          </p>
          <Link
            href={withLocale(locale, '/mastery/creations')}
            className={`${englishTextClass} link-sweep mt-7 inline-flex text-[14px] uppercase leading-[19px] tracking-[0.2em] text-accent`}
          >
            {copy.cta}
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

function MarketImage({image, alt}: {image: string; alt: string}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
      <Image
        src={`/images/${image}`}
        alt={alt}
        fill
        sizes="(min-width: 768px) 650px, 100vw"
        className="object-cover opacity-0"
      />
    </div>
  );
}

function MarketText({item, locale}: {item: MarketFeature; locale: Locale}) {
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;

  return (
    <div className="text-primary">
      <p className={`${englishTextClass} text-[clamp(34px,4vw,56px)] leading-none text-primary`}>
        {item.value}
      </p>
      <h3 className={`${englishTextClass} mt-3 whitespace-pre-line text-[20px] uppercase leading-[1.05] text-primary`}>
        {item.title}
      </h3>
      <p className={`${bodyTextClass} mt-6 whitespace-pre-line text-[14px] leading-[1.5] text-accent`}>
        {item.accent}
      </p>
      <div className="mt-7 space-y-4">
        {item.paragraphs.map((paragraph) => (
          <p key={paragraph} className={`${bodyTextClass} text-[13px] leading-[1.78] text-[#252525]`}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
