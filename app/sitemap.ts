import type {MetadataRoute} from 'next';

import {routing} from '@/i18n/routing';
import {listPublicCollections, listPublicNews} from '@/lib/cms/repositories';
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';
import {isTechniquePageVisible} from '@/lib/public-page-visibility';
import {metadataBase} from '@/lib/seo';
import koMessages from '@/messages/ko.json';

export const dynamic = 'force-dynamic';

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry['changeFrequency']>;

const baseStaticPaths = [
  '/',
  '/archive',
  '/heritage/loyalty',
  '/heritage/credibility',
  '/heritage/achievement',
  ...(isTechniquePageVisible ? ['/mastery/technique'] : []),
  '/mastery/making',
  '/mastery/creations',
  '/mastery/creations/champion',
  '/mastery/creations/appointment',
  '/mastery/creations/bespoke',
  '/news',
  '/contact',
  '/terms',
  '/privacy'
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cmsNews = await readCmsValue(() => listPublicNews('ko'), []);
  const cmsCollections = await readCmsValue(() => listPublicCollections('ko'), []);
  const golfEnabled = await isGolfEnabledForSite();
  const staticPaths = [
    ...baseStaticPaths,
    ...(golfEnabled ? ['/golf', '/golf/inquiry'] : [])
  ];
  const detailPaths = [
    ...(cmsNews.length > 0
      ? cmsNews.map((card) => `/news/${card.slug}`)
      : koMessages.news.grid.cards.map((card) => `/news/${card.id}`)),
    ...(cmsCollections.length > 0
      ? cmsCollections.map((item) => `/mastery/creations/${item.slug}`)
      : koMessages.specialtyPages.collection.gallery.items.map((item) => `/mastery/creations/${item.id}`))
  ];
  const lastModified = new Date();

  return [...staticPaths, ...detailPaths].flatMap((path) =>
    routing.locales.map((locale) => createSitemapEntry(locale, path, lastModified))
  );
}

function createSitemapEntry(locale: string, path: string, lastModified: Date): SitemapEntry {
  return {
    url: localizedAbsoluteUrl(locale, path),
    lastModified,
    changeFrequency: changeFrequencyForPath(path),
    priority: priorityForPath(path),
    alternates: {
      languages: {
        ko: localizedAbsoluteUrl('ko', path),
        en: localizedAbsoluteUrl('en', path),
        'x-default': localizedAbsoluteUrl('ko', path)
      }
    }
  };
}

function localizedAbsoluteUrl(locale: string, path: string) {
  return absoluteUrl(`/${locale}${path === '/' ? '' : path}`);
}

function changeFrequencyForPath(path: string): ChangeFrequency {
  if (path === '/' || path === '/news' || path.startsWith('/news/')) {
    return 'weekly';
  }

  if (path === '/terms' || path === '/privacy') {
    return 'yearly';
  }

  return 'monthly';
}

function priorityForPath(path: string) {
  if (path === '/') {
    return 1;
  }

  const priorityByPath: Record<string, number> = {
    '/mastery/creations/champion': 0.95,
    '/mastery/creations': 0.92,
    '/mastery/technique': 0.91,
    '/mastery/making': 0.9,
    '/contact': 0.88,
    '/heritage/achievement': 0.86,
    '/heritage/credibility': 0.84,
    '/archive': 0.8,
    '/news': 0.76
  };

  if (priorityByPath[path] !== undefined) {
    return priorityByPath[path];
  }

  if (path.startsWith('/mastery/creations/')) {
    return 0.74;
  }

  if (path.startsWith('/news/')) {
    return 0.64;
  }

  if (path === '/terms' || path === '/privacy') {
    return 0.3;
  }

  return 0.7;
}

function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}

async function readCmsValue<T>(reader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await reader();
  } catch (error) {
    if (!isNextDynamicServerError(error)) {
      console.error('[cms] Falling back to static sitemap entries because CMS read failed.', error);
    }
    return fallback;
  }
}
