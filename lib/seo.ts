import type {Metadata} from 'next';

import type {Locale} from '@/i18n/routing';
import {getPage} from '@/lib/cms/repositories';
import {imageSrc} from '@/lib/image-src';
import {getLocaleMessages} from '@/lib/locale-messages';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';

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

type SeoOverride = {
  title: string;
  description: string;
  image: string;
};

const cmsPageKeyByPageKey: Record<PageKey, string> = {
  home: 'home',
  chronicle: 'archive',
  loyalty: 'heritage-loyalty',
  credibility: 'heritage-credibility',
  achievement: 'heritage-achievement',
  technique: 'mastery-making',
  collection: 'mastery-creations',
  news: 'news',
  golf: 'golf',
  contact: 'contact',
  golfInquiry: 'golf-inquiry'
};

export const metadataBase = getMetadataBase();

const homeSeoByLocale: Record<Locale, Omit<PageSeo, 'path'>> = {
  ko: {
    title: '대호 | 우승반지 제작 전문',
    description: '대호는 1988년부터 우승반지, 임관반지, 단체 기념반지와 맞춤 주얼리를 제작해 온 한국의 상징물 제작사입니다.'
  },
  en: {
    title: 'Korean Championship Ring Maker',
    description: 'DAEHO is a Korean maker of championship rings, commission rings, commemorative rings, and bespoke symbolic jewelry since 1988.'
  }
};

export async function getPageMetadata(locale: Locale, pageKey: PageKey): Promise<Metadata> {
  const page = await getPageSeo(locale, pageKey);
  const override = await getCmsPageSeoOverride(locale, cmsPageKeyByPageKey[pageKey]);

  return getDetailMetadata(
    locale,
    page.path,
    override.title || page.title,
    override.description || page.description,
    override.image || undefined
  );
}

export async function getCmsPageSeoOverride(locale: Locale, cmsPageKey: string): Promise<SeoOverride> {
  if (!cmsPageKey) {
    return emptySeoOverride();
  }

  try {
    const page = await getPage(cmsPageKey);
    const seo = page?.seo?.[locale];

    if (!seo || typeof seo !== 'object') {
      return emptySeoOverride();
    }

    const fields = seo as Record<string, unknown>;
    const image = stringValue(fields.ogImagePath);

    return {
      title: stringValue(fields.title),
      description: stringValue(fields.description),
      image: image ? imageSrc(image) : ''
    };
  } catch (error) {
    if (!isNextDynamicServerError(error)) {
      console.error(`[seo] Falling back to page copy because CMS SEO could not be read for ${cmsPageKey}.`, error);
    }
    return emptySeoOverride();
  }
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
  const title = `${pageTitle} | DAEHO`;

  return {
    title,
    description,
    robots: previewNoindexRobots(),
    alternates: {
      canonical: withLocale(locale, path),
      languages: {
        ko: withLocale('ko', path),
        en: withLocale('en', path),
        'x-default': withLocale('ko', path)
      }
    },
    openGraph: {
      title,
      description,
      url: withLocale(locale, path),
      siteName: locale === 'ko' ? '대호' : 'DAEHO',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          alt: 'DAEHO'
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
        title: homeSeoByLocale[locale].title,
        description: homeSeoByLocale[locale].description
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
        description: messages.news.featured.body
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

function emptySeoOverride(): SeoOverride {
  return {
    title: '',
    description: '',
    image: ''
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
