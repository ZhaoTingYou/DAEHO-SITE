import Image from 'next/image';
import Link from 'next/link';

import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {withLocale} from '@/lib/site-map';

type CredibilityContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
  };
};

type CredibilityCompliancePageProps = {
  locale: Locale;
  content: CredibilityContent;
};

type StandardRow = {
  number: string;
  title: string;
  accent: string;
  body: string;
  image: string;
};

const pageCopy = {
  ko: {
    heroLabel: 'CREDIBILITY',
    introLines: [
      '대호의 신뢰는 오랜 경험만으로 설명되지 않습니다.',
      '각 제작, 수리, 납품까지 전 과정을 같은 기준으로 확인하고,',
      '한 번의 결과물을 넘어 반복해서 맡길 수 있는 제작 체계를 유지합니다.'
    ],
    standardTitle: 'STANDARD',
    standardLead: 'Credibility. Proven Through Standards.',
    standardSubline: '신뢰는 기준에서 시작됩니다.',
    cta: 'DISCOVER MORE',
    rows: [
      {
        number: '01.',
        title: '38년의 업력',
        accent: '변하지 않는 제작 기준',
        body:
          '대호는 1986년부터 우승반지, 단체반지, 단체 기념제품을 만들어온 제작사입니다. 같은 기준으로 상담과 제작을 이어오며, 디자인 제안, 소재 선택, 각인, 사이즈 확인, 검수까지 필요한 과정을 내부 기준으로 정리해 왔습니다.',
        image: 'legacy_card_credibility.png'
      },
      {
        number: '02.',
        title: '100% 자체 전공정 관리',
        accent: '디자인부터 납품까지 직접 관리',
        body:
          '대호는 디자인 상담, 3D 설계, 주조, 세공, 도금, 세팅, 포장까지 주요 제작 과정을 직접 관리합니다. 여러 담당자가 같은 제작 기록을 기준으로 움직이기 때문에 단체 주문에서도 사양과 일정의 흔들림을 줄일 수 있습니다.',
        image: 'legacy_credibility_hero.png'
      },
      {
        number: '03.',
        title: '0% 납품 사고',
        accent: '정밀 검수와 작업지도 제작',
        body:
          '수량, 이름, 사이즈, 각인, 포장 방식처럼 단체 주문에서 놓치기 쉬운 항목은 출고 전 다시 확인합니다. 제작 과정의 작은 차이가 최종 전달의 신뢰로 이어지기 때문에, 대호는 작업지와 검수 흐름을 함께 관리합니다.',
        image: 'chronicle_detail_01.png'
      },
      {
        number: '04.',
        title: '단체 주문 관리 시스템',
        accent: '이름, 사이즈, 각인까지 정확하게',
        body:
          '팀 주문은 한 명의 제품이 아니라 여러 사람의 정보를 동시에 관리하는 일입니다. 대호는 이름, 번호, 사이즈, 문구, 포장 요청을 표준화된 기록으로 정리해 제작과 검수 단계에서 같은 정보를 확인할 수 있게 합니다.',
        image: 'legacy_partner_placeholder.png'
      },
      {
        number: '05.',
        title: '품질 검수 기준',
        accent: '보이지 않는 부분까지 확인',
        body:
          '완성품은 표면 상태, 도금 균일도, 스톤 고정, 각인 상태, 포장 상태를 확인한 뒤 전달됩니다. 눈에 잘 보이는 장식뿐 아니라 착용감과 마감의 안정성까지 확인하는 것이 대호의 품질 기준입니다.',
        image: 'home_stats_bg.png'
      }
    ]
  },
  en: {
    heroLabel: 'CREDIBILITY',
    introLines: [
      'DEAHO credibility is not explained by history alone.',
      'Every commission, repair, and delivery is checked through the same operating standard,',
      'so clients can return with confidence beyond a single finished piece.'
    ],
    standardTitle: 'STANDARD',
    standardLead: 'Credibility. Proven Through Standards.',
    standardSubline: 'Trust begins with standards.',
    cta: 'DISCOVER MORE',
    rows: [
      {
        number: '01.',
        title: '38 years of craft',
        accent: 'A standard that does not drift',
        body:
          'Since 1986, DEAHO has produced championship rings, group rings, and commemorative jewelry. Consultation, design direction, material choices, engraving, sizing, and inspection are kept inside a consistent working standard.',
        image: 'legacy_card_credibility.png'
      },
      {
        number: '02.',
        title: '100% in-house process control',
        accent: 'From design to delivery',
        body:
          'DEAHO directly manages key stages including design consultation, 3D planning, casting, finishing, plating, setting, packing, and delivery. A shared production record keeps specifications and schedules steady for group orders.',
        image: 'legacy_credibility_hero.png'
      },
      {
        number: '03.',
        title: '0% delivery incidents',
        accent: 'Inspection before handoff',
        body:
          'Quantities, names, sizes, engraving, and packing details are checked before delivery. Small differences during production can affect trust at the final handoff, so DEAHO manages both work sheets and inspection flow.',
        image: 'chronicle_detail_01.png'
      },
      {
        number: '04.',
        title: 'Group order management system',
        accent: 'Names, sizes, and engraving tracked',
        body:
          'A team order means managing many people at once. DEAHO organizes names, numbers, sizes, messages, and packing requests into a clear record that can be checked through production and inspection.',
        image: 'legacy_partner_placeholder.png'
      },
      {
        number: '05.',
        title: 'Quality inspection standard',
        accent: 'Checked beyond the visible surface',
        body:
          'Finished pieces are reviewed for surface condition, plating consistency, stone security, engraving quality, and packaging. DEAHO checks both visible decoration and the stability of the final fit and finish.',
        image: 'home_stats_bg.png'
      }
    ]
  }
} satisfies Record<Locale, {
  heroLabel: string;
  introLines: string[];
  standardTitle: string;
  standardLead: string;
  standardSubline: string;
  cta: string;
  rows: StandardRow[];
}>;

