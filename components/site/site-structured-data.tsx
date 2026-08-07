import {getPublicLocales} from '@/lib/english-visibility-core';
import {locales} from '@/lib/locales';
import {metadataBase} from '@/lib/seo';

const siteName = '대호';
const siteAlternateNames = ['DAEHO', '대호반지', '대호 우승반지', 'DAEHO championship rings'];
const organizationDescription =
  '대호(DAEHO)는 1988년부터 우승반지, 챔피언십 반지, 맞춤 트로피, 스포츠 행사 기념품과 맞춤 주얼리를 제작하는 한국의 상징물 제작사입니다.';
const serviceItems = [
  {
    id: 'championship-rings',
    name: '우승반지 제작',
    alternateName: [
      '챔피언십 반지',
      '챔피언십 링',
      'Championship Ring Production',
      'Sports Championship Rings'
    ],
    serviceType: 'Custom championship ring production',
    description:
      '프로스포츠 구단, 학교, 단체의 우승 기록을 담는 맞춤 우승반지와 챔피언십 반지를 디자인하고 제작합니다.',
    url: '/ko/mastery/creations/champion'
  },
  {
    id: 'custom-trophies',
    name: '맞춤 트로피 제작',
    alternateName: ['우승 트로피 제작', 'Custom Trophy Production', 'Award Trophies'],
    serviceType: 'Custom trophy and award object production',
    description:
      '대회와 시상식의 성격에 맞춰 형태, 소재, 각인을 설계한 맞춤 트로피와 시상 오브젝트를 제작합니다.',
    url: '/ko/mastery/creations/bespoke'
  },
  {
    id: 'event-souvenirs',
    name: '행사 기념품 제작',
    alternateName: [
      '스포츠 행사 기념품',
      '단체 기념품 제작',
      'Event Commemorative Goods',
      'Sports Event Awards'
    ],
    serviceType: 'Event and sports commemorative goods production',
    description:
      '스포츠 행사, 창립 기념, 단체 행사의 목적과 참여 규모에 맞춘 행사 기념품을 기획하고 제작합니다.',
    url: '/ko/mastery/creations/bespoke'
  },
  {
    id: 'commemorative-rings',
    name: '단체 기념반지 제작',
    alternateName: ['기념반지 제작', 'Commemorative Ring Production', 'Group Commemorative Rings'],
    serviceType: 'Group commemorative ring production',
    description: '단체와 기관의 기념 순간을 상징으로 남기는 단체 기념반지를 맞춤 제작합니다.',
    url: '/ko/mastery/creations/appointment'
  },
  {
    id: 'bespoke-rings',
    name: '맞춤 반지 주문제작',
    alternateName: ['주문제작 반지', 'Bespoke Rings', 'Custom Group Rings'],
    serviceType: 'Bespoke ring and commemorative jewelry production',
    description: '브랜드, 행사, 이름, 기록을 반영한 주문제작 반지와 맞춤 주얼리를 상담부터 납품까지 관리합니다.',
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
        '@type': ['Organization', 'LocalBusiness', 'JewelryStore'],
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
          '맞춤 트로피',
          '맞춤 트로피 제작',
          '우승 트로피 제작',
          'custom trophy production',
          '행사 기념품',
          '행사 기념품 제작',
          '단체 기념품 제작',
          'event commemorative goods',
          '스포츠 행사',
          '스포츠 행사 기념품',
          'sports event awards',
          '단체 기념반지',
          '맞춤 반지 주문제작',
          '맞춤 주얼리 제작'
        ],
        makesOffer: serviceItems.map((item) => ({
          '@id': absoluteSiteUrl(`/#service-${item.id}`)
        })),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: '대호 맞춤 반지 제작 서비스',
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
