import Image from 'next/image';
import Link from 'next/link';

import {
  LoyaltyFeatureCarousel,
  type LoyaltyFeatureSlide
} from '@/components/legacy/loyalty-feature-carousel';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
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
};

type LoyaltyCommitmentPageProps = {
  locale: Locale;
  content: LoyaltyContent;
};

const pageCopy = {
  ko: {
    heroLabel: 'LOYALTY',
    introLines: [
      '대호가 생각하는 관계는 한 번의 제작으로 끝나지 않습니다.',
      '고객의 목적을 이해하고, 필요한 정보를 정확히 기록하며,',
      '다음 의뢰에서도 다시 문의할 수 있는 제작 흐름을 유지합니다.',
      '반복되는 신뢰는 과정의 안정성에서 만들어집니다.'
    ],
    featureTitle: '01. Repeat Trust',
    featureBody:
      '고객이 다시 제작을 맡기는 이유는 단순히 이전 결과물이 만족스러웠기 때문만은 아닙니다. 처음 상담부터 디자인 제안, 수정, 제작, 검수, 전달까지 전 과정이 안정적으로 보존되고 공유되기 때문입니다. 대호는 고객이 다시 같은 프로젝트를 맡겼을 때, 이전의 기준과 정보를 바탕으로 더 효율적이고 정확하게 진행할 수 있도록 관리합니다.',
    featureKicker: 'LOYALTY STANDARD',
    featureSlides: [
      {
        kicker: 'LOYALTY STANDARD',
        title: '01. Repeat Trust',
        body: '고객이 다시 제작을 맡기는 이유는 단순히 이전 결과물이 만족스러웠기 때문만은 아닙니다. 처음 상담부터 디자인 제안, 수정, 제작, 검수, 전달까지 전 과정이 안정적으로 보존되고 공유되기 때문입니다. 대호는 고객이 다시 같은 프로젝트를 맡겼을 때, 이전의 기준과 정보를 바탕으로 더 효율적이고 정확하게 진행할 수 있도록 관리합니다.',
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
    discoverEyebrow: 'DISCOVER OUR COMMITMENTS',
    discoverTitle: '신뢰가 반복되는 접점',
    cta: '연혁으로 돌아가기',
    principles: [
      {
        title: '기록되는 상담',
        body: '요구 사항과 맥락을 남겨 다음 제작에서도 같은 기준으로 대화할 수 있게 합니다.'
      },
      {
        title: '확인 가능한 제작',
        body: '소재, 일정, 이미지, 사양을 단계별로 확인하며 불확실성을 줄입니다.'
      },
      {
        title: '완성 이후의 응답',
        body: '전달 후 문의와 추가 제작까지 이어지는 내부 흐름을 유지합니다.'
      }
    ],
    timeline: [
      {year: '01', title: '관계 이해', body: '팀, 행사, 수상 맥락을 먼저 정리합니다.'},
      {year: '02', title: '기준 합의', body: '디자인과 사양, 일정의 우선순위를 명확히 합니다.'},
      {year: '03', title: '제작 기록', body: '선택과 변경 사항을 누적해 같은 기준을 보존합니다.'},
      {year: '04', title: '재의뢰 연결', body: '완성 이후 다음 시즌과 다음 프로젝트로 이어집니다.'}
    ],
    cards: [
      {
        image: 'legacy_card_loyalty.png',
        title: 'Long-term relationships',
        body: '반복되는 요청을 같은 품질의 기준으로 이어갑니다.'
      },
      {
        image: 'home_pillar_legacy.png',
        title: 'Shared memory',
        body: '팀의 상징과 이야기가 다음 세대의 기억으로 남도록 설계합니다.'
      },
      {
        image: 'chronicle_detail_01.png',
        title: 'Documented care',
        body: '제작 전후의 확인 과정을 기록으로 남깁니다.'
      }
    ]
  },
  en: {
    heroLabel: 'LOYALTY',
    introLines: [
      'For DEAHO, loyalty does not end with a single commission.',
      'It begins by understanding the client, preserving the right information,',
      'and keeping a production flow that makes every return easier.',
      'Repeat trust is built through a process that stays stable over time.'
    ],
    featureTitle: '01. Repeat Trust',
    featureBody:
      'Clients return not only because the previous result was satisfying, but because the full process remains clear: consultation, design direction, revisions, production, inspection, and delivery. DEAHO keeps the standards and context from each project so the next commission can begin with confidence and move with greater precision.',
    featureKicker: 'LOYALTY STANDARD',
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
    discoverEyebrow: 'DISCOVER OUR COMMITMENTS',
    discoverTitle: 'Where trust repeats',
    cta: 'Back to chronicle',
    principles: [
      {
        title: 'Recorded consultation',
        body: 'Requirements and context are kept so each future commission starts from a shared understanding.'
      },
      {
        title: 'Verifiable making',
        body: 'Materials, timelines, imagery, and specifications are confirmed in clear stages.'
      },
      {
        title: 'Aftercare response',
        body: 'Questions after delivery and follow-up requests remain part of the internal flow.'
      }
    ],
    timeline: [
      {year: '01', title: 'Understand the relationship', body: 'The team, occasion, and achievement context are clarified first.'},
      {year: '02', title: 'Align the standards', body: 'Design, specifications, and schedule priorities are made explicit.'},
      {year: '03', title: 'Document the making', body: 'Selections and changes are preserved as a working record.'},
      {year: '04', title: 'Connect the return', body: 'Completion leads naturally into the next season and project.'}
    ],
    cards: [
      {
        image: 'legacy_card_loyalty.png',
        title: 'Long-term relationships',
        body: 'Repeat requests continue through the same standard of quality.'
      },
      {
        image: 'home_pillar_legacy.png',
        title: 'Shared memory',
        body: 'Symbols and team stories are shaped to stay meaningful across generations.'
      },
      {
        image: 'chronicle_detail_01.png',
        title: 'Documented care',
        body: 'The checks before and after production remain visible as a record.'
      }
    ]
  }
} satisfies Record<Locale, {
  heroLabel: string;
  introLines: string[];
  featureTitle: string;
  featureBody: string;
  featureKicker: string;
  featureSlides: LoyaltyFeatureSlide[];
  discoverEyebrow: string;
  discoverTitle: string;
  cta: string;
  principles: Array<{title: string; body: string}>;
  timeline: Array<{year: string; title: string; body: string}>;
  cards: Array<{image: string; title: string; body: string}>;
}>;

export function LoyaltyCommitmentPage({locale, content}: LoyaltyCommitmentPageProps) {
  const messages = getLocaleMessages(locale);
  const copy = pageCopy[locale];

  return (
    <main className="bg-[#f4f1eb] text-primary">
      <section className="bg-[#f4f1eb] px-[clamp(20px,2.4vw,36px)] pb-[clamp(54px,7vw,92px)] pt-[clamp(92px,10vw,132px)]">
        <div className="relative mx-auto h-[clamp(320px,43vw,560px)] max-w-[1500px] overflow-hidden bg-[#8990c7]">
          <Image
            src={`/images/${content.hero.image}`}
            alt={content.hero.subtitle}
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-35 mix-blend-multiply blur-[1px] saturate-50"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(235,236,255,0.2),rgba(105,111,178,0.56)),radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.55),transparent_34%),radial-gradient(circle_at_72%_82%,rgba(63,71,142,0.5),transparent_42%)]" />
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(180deg,rgba(25,32,94,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
          <Reveal className="absolute left-1/2 top-1/2 w-[min(74vw,680px)] -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-[clamp(42px,5vw,66px)] text-center shadow-[0_18px_60px_rgba(30,34,70,0.08)] md:px-16">
            <h1 className="font-heading text-[clamp(18px,1.4vw,24px)] font-medium uppercase tracking-[0.03em] text-primary">
              {copy.heroLabel}
            </h1>
            <span className="mx-auto mt-7 block h-2.5 w-2.5 rotate-45 border-b border-r border-primary/70" />
          </Reveal>
        </div>
      </section>

      <section className="bg-[#f4f1eb] pb-[clamp(76px,9vw,126px)]">
        <div className="mx-auto max-w-3xl px-container text-center">
          <Reveal className="space-y-4 font-body text-[13px] leading-[2.05] text-[#252525]">
            {copy.introLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#f4f1eb] px-[clamp(20px,2.4vw,36px)] pb-[clamp(30px,5vw,56px)]">
        <LoyaltyFeatureCarousel slides={copy.featureSlides} imageAlt={content.hero.subtitle} />
      </section>

      <section className="bg-[#f4f1eb] py-[clamp(76px,9vw,118px)]">
        <div className="mx-auto max-w-[1240px] px-container">
          <Reveal className="mx-auto max-w-3xl space-y-4 text-center">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.26em] text-subtext">
              {copy.discoverEyebrow}
            </p>
            <h2 className="font-heading text-[clamp(30px,4.2vw,52px)] font-semibold leading-[1.08] text-primary">
              {copy.discoverTitle}
            </h2>
          </Reveal>
          <Reveal className="mt-12 grid gap-7 md:grid-cols-3">
            {copy.cards.map((card, index) => (
              <article key={card.image} className="bg-white px-7 py-8 text-center shadow-[0_14px_48px_rgba(31,28,22,0.05)]">
                <p className="font-heading text-[28px] italic text-primary/45">
                  {String(index + 2).padStart(2, '0')}.
                </p>
                <h3 className="mt-5 font-heading text-[clamp(22px,2vw,30px)] font-semibold leading-tight text-primary">
                  {card.title}
                </h3>
                <p className="mt-4 font-body text-[13px] leading-[1.85] text-text">
                  {card.body}
                </p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#f4f1eb] pb-[clamp(70px,9vw,118px)]">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <Link
            href={withLocale(locale, '/chronicle')}
            className="link-sweep font-body text-[12px] font-semibold uppercase tracking-[0.16em]"
          >
            {copy.cta || messages.legacyUi.backToLegacy}
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
