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
  paragraphs: string[];
};

const pageCopy = {
  ko: {
    heroLabel: 'CREDIBILITY',
    heroTitle: 'STANDARD',
    intro:
      '대호의 신뢰는 오랜 경험만으로 설명되지 않습니다. 디자인 상담부터 제작, 검수, 납품까지 전 과정을 직접 관리하며, 정해진 일정과 기준 안에서 결과물을 완성해왔습니다. 중요한 단체 제작을 맡길 수 있는 이유는 명확한 제작 체계에 있습니다.',
    imagePlaceholder: '여기는 이미지',
    quoteTitle: 'Credibility, Proven Through Standards',
    quoteBody: '신뢰는 기준에서 시작됩니다',
    discoverLead: '대호의 프로젝트 더 알아보기',
    cta: 'DISCOVER MORE',
    rows: [
      {
        number: '01.',
        title: '38년의 업력',
        accent: '변하지 않는 제작 기준',
        paragraphs: [
          '대호는 1988년부터 우승반지, 임관반지, 단체 기념제품을 전문적으로 제작해왔습니다. 오랜 시간동안 프로스포츠 구단, 군 관련 단체, 학교, 기관, 기업 등 다양한 고객의 프로젝트를 진행하며, 중요한 기념 제품에 필요한 기준과 제작 방식을 축적해왔습니다.',
          '38년의 경험은 단순히 오래 운영되었다는 의미가 아닙니다. 고객의 행사 일정, 단체별 상징, 개인별 각인, 수량 관리, 납품 방식 등 실제 제작 과정에서 발생하는 다양한 변수를 경험하고 해결해온 시간입니다. 대호는 이러한 경험을 바탕으로 고객이 중요한 프로젝트를 안정적으로 맡길 수 있는 제작 기준을 만들어왔습니다.'
        ]
      },
      {
        number: '02.',
        title: '100% 자체 전공정 관리',
        accent: '디자인부터 납품까지 직접 관리',
        paragraphs: [
          '대호는 디자인, 3D 설계, 주조, 세공, 보석 세팅, 각인, 표면 마감, 검수, 포장까지 주요 제작 과정을 자체적으로 관리합니다. 여러 외부 공정에 의존할 경우 디자인 의도, 품질, 일정 관리에 변수가 생길 수 있습니다.',
          '대호는 이러한 변동성을 줄이기 위해 제작 전 과정을 하나의 기준 안에서 운영합니다. 우승반지와 임관반지, 단체 기념제품은 일반 주얼리보다 확인해야 할 요소가 많습니다. 로고, 문장, 이름, 연도, 개인 각인, 사이즈, 수량이 모두 정확해야 하며, 디자인이 실제 제품으로 구현될 때 구조적 안정성과 착용감도 함께 고려되어야 합니다. 대호는 각 단계에서 제작 가능성과 완성도를 검토하며, 고객의 의도와 실제 제품의 품질이 일치하도록 관리합니다.'
        ]
      },
      {
        number: '03.',
        title: '0% 납품 사고',
        accent: '정해진 일정까지 책임지는 제작',
        paragraphs: [
          '우승 기념행사, 임관식, 수여식, 창립 기념식, 은퇴식처럼 날짜가 정해진 프로젝트는 납품 일정이 매우 중요합니다. 제품의 완성도가 높더라도 정해진 날짜에 전달되지 않으면 프로젝트 전체에 문제가 생길 수 있습니다. 대호는 제품을 만드는 과정뿐 아니라 고객의 행사 일정에 맞춰 정확히 납품하는 것까지 제작의 일부로 보고 관리합니다.',
          '납품 안정성은 단순히 빠르게 제작하는 능력이 아닙니다. 상담 단계에서부터 제작 기간, 디자인 확정 시점, 사이즈 취합, 각인 확인, 검수, 포장, 배송 일정을 함께 고려해야 합니다. 대호는 38년 동안 다양한 단체 주문과 기념 제작 프로젝트를 진행하며 일정 관리의 중요성을 경험해왔고, 납품 사고 없이 프로젝트를 마무리해온 기록을 쌓아왔습니다.'
        ]
      },
      {
        number: '04.',
        title: '단체 주문 관리 시스템',
        accent: '이름, 사이즈, 각인까지 정확하게',
        paragraphs: [
          '단체 제작은 제품 하나를 잘 만드는 것만으로 완성되지 않습니다. 수십 명, 수백 명의 이름, 사이즈, 각인 내용, 수량, 포장 방식이 모두 정확히 반영되어야 합니다. 특히 우승반지나 임관반지처럼 개인별 정보가 들어가는 제품은 작은 오류도 고객 전체의 신뢰도에 영향을 줄 수 있습니다.',
          '대호는 단체 주문의 특성을 고려해 제작 단계부터 개인별 데이터를 확인하고 관리합니다. 이름 표기, 호수, 각인 위치, 문구, 옵션, 수량, 케이스 구성 등을 정리하고, 최종 납품 전까지 누락이나 오류가 발생하지 않도록 점검합니다. 고객 입장에서는 복잡한 단체 주문을 안정적으로 맡길 수 있어야 하며, 대호는 이러한 관리 체계를 통해 프로젝트의 완성도를 높입니다.'
        ]
      },
      {
        number: '05.',
        title: '지속적 R&D',
        accent: '신뢰를 높이는 기준의 개선',
        paragraphs: [
          '대호의 연구개발은 새로운 기술을 보여주기 위한 목적에만 머무르지 않습니다. 더 안정적인 품질, 더 정확한 제작, 더 만족도 높은 결과물을 만들기 위해 소재, 주조, 세공, 각인, 표면 처리, 보석 세팅 등 제품 완성도에 영향을 주는 모든 공정을 지속적으로 점검하고 개선합니다.',
          '특히 단체 주문과 기념 제품은 동일한 디자인 안에서도 사이즈, 각인, 수량, 일정, 납품 기준이 모두 정확하게 관리되어야 합니다. 대호는 축적된 제작 경험과 지속적인 기술 개선을 바탕으로 오차를 줄이고, 완성도를 높이며, 고객이 안심하고 맡길 수 있는 제작 기준을 만들어가고 있습니다. 이러한 꾸준한 연구개발은 대호의 신뢰를 유지하는 가장 중요한 기반입니다.'
        ]
      },
      {
        number: '06.',
        title: '품질 검수 기준',
        accent: '보이지 않는 부분까지 확인',
        paragraphs: [
          '품질은 제품의 외형만으로 판단되지 않습니다. 금속 표면의 마감 상태, 각인의 선명도, 보석 세팅의 안정성, 로고와 문양의 비율, 착용감, 사이즈 정확도, 패키지 상태까지 모두 확인되어야 합니다. 대호는 완성된 제품이 고객에게 전달되기 전, 세부 기준에 따라 제품을 점검합니다.',
          '특히 기념 제품은 오랜 시간 보관되거나 중요한 행사에서 전달되는 경우가 많기 때문에, 제품의 첫인상과 완성도가 모두 중요합니다. 반지 자체의 품질뿐 아니라 케이스, 포장, 전달 상태까지 전체 경험의 일부로 봐야 합니다. 대호는 납품 전 최종 검수를 통해 제품의 디테일과 기능, 포장 상태를 확인하고, 고객이 안심하고 받을 수 있는 결과물을 완성합니다.'
        ]
      }
    ]
  },
  en: {
    heroLabel: 'CREDIBILITY',
    heroTitle: 'STANDARD',
    intro:
      'DEAHO credibility is not explained by experience alone. From design consultation to production, inspection, and delivery, every stage is managed directly so important group projects can be completed within clear standards and schedules.',
    imagePlaceholder: 'Image area',
    quoteTitle: 'Credibility, Proven Through Standards',
    quoteBody: 'Trust begins with standards.',
    discoverLead: 'Discover more DEAHO projects',
    cta: 'DISCOVER MORE',
    rows: [
      {
        number: '01.',
        title: '38 years of craft',
        accent: 'A standard that does not drift',
        paragraphs: [
          'Since 1988, DEAHO has specialized in championship rings, commission rings, and group commemorative products for sports teams, military organizations, schools, institutions, and companies.',
          'This experience is not only a matter of time. It is a record of solving real production variables such as event schedules, symbols, engraving, quantities, and delivery methods.'
        ]
      },
      {
        number: '02.',
        title: '100% in-house process control',
        accent: 'Managed directly from design to delivery',
        paragraphs: [
          'DEAHO manages design, 3D planning, casting, finishing, stone setting, engraving, surface treatment, inspection, and packing under one production standard.',
          'This reduces variables in quality, design intent, and schedule control, especially for group orders with many details to verify.'
        ]
      },
      {
        number: '03.',
        title: '0% delivery incidents',
        accent: 'Responsible through the confirmed schedule',
        paragraphs: [
          'Projects tied to ceremonies and official events require reliable delivery as much as product quality.',
          'DEAHO treats schedule management as part of production, planning confirmation, sizing, engraving, inspection, packing, and shipping around the client’s event date.'
        ]
      },
      {
        number: '04.',
        title: 'Group order management system',
        accent: 'Names, sizes, and engraving tracked accurately',
        paragraphs: [
          'Group production requires accurate handling of names, sizes, engraving, quantities, and packing formats for every recipient.',
          'DEAHO organizes individual data from the production stage and checks it through final delivery.'
        ]
      },
      {
        number: '05.',
        title: 'Continuous R&D',
        accent: 'Improving standards that build trust',
        paragraphs: [
          'DEAHO’s research and development is focused on stable quality, accurate production, and better results across materials, casting, finishing, engraving, surface treatment, and setting.',
          'Continuous improvement helps reduce error and strengthens the standard clients can trust.'
        ]
      },
      {
        number: '06.',
        title: 'Quality inspection standard',
        accent: 'Checked beyond the visible surface',
        paragraphs: [
          'Quality is not judged only by appearance. Surface finish, engraving clarity, setting stability, proportions, comfort, sizing, and package condition must all be checked.',
          'Before delivery, DEAHO reviews the product details, function, and packaging so clients can receive the final result with confidence.'
        ]
      }
    ]
  }
} satisfies Record<Locale, {
  heroLabel: string;
  heroTitle: string;
  intro: string;
  imagePlaceholder: string;
  quoteTitle: string;
  quoteBody: string;
  discoverLead: string;
  cta: string;
  rows: StandardRow[];
}>;

