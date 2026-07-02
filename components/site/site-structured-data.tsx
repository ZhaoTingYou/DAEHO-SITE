import {metadataBase} from '@/lib/seo';

const siteName = '대호';
const siteAlternateNames = ['DAEHO', '대호반지'];
const organizationDescription =
  '대호는 우승반지, 임관반지, 단체 기념반지와 맞춤 주얼리를 제작하는 한국의 상징물 제작사입니다.';

export function SiteStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absoluteSiteUrl('/#website'),
        url: absoluteSiteUrl('/'),
        name: siteName,
        alternateName: siteAlternateNames
      },
      {
        '@type': ['Organization', 'LocalBusiness', 'JewelryStore'],
        '@id': absoluteSiteUrl('/#organization'),
        name: siteName,
        alternateName: siteAlternateNames,
        description: organizationDescription,
        url: absoluteSiteUrl('/'),
        logo: absoluteSiteUrl('/images/logo.png'),
        foundingDate: '1988',
        email: 'dhofficial1988@gmail.com',
        telephone: '+82-2-765-2737',
        taxID: '101-86-47224',
        priceRange: '$$',
        areaServed: ['KR'],
        knowsAbout: [
          '우승반지 제작',
          '임관반지 제작',
          '챔피언십 링',
          '단체 기념반지',
          '맞춤 주얼리 제작'
        ],
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
      }
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
