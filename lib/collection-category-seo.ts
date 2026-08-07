type Locale = 'ko' | 'en';

type CategoryFallback = {
  label: string;
  description?: string;
};

type CategorySeo = {
  title: string;
  description: string;
};

const categorySeoByLocale: Record<Locale, Record<string, CategorySeo>> = {
  ko: {
    champion: {
      title: '대호 우승반지 제작',
      description:
        '대호는 1988년부터 프로스포츠 구단, 학교, 단체를 위한 맞춤 우승반지와 챔피언십 링을 디자인하고 납품해왔습니다.'
    },
    appointment: {
      title: '대호 단체 기념반지 제작',
      description:
        '대호는 기관과 단체의 기념 순간을 담은 단체 기념반지를 맞춤 디자인과 안정적인 단체 납품 기준으로 제작합니다.'
    },
    bespoke: {
      title: '대호 맞춤 반지 주문제작',
      description:
        '대호는 이름, 기록, 상징, 행사 목적을 반영한 맞춤 반지와 기념 주얼리를 상담부터 디자인, 제작, 납품까지 관리합니다.'
    }
  },
  en: {
    champion: {
      title: 'DAEHO Championship Ring Production',
      description:
        'Since 1988, DAEHO has designed and delivered custom championship rings for professional sports teams, schools, and organizations.'
    },
    appointment: {
      title: 'DAEHO Appointment Ring Production',
      description:
        'DAEHO creates appointment rings for commissions, promotions, and group commemorations with custom design and stable delivery standards.'
    },
    bespoke: {
      title: 'DAEHO Bespoke Ring Production',
      description:
        'DAEHO manages custom rings and commemorative jewelry from consultation to design, production, and delivery for names, records, and symbols.'
    }
  }
};

export function getCollectionCategorySeoFallback(
  locale: Locale,
  categoryId: string,
  fallback: CategoryFallback
): CategorySeo {
  return categorySeoByLocale[locale]?.[categoryId] ?? {
    title: fallback.label,
    description: fallback.description ?? ''
  };
}
