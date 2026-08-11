import {metadataBase} from '@/lib/seo';

type Crumb = {
  name: string;
  path: string;
};

// 검색결과의 URL 자리에 계층 경로를 노출시켜, 상세 페이지가 사이트 어디에 속하는지 알린다.
// 마지막 항목은 현재 페이지라 링크를 걸지 않는 것이 schema.org 권장 방식이다.
export function BreadcrumbStructuredData({items}: {items: Crumb[]}) {
  if (items.length === 0) {
    return null;
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(index < items.length - 1 ? {item: absoluteUrl(crumb.path)} : {})
    }))
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

function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}
