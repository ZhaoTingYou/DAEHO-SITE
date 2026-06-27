import type {Metadata} from 'next';

import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';

type PageKey =
  | 'home'
  | 'chronicle'
  | 'loyalty'
  | 'credibility'
  | 'achievement'
  | 'technique'
  | 'collection'
  | 'news'
  | 'golf'
  | 'contact'
  | 'golfInquiry';

type PageSeo = {
  path: string;
  title: string;
  description: string;
};

export const metadataBase = getMetadataBase();

export async function getPageMetadata(locale: Locale, pageKey: PageKey): Promise<Metadata> {
  const page = await getPageSeo(locale, pageKey);
  return getDetailMetadata(locale, page.path, page.title, page.description);
}

export function isPreviewNoindexEnabled() {
  return process.env.PREVIEW_NOINDEX === 'true';
}

export function previewNoindexRobots(): Metadata['robots'] | undefined {
  if (!isPreviewNoindexEnabled()) {
    return undefined;
  }

  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  };
}

export function getDetailMetadata(
  locale: Locale,
  path: string,
  pageTitle: string,
  description: string,
  image = '/images/home_hero.png'
): Metadata {
  const title = `${pageTitle} | DEAHO`;

  return {
    title,
    description,
    robots: previewNoindexRobots(),
    alternates: {
      canonical: withLocale(locale, path),
      languages: {
        ko: withLocale('ko', path),
        en: withLocale('en', path),
        'x-default': path
      }
    },
    openGraph: {
      title,
      description,
      url: withLocale(locale, path),
      siteName: 'DEAHO',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          alt: 'DEAHO'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image]
    }
  };
}

async function getPageSeo(locale: Locale, pageKey: PageKey): Promise<PageSeo> {
  const messages = await getLocaleMessages(locale);

  switch (pageKey) {
    case 'home':
      return {
        path: '/',
        title: messages.home.title,
        description: messages.home.subtitle
      };
    case 'chronicle':
      return {
        path: '/archive',
        title: messages.chronicle.hero.title,
        description: messages.chronicle.hero.subtitle
      };
    case 'loyalty':
      return {
        path: '/heritage/loyalty',
        title: messages.legacyPages.loyalty.hero.title,
        description: messages.legacyPages.loyalty.hero.subtitle
      };
    case 'credibility':
      return {
        path: '/heritage/credibility',
        title: messages.legacyPages.credibility.hero.title,
        description: messages.legacyPages.credibility.hero.subtitle
      };
    case 'achievement':
      return {
        path: '/heritage/achievement',
        title: messages.legacyPages.achievement.hero.title,
        description: messages.legacyPages.achievement.hero.subtitle
      };
    case 'technique':
      return {
        path: '/mastery/making',
        title: messages.specialtyPages.technique.hero.title,
        description: messages.specialtyPages.technique.hero.subtitle
      };
    case 'collection':
      return {
        path: '/mastery/creations',
        title: messages.specialtyPages.collection.hero.title,
        description: messages.specialtyPages.collection.hero.subtitle
      };
    case 'news':
      return {
        path: '/news',
        title: messages.news.masthead.title,
        description: messages.news.masthead.body
      };
    case 'golf':
      return {
        path: '/golf',
        title: messages.golf.hero.titleLines.join(' '),
        description: messages.golf.hero.subtitle
      };
    case 'contact':
      return {
        path: '/contact',
        title: messages.contact.hero.eyebrow,
        description: messages.contact.hero.body
      };
    case 'golfInquiry':
      return {
        path: '/golf/inquiry',
        title: messages.golfInquiry.hero.eyebrow,
        description: messages.golfInquiry.hero.body
      };
  }
}

function withLocale(locale: Locale, path: string) {
  return `/${locale}${path === '/' ? '' : path}`;
}

function getMetadataBase() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;

  return new URL(normalizedUrl);
}
