import type {MetadataRoute} from 'next';

import {routing} from '@/i18n/routing';
import {listPublicCollections, listPublicNews} from '@/lib/cms/repositories';
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';
import {metadataBase} from '@/lib/seo';
import koMessages from '@/messages/ko.json';

export const dynamic = 'force-dynamic';

const baseStaticPaths = [
  '/',
  '/archive',
  '/heritage/loyalty',
  '/heritage/credibility',
  '/heritage/achievement',
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
    routing.locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${path === '/' ? '' : path}`),
      lastModified,
      changeFrequency: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1 : 0.7
    }))
  );
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
