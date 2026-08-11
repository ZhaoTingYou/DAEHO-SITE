import {getPublicLocales} from '@/lib/english-visibility-core';
import {locales} from '@/lib/locales';
import {metadataBase} from '@/lib/seo';

const siteName = '대호';
const siteAlternateNames = ['DAEHO', '대호반지', '대호 우승반지', 'DAEHO championship rings'];
const organizationDescription =
  '대호(DAEHO)는 1988년부터 우승반지 제작을 중심으로 커스텀 트로피, 기업 행사 기념품, 스포츠 시상식 용품, 커스텀 디자인 제작을 이어온 한국의 상징물 제작사입니다.';
const serviceItems = [
  {
    id: 'championship-rings',
    name: '우승반지 제작',
    alternateName: [
      '챔피언십 반지',
      '챔피언십 링',
      '스포츠 시상식 용품',
      'Championship Ring Production',
      'Sports Championship Rings'
    ],
    serviceType: 'Custom championship ring production',
    description:
      '프로스포츠 구단, 학교, 단체의 우승 기록을 담는 커스텀 우승반지와 챔피언십 반지를 디자인하고 제작합니다.',
    url: '/ko/mastery/creations/champion'
  },
  {
    id: 'custom-trophies',
    name: '커스텀 트로피 제작',
    alternateName: ['커스텀 트로피', '시상 트로피 제작', 'Custom Trophy Production', 'Award Trophies'],
    serviceType: 'Custom trophy and award object production',
    description:
      '시상식과 수여식의 목적, 로고, 각인, 수량을 반영한 커스텀 트로피와 시상 오브젝트를 상담부터 납품까지 제작합니다.',
    url: '/ko/contact'
  },
  {
    id: 'corporate-event-gifts',
    name: '기업 행사 기념품 제작',
    alternateName: ['행사 기념품', '창립 기념품 제작', 'Corporate Event Gifts', 'Commemorative Goods'],
    serviceType: 'Corporate event and commemorative gift production',
    description:
      '창립 기념식, 은퇴식, 수여식 등 기업과 기관 행사 일정에 맞춰 기념품을 기획하고 단체 수량으로 납품합니다.',
    url: '/ko/contact'
  },
  {
    id: 'appointment-rings',
    name: '임관반지 제작',
    alternateName: ['기념반지 제작', 'Appointment Ring Production', 'Commission Rings'],
    serviceType: 'Custom appointment and commemorative ring production',
    description: '임관, 진급, 단체 기념의 상징을 반영한 임관반지와 기념반지를 맞춤 제작합니다.',
    url: '/ko/mastery/creations/appointment'
  },
  {
    id: 'bespoke-rings',
    name: '커스텀 디자인 제작',
    alternateName: ['커스텀 디자인 반지', '주문제작 반지', 'Custom Design Production', 'Custom Group Rings'],
    serviceType: 'Custom design and commemorative object production',
    description: '브랜드, 행사, 이름, 기록을 반영한 주문제작 반지와 기념 오브젝트를 디자인 상담부터 납품까지 관리합니다.',
    url: '/ko/mastery/creations/bespoke'
  }
];

export function SiteStructuredData({englishEnabled}: {englishEnabled: boolean}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absoluteSiteUrl('/#website'),
        url: absoluteSiteUrl('/'),
        name: siteName,
        alternateName: siteAlternateNames,
        inLanguage: getPublicLocales(locales, englishEnabled).map((locale) =>
          locale === 'ko' ? 'ko-KR' : 'en-US'
        ),
        publisher: {
          '@id': absoluteSiteUrl('/#organization')
        },
        about: {
          '@id': absoluteSiteUrl('/#organization')
        }
      },
      {
        // 우승반지, 트로피, 기념품, 시상식 용품을 함께 제작하는 사업 범위라 소매점 하위 유형은
        // 실제와 맞지 않는다. 상위 유형만 남겨 업종을 좁게 규정하지 않는다.
        '@type': ['Organization', 'LocalBusiness'],
        '@id': absoluteSiteUrl('/#organization'),
        name: siteName,
        alternateName: siteAlternateNames,
        description: organizationDescription,
        url: absoluteSiteUrl('/'),
        logo: absoluteSiteUrl('/images/logo.png'),
        image: absoluteSiteUrl('/images/home_hero.png'),
        slogan: '기억되어야 할 순간을 상징으로 완성합니다.',
        foundingDate: '1988',
        email: 'dhofficial1988@gmail.com',
        telephone: '+82-2-765-2737',
        taxID: '101-86-47224',
        priceRange: '$$',
        areaServed: ['KR'],
        knowsAbout: [
          '대호',
          'DAEHO',
          '대호 우승반지',
          '대호반지',
          '우승반지 제작',
          '스포츠 우승반지',
          '챔피언십 반지',
          '챔피언십 링',
          'championship rings',
          'championship ring maker',
          '커스텀 트로피',
          '커스텀 트로피 제작',
          '시상 트로피',
          'custom trophy',
          '기업 행사 기념품',
          '행사 기념품 제작',
          '창립 기념품',
          'corporate event gifts',
          '스포츠 시상식 용품',
          '시상식 기념품',
          'sports award goods',
          '커스텀 디자인 제작',
          '주문제작 반지',
          'custom design production',
          '단체 기념반지',
          '임관반지 제작'
        ],
        makesOffer: serviceItems.map((item) => ({
          '@id': absoluteSiteUrl(`/#service-${item.id}`)
        })),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: '대호 우승반지·커스텀 트로피·기념품 제작 서비스',
          itemListElement: serviceItems.map((item, index) => ({
            '@type': 'Offer',
            position: index + 1,
            itemOffered: {
              '@id': absoluteSiteUrl(`/#service-${item.id}`)
            }
          }))
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          addressLocality: '서울',
          postalCode: '03139',
          streetAddress: '종로구 율곡로 22나길 19-15 3층'
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'dhofficial1988@gmail.com',
          telephone: '+82-2-765-2737',
          availableLanguage: ['ko', 'en']
        }
      },
      ...serviceItems.map((item) => ({
        '@type': 'Service',
        '@id': absoluteSiteUrl(`/#service-${item.id}`),
        name: item.name,
        alternateName: item.alternateName,
        serviceType: item.serviceType,
        description: item.description,
        url: absoluteSiteUrl(item.url),
        provider: {
          '@id': absoluteSiteUrl('/#organization')
        },
        areaServed: {
          '@type': 'Country',
          name: 'KR'
        }
      }))
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, '\\u003c')
      }}
    />
  );
}

function absoluteSiteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}
