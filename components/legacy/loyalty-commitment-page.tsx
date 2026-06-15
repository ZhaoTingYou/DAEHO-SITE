import Image from 'next/image';
import Link from 'next/link';

import {
  LoyaltyFeatureCarousel,
  type LoyaltyFeatureSlide
} from '@/components/legacy/loyalty-feature-carousel';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
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
    cta: 'DISCOVER MORE'
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
    cta: 'DISCOVER MORE'
  }
} satisfies Record<Locale, {
  heroLabel: string;
  introLines: string[];
  featureTitle: string;
  featureBody: string;
  featureKicker: string;
  featureSlides: LoyaltyFeatureSlide[];
  cta: string;
}>;

export function LoyaltyCommitmentPage({locale, content}: LoyaltyCommitmentPageProps) {
  const copy = pageCopy[locale];

  return (
    <main className="bg-bg text-primary">
      <section className="bg-bg px-[clamp(20px,2.4vw,36px)] pb-[clamp(54px,7vw,92px)] pt-[clamp(92px,10vw,132px)]">
        <div className="relative mx-auto h-[clamp(320px,43vw,560px)] max-w-[1500px] overflow-hidden bg-primary">
          <Image
            src={`/images/${content.hero.image}`}
            alt={content.hero.subtitle}
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-35 mix-blend-multiply blur-[1px] saturate-50"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,246,242,0.16),rgba(16,29,48,0.62)),radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.48),transparent_34%),radial-gradient(circle_at_72%_82%,rgba(8,15,26,0.48),transparent_42%)]" />
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(180deg,rgba(16,29,48,0.18)_1px,transparent_1px)] [background-size:38px_38px]" />
          <Reveal className="absolute left-1/2 top-1/2 w-[min(74vw,680px)] -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-12 text-center shadow-[0_18px_60px_rgba(16,29,48,0.08)] md:px-16 md:py-16">
            <h1 className="omega-title text-primary">
              {copy.heroLabel}
            </h1>
            <span className="mx-auto mt-7 block h-2.5 w-2.5 rotate-45 border-b border-r border-primary/70" />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg pb-[clamp(76px,9vw,126px)]">
        <div className="mx-auto max-w-3xl px-container text-center">
          <Reveal className="space-y-3 text-[#252525]">
            {copy.introLines.map((line) => (
              <p key={line} className="omega-intro-copy">{line}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-bg px-[clamp(20px,2.4vw,36px)] pb-[clamp(30px,5vw,56px)]">
        <LoyaltyFeatureCarousel slides={copy.featureSlides} imageAlt={content.hero.subtitle} />
      </section>

      <section className="bg-bg pb-24 md:pb-28">
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
