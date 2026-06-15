import Image from 'next/image';
import Link from 'next/link';

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

type Metric = {
  value: string;
  label: string;
  body: string;
};

const pageCopy = {
  ko: {
    heroLabel: 'ACHIEVEMENT',
    introTitle: 'Records That Became Standards.',
    introLines: [
      '대호의 성취는 단순한 제작 수량이 아닙니다.',
      '우승반지와 단체반지 시장에서 쌓아온 신뢰,',
      '국내 최초 기술 개발, 그리고 수많은 프로젝트를 통해',
      '기념품의 제작 기준을 만들어왔습니다.'
    ],
    resultTitle: 'RESULT',
    resultBody: '대호가 만든 기록은 현재의 기준이 되었습니다.',
    firstTitle: 'FIRST RECORDS',
    marketTitle: 'MARKET LEADERSHIP',
    archiveTitle: 'PROJECT ARCHIVE',
    cta: 'DISCOVER MORE',
    metrics: [
      {
        value: '38',
        label: 'YEARS',
        body: '역사가 우주를 증명기준'
      },
      {
        value: '95%',
        label: 'CHAMPIONSHIP RING SHARE',
        body: '국내 우승반지 시장에서 가장 많이 선택된 제작 경험'
      },
      {
        value: '80%',
        label: 'COMMISSIONING RING SHARE',
        body: '국내 단체반지 분야에서 축적된 전문 제작 기록'
      },
      {
        value: '0',
        label: 'DELIVERY FAILURE',
        body: '------------'
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
        body: '국내 최초 앤티크 컬러 코팅 적용',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: '국내 최초 팀별 내부 디자인 적용',
        image: 'legacy_achievement_03.png'
      }
    ],
    market: [
      {
        value: '95%',
        title: 'CHAMPIONSHIP RING SHARE',
        body: '국내 우승반지 시장에서 가장 많이 선택된 제작 경험'
      },
      {
        value: '80%',
        title: 'COMMISSIONING RING SHARE',
        body: '국내 단체반지 분야에서 축적된 전문 제작 기록'
      }
    ],
    archive: {
      conversation: {
        eyebrow: 'Interview',
        title: 'In Conversation',
        body: '디자이너와 장인이 같은 목표를 바라보며 프로젝트의 의미와 기준을 정리합니다.',
        note: 'Interview with Studio Field'
      },
      timeline: {
        eyebrow: 'Chronicle',
        title: 'A Timeline of Milestones',
        body: '대호의 중요한 제작 기록은 다음 프로젝트의 기준이 됩니다.',
        items: [
          {year: '2024', text: '새로운 제작 스튜디오 확장'},
          {year: '2023', text: '컬렉션 06 공개'},
          {year: '2022', text: '오픈하우스 매거진 소개'}
        ]
      },
      study: {
        eyebrow: 'Project',
        title: 'A Study in Material',
        body: '보석, 금속, 표면 처리의 차이를 연구하며 완성도 높은 결과를 만듭니다.',
        items: ['Inspiration', 'Process', 'Details', 'Outcome']
      }
    }
  },
  en: {
    heroLabel: 'ACHIEVEMENT',
    introTitle: 'Records That Became Standards.',
    introLines: [
      'DEAHO achievements are not only production numbers.',
      'They are records of trust built in championship and group ring markets,',
      'first technical attempts, and repeated projects that shaped',
      'a working standard for commemorative jewelry.'
    ],
    resultTitle: 'RESULT',
    resultBody: 'The records DEAHO built have become today’s working standards.',
    firstTitle: 'FIRST RECORDS',
    marketTitle: 'MARKET LEADERSHIP',
    archiveTitle: 'PROJECT ARCHIVE',
    cta: 'DISCOVER MORE',
    metrics: [
      {
        value: '38',
        label: 'YEARS',
        body: 'History as a basis for trust'
      },
      {
        value: '95%',
        label: 'CHAMPIONSHIP RING SHARE',
        body: 'A leading choice in Korean championship ring production'
      },
      {
        value: '80%',
        label: 'COMMISSIONING RING SHARE',
        body: 'A deep record in group and commissioning ring production'
      },
      {
        value: '0',
        label: 'DELIVERY FAILURE',
        body: '------------'
      }
    ],
    firstRecords: [
      {
        title: 'FIRST INITIAL ENGRAVING',
        body: 'Early adoption of initial engraving for local projects',
        image: 'legacy_achievement_01.png'
      },
      {
        title: 'FIRST ANTIQUE COATING',
        body: 'Early application of antique color coating',
        image: 'legacy_achievement_02.png'
      },
      {
        title: 'FIRST DESIGN APPROACH',
        body: 'Team-specific design logic for commemorative rings',
        image: 'legacy_achievement_03.png'
      }
    ],
    market: [
      {
        value: '95%',
        title: 'CHAMPIONSHIP RING SHARE',
        body: 'A leading choice in Korean championship ring production'
      },
      {
        value: '80%',
        title: 'COMMISSIONING RING SHARE',
        body: 'A deep record in group and commissioning ring production'
      }
    ],
    archive: {
      conversation: {
        eyebrow: 'Interview',
        title: 'In Conversation',
        body: 'Designers and makers align on meaning, standards, and purpose before each project takes form.',
        note: 'Interview with Studio Field'
      },
      timeline: {
        eyebrow: 'Chronicle',
        title: 'A Timeline of Milestones',
        body: 'Important production records become a standard for the next project.',
        items: [
          {year: '2024', text: 'Opened a new production studio'},
          {year: '2023', text: 'Launched Collection 06'},
          {year: '2022', text: 'Featured in Openhouse Magazine'}
        ]
      },
      study: {
        eyebrow: 'Project',
        title: 'A Study in Material',
        body: 'Stone, metal, and surface treatment are studied to create a more complete result.',
        items: ['Inspiration', 'Process', 'Details', 'Outcome']
      }
    }
  }
} satisfies Record<Locale, {
  heroLabel: string;
  introTitle: string;
  introLines: string[];
  resultTitle: string;
  resultBody: string;
  firstTitle: string;
  marketTitle: string;
  archiveTitle: string;
  cta: string;
  metrics: Metric[];
  firstRecords: FirstRecord[];
  market: Array<{value: string; title: string; body: string}>;
  archive: {
    conversation: {eyebrow: string; title: string; body: string; note: string};
    timeline: {
      eyebrow: string;
      title: string;
      body: string;
      items: Array<{year: string; text: string}>;
    };
    study: {eyebrow: string; title: string; body: string; items: string[]};
  };
}>;