export function CredibilityCompliancePage({locale, content}: CredibilityCompliancePageProps) {
  const copy = pageCopy[locale];

  return (
    <main className="bg-bg text-primary">
      <section className="bg-bg px-[clamp(20px,2.4vw,36px)] pb-16 pt-24 md:pb-20 md:pt-32">
        <div className="relative mx-auto h-[360px] max-w-[1500px] overflow-hidden bg-primary md:h-[480px] xl:h-[560px]">
          <Image
            src={`/images/${content.hero.image}`}
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

      <section className="bg-bg pb-20 md:pb-28">
        <div className="mx-auto max-w-3xl px-container text-center">
          <Reveal className="space-y-3 text-[#252525]">
            {copy.introLines.map((line) => (
              <p key={line} className="omega-intro-copy">{line}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="omega-section-y bg-bg px-container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="omega-display text-primary">
            {copy.standardTitle}
          </h2>
          <p className="omega-intro-copy mt-5 text-[#111827]">
            {copy.standardLead}
          </p>
          <p className="omega-intro-copy mt-2 text-[#111827]">
            {copy.standardSubline}
          </p>
        </Reveal>

        <div className="mx-auto mt-16 max-w-[1180px] bg-white px-7 py-8 shadow-[0_18px_70px_rgba(43,34,22,0.04)] md:px-16 md:py-12 lg:px-20">
          {copy.rows.map((row, index) => (
            <Reveal
              key={row.title}
              className={`grid gap-10 py-14 md:grid-cols-[1fr_0.82fr] md:items-center md:gap-16 lg:gap-24 ${
                index === 0 ? 'pt-4' : ''
              } ${index < copy.rows.length - 1 ? 'border-b border-[#b65c55]/70' : 'pb-4'}`}
            >
              <div className="max-w-[500px]">
                <h3 className="omega-title text-primary">
                  <span>{row.number}</span>
                  {' '}
                  <span className="ml-3">{row.title}</span>
                </h3>
                <p className="omega-small-title mt-3 text-[#b0443c]">
                  {row.accent}
                </p>
                <p className="omega-copy mt-5 text-[#111827]">
                  {row.body}
                </p>
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#d7d7d7] md:ml-auto md:max-w-[320px]">
                <Image
                  src={`/images/${row.image}`}
                  alt={`${row.title} - ${content.hero.title}`}
                  fill
                  sizes="(min-width: 768px) 320px, 100vw"
                  className="object-cover opacity-30 grayscale"
                />
                <div className="absolute inset-0 bg-[#d6d6d6]/45" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-bg pb-20">
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