export function CredibilityCompliancePage({locale}: CredibilityCompliancePageProps) {
  const copy = pageCopy[locale];
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;

  return (
    <main className="bg-white text-primary">
      <section className="grid min-h-[100svh] place-items-center bg-white py-24">
        <div className="mx-auto max-w-3xl px-container text-center">
          <Reveal className="flex flex-col items-center text-[#252525]">
            <p className={`${englishTextClass} mb-[50px] text-[15px] uppercase leading-none text-accent`}>
              {copy.heroLabel}
            </p>
            <h1 className={`${englishTextClass} mb-[15px] text-[clamp(30px,3.4vw,44px)] uppercase leading-none text-primary`}>
              {copy.heroTitle}
            </h1>
            <p className={`${bodyTextClass} mx-auto max-w-[560px] text-[15px] leading-[1.85] text-[#252525]`}>
              {copy.intro}
            </p>
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

      <section className="bg-white py-[clamp(100px,12vw,174px)]">
        <Reveal className="mx-auto max-w-4xl px-container text-center text-primary">
          <p className={`${englishTextClass} text-[clamp(58px,7vw,92px)] leading-none text-black`}>“</p>
          <p className={`${englishTextClass} mt-7 text-[clamp(24px,2.4vw,34px)] italic leading-tight text-primary`}>
            {copy.quoteTitle}
          </p>
          <p className={`${bodyTextClass} mt-4 text-[clamp(27px,3vw,43px)] leading-tight text-primary`}>
            {copy.quoteBody}
          </p>
          <p className={`${englishTextClass} mt-7 text-[clamp(58px,7vw,92px)] leading-none text-black`}>”</p>
        </Reveal>
      </section>

      <section className="bg-white px-container pb-[clamp(96px,10vw,150px)]">
        <div className="mx-auto max-w-[1180px] bg-white px-7 py-8 md:px-16 md:py-12 lg:px-20">
          {copy.rows.map((row, index) => (
            <Reveal
              key={row.title}
              className={`grid gap-8 py-14 md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] md:items-center md:gap-10 lg:gap-12 ${
                index === 0 ? 'pt-4' : ''
              } ${index < copy.rows.length - 1 ? 'border-b border-[#b65c55]/70' : 'pb-4'}`}
            >
              <div className="max-w-[620px]">
                <h2 className="[font-family:'MaruBuri',serif] text-[32px] font-semibold leading-tight tracking-normal text-primary">
                  <span>{row.number}</span>
                  {' '}
                  <span>{row.title}</span>
                </h2>
                <p className="mt-[10px] [font-family:'Pretendard',sans-serif] text-[20px] font-normal leading-tight text-accent">
                  {row.accent}
                </p>
                <div className="mt-[15px] space-y-4">
                  {row.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="[font-family:'Pretendard',sans-serif] text-[13px] font-normal leading-[1.78] text-[#111827]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <div className="aspect-[4/3] w-full bg-[#d7d7d7]" aria-hidden="true" />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white py-[clamp(96px,11vw,168px)]">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <p className="[font-family:'MaruBuri',serif] text-[32px] font-semibold leading-tight text-primary">
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