export function AchievementRecordsPage({locale, content}: AchievementRecordsPageProps) {
  const copy = pageCopy[locale];
  const archiveImages = [
    content.hero.image,
    'legacy_achievement_01.png',
    'legacy_achievement_02.png',
    'legacy_achievement_03.png',
    'legacy_achievement_04.png',
    'legacy_card_achievement.png'
  ];

  return (
    <main className="bg-bg text-primary">
      <section className="bg-bg px-[clamp(20px,2.4vw,36px)] pb-16 pt-24 md:pb-20 md:pt-32">
        <div className="relative mx-auto h-[360px] max-w-[1500px] overflow-hidden bg-primary md:h-[480px] xl:h-[560px]">
          <Image
            src="/images/legacy_credibility_hero.png"
            alt={content.hero.subtitle}
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-35 mix-blend-multiply blur-[1px] saturate-50"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,246,242,0.16),rgba(16,29,48,0.62)),radial-gradient(circle_at_44%_18%,rgba(255,255,255,0.48),transparent_34%),radial-gradient(circle_at_72%_82%,rgba(8,15,26,0.48),transparent_42%)]" />
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(180deg,rgba(16,29,48,0.18)_1px,transparent_1px)] [background-size:38px_38px]" />
          <Reveal className="absolute left-1/2 top-1/2 w-[min(74vw,680px)] -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-12 text-center shadow-[0_18px_60px_rgba(16,29,48,0.08)] md:px-16 md:py-16">
            <h1 className="omega-title text-primary">
              {copy.heroLabel}
            </h1>
            <span className="mx-auto mt-7 block h-2.5 w-2.5 rotate-45 border-b border-r border-primary/70" />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg pb-16 md:pb-20">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <h2 className="omega-display text-primary">
            {copy.introTitle}
          </h2>
          <div className="mx-auto mt-7 max-w-2xl space-y-3 text-[#252525]">
            {copy.introLines.map((line) => (
              <p key={line} className="omega-intro-copy">{line}</p>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="bg-white px-container py-16 md:py-20">
        <Reveal className="mx-auto grid max-w-[1180px] gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {copy.metrics.map((metric) => (
            <div key={metric.label} className="font-body text-primary">
              <p className="text-[20px] font-normal leading-6">{metric.value}</p>
              <p className="omega-small-title mt-3 max-w-[190px]">
                {metric.label}
              </p>
              <p className="omega-copy mt-6 max-w-[250px] text-[#222]">
                {metric.body}
              </p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="omega-section-y bg-bg">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <h2 className="omega-display text-primary">
            {copy.resultTitle}
          </h2>
          <p className="omega-intro-copy mx-auto mt-5 max-w-xl text-[#252525]">
            {copy.resultBody}
          </p>
        </Reveal>
      </section>

      <section className="omega-section-y bg-white px-container">
        <div className="mx-auto max-w-[1120px]">
          <Reveal className="text-center">
            <h2 className="omega-display text-primary">
              {copy.firstTitle}
            </h2>
          </Reveal>
          <Reveal className="mt-16 grid gap-14 text-center md:grid-cols-3">
            {copy.firstRecords.map((record) => (
              <RevealItem key={record.title}>
                <article>
                  <div className="relative mx-auto aspect-square w-[min(58vw,230px)] overflow-hidden bg-[#d8d8d8]">
                    <Image
                      src={`/images/${record.image}`}
                      alt={record.title}
                      fill
                      sizes="(min-width: 768px) 230px, 58vw"
                      className="object-cover opacity-28 grayscale"
                    />
                    <div className="absolute inset-0 bg-[#d8d8d8]/45" />
                  </div>
                  <h3 className="omega-small-title mt-10 text-primary">
                    {record.title}
                  </h3>
                  <p className="omega-small-copy mt-2 text-[#252525]">
                    {record.body}
                  </p>
                </article>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="omega-section-y bg-bg px-container">
        <div className="mx-auto max-w-[1120px]">
          <Reveal className="text-center">
            <h2 className="omega-display text-primary">
              {copy.marketTitle}
            </h2>
          </Reveal>

          <div className="mt-20 space-y-20 md:space-y-16">
            <Reveal className="grid gap-10 md:grid-cols-[1fr_0.48fr] md:items-center md:gap-24">
              <EditorialImage
                image="legacy_achievement_02.png"
                alt={copy.market[0].title}
                className="md:max-w-[650px]"
              />
              <MarketText item={copy.market[0]} />
            </Reveal>

            <Reveal className="grid gap-10 md:grid-cols-[0.48fr_1fr] md:items-center md:gap-24">
              <MarketText item={copy.market[1]} className="md:order-none" />
              <EditorialImage
                image="legacy_achievement_03.png"
                alt={copy.market[1].title}
                className="md:ml-auto md:max-w-[650px]"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white pt-24 md:pt-28">
        <Reveal className="px-container text-center">
          <h2 className="omega-display text-primary">
            {copy.archiveTitle}
          </h2>
        </Reveal>

        <div className="mx-auto mt-20 grid max-w-[1500px] bg-bg lg:grid-cols-3">
          <Reveal className="flex min-h-[520px] flex-col justify-between p-8 md:p-12 lg:p-16">
            <div>
              <p className="omega-small-copy text-primary">{copy.archive.conversation.eyebrow}</p>
              <h3 className="omega-display mt-12 max-w-[320px] text-primary">
                {copy.archive.conversation.title}
              </h3>
              <p className="omega-copy mt-9 max-w-[280px] text-[#252525]">
                {copy.archive.conversation.body}
              </p>
              <p className="omega-small-title mt-8 text-primary">
                {copy.archive.conversation.note}
              </p>
            </div>
            <div className="relative mt-12 aspect-[4/3] w-[180px] overflow-hidden bg-[#e5e1d9]">
              <Image
                src={`/images/${archiveImages[1]}`}
                alt={copy.archive.conversation.title}
                fill
                sizes="180px"
                className="object-cover opacity-45 grayscale"
              />
            </div>
          </Reveal>

          <Reveal className="relative min-h-[520px] overflow-hidden">
            <Image
              src={`/images/${archiveImages[0]}`}
              alt={content.hero.subtitle}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal className="flex min-h-[520px] flex-col justify-between p-8 md:p-12 lg:p-16">
            <p className="omega-title self-end text-primary">02</p>
            <div className="space-y-8 text-[#252525]">
              <p>
                <span className="omega-small-title text-primary">Q.</span> <span className="omega-small-copy">What drives your creative process?</span>
              </p>
              <p className="omega-small-copy">
                Craft, context, and the patience to understand why each piece should exist.
              </p>
              <p>
                <span className="omega-small-title text-primary">Q.</span> <span className="omega-small-copy">How do you define achievement?</span>
              </p>
              <p className="omega-small-copy">
                When a finished object becomes a standard that another client can trust.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mx-auto grid max-w-[1500px] bg-bg lg:grid-cols-[0.9fr_0.7fr_1.2fr]">
          <Reveal className="p-8 md:p-12 lg:p-16">
            <p className="omega-small-copy text-primary">{copy.archive.timeline.eyebrow}</p>
            <h3 className="omega-display mt-14 max-w-[350px] text-primary">
              {copy.archive.timeline.title}
            </h3>
            <p className="omega-copy mt-10 max-w-[280px] text-[#252525]">
              {copy.archive.timeline.body}
            </p>
            <div className="mt-14 space-y-7">
              {copy.archive.timeline.items.map((item) => (
                <div key={item.year} className="grid grid-cols-[72px_1fr] gap-8">
                  <p className="omega-small-copy text-primary">{item.year}</p>
                  <p className="omega-small-copy text-[#252525]">{item.text}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="relative min-h-[520px] overflow-hidden">
            <Image
              src={`/images/${archiveImages[4]}`}
              alt={copy.archive.timeline.title}
              fill
              sizes="(min-width: 1024px) 23vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal className="relative min-h-[520px] overflow-hidden">
            <p className="omega-title absolute right-8 top-8 z-10 text-primary md:right-12 md:top-12">
              04
            </p>
            <Image
              src={`/images/${archiveImages[2]}`}
              alt={copy.archive.timeline.title}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </Reveal>
        </div>

        <div className="mx-auto grid max-w-[1500px] bg-bg lg:grid-cols-[1.3fr_0.9fr]">
          <Reveal className="relative min-h-[420px] overflow-hidden md:min-h-[620px]">
            <p className="omega-title absolute left-8 top-8 z-10 text-primary md:left-12 md:top-12">
              03
            </p>
            <Image
              src={`/images/${archiveImages[3]}`}
              alt={copy.archive.study.title}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal className="flex min-h-[420px] flex-col justify-center p-8 md:min-h-[620px] md:p-12 lg:p-16">
            <p className="omega-small-copy text-primary">{copy.archive.study.eyebrow}</p>
            <h3 className="omega-display mt-14 max-w-[350px] text-primary">
              {copy.archive.study.title}
            </h3>
            <p className="omega-copy mt-9 max-w-[300px] text-[#252525]">
              {copy.archive.study.body}
            </p>
            <ol className="omega-small-copy mt-12 grid max-w-[240px] grid-cols-[34px_1fr] gap-y-3 text-primary">
              {copy.archive.study.items.map((item, index) => (
                <li key={item} className="contents">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        <Reveal className="mx-auto grid max-w-[1500px] gap-3 bg-white p-3 sm:grid-cols-4">
          {archiveImages.slice(1, 5).map((image, index) => (
            <div key={image} className="relative aspect-[4/3] overflow-hidden bg-[#e2ded7]">
              <Image
                src={`/images/${image}`}
                alt={`${copy.archiveTitle} ${index + 1}`}
                fill
                sizes="(min-width: 640px) 25vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </Reveal>
      </section>

      <section className="bg-bg py-20">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <Link
            href={withLocale(locale, '/specialty/collection')}
            className="link-sweep omega-kicker"
          >
            {copy.cta}
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

function EditorialImage({
  image,
  alt,
  className
}: {
  image: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-white ${className ?? ''}`}>
      <Image
        src={`/images/${image}`}
        alt={alt}
        fill
        sizes="(min-width: 768px) 650px, 100vw"
        className="object-cover opacity-36 grayscale"
      />
      <div className="absolute inset-0 bg-white/62" />
    </div>
  );
}

function MarketText({
  item,
  className
}: {
  item: {value: string; title: string; body: string};
  className?: string;
}) {
  return (
    <div className={`font-body text-primary ${className ?? ''}`}>
      <p className="text-[20px] font-normal leading-6">{item.value}</p>
      <h3 className="omega-small-title mt-3 max-w-[240px]">
        {item.title}
      </h3>
      <p className="omega-copy mt-5 max-w-[300px] text-[#252525]">
        {item.body}
      </p>
    </div>
  );
}
