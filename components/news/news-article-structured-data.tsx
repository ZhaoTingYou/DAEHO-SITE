import type {Locale} from '@/i18n/routing';
import type {PublicNewsDetail} from '@/lib/cms/public-content';
import {imageSrc} from '@/lib/image-src';
import {metadataBase} from '@/lib/seo';

type Props = {
  detail: PublicNewsDetail;
  locale: Locale;
  slug: string;
};

export function NewsArticleStructuredData({detail, locale, slug}: Props) {
  const pageUrl = absoluteUrl(`/${locale}/news/${slug}`);
  const datePublished = toIsoDate(detail.card.date);
  const image = articleImage(detail);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${pageUrl}#article`,
    headline: detail.seoTitle || detail.card.title,
    description: detail.seoDescription || undefined,
    inLanguage: locale === 'ko' ? 'ko-KR' : 'en-US',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl
    },
    url: pageUrl,
    // 발행일 형식이 CMS 입력에 따라 달라질 수 있어, 파싱에 실패하면 잘못된 값 대신 생략한다.
    ...(datePublished ? {datePublished, dateModified: datePublished} : {}),
    ...(image ? {image: [image]} : {}),
    ...(detail.card.categoryLabel ? {articleSection: detail.card.categoryLabel} : {}),
    ...(detail.tags.length > 0 ? {keywords: detail.tags} : {}),
    author: {
      '@id': absoluteUrl('/#organization')
    },
    publisher: {
      '@id': absoluteUrl('/#organization')
    }
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

function articleImage(detail: PublicNewsDetail) {
  const source = detail.ogImagePath || detail.card.image;

  if (!source) {
    return '';
  }

  const resolved = imageSrc(source);

  return /^https?:\/\//i.test(resolved) ? resolved : absoluteUrl(resolved);
}

// CMS publishedAt은 "2026-07-17", "2026.07.17", "2026년 7월 17일" 등으로 들어올 수 있다.
// schema.org datePublished는 ISO 8601을 요구하므로 YYYY-MM-DD로 맞추고, 못 읽으면 빈 문자열을 돌려준다.
export function toIsoDate(value: string) {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(trimmed)) {
    const iso = trimmed.slice(0, 10);

    return isRealDate(iso) ? iso : '';
  }

  const numbers = trimmed.match(/\d+/g);

  if (numbers && numbers.length >= 3 && numbers[0].length === 4) {
    const [year, month, day] = numbers;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    return isRealDate(iso) ? iso : '';
  }

  return '';
}

function isRealDate(iso: string) {
  const parsed = new Date(`${iso}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(iso);
}

function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}
