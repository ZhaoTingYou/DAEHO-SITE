import type {MetadataRoute} from 'next';

import {routing} from '@/i18n/routing';
import {listPublicCollections, listPublicNews} from '@/lib/cms/repositories';
import {metadataBase} from '@/lib/seo';
import koMessages from '@/messages/ko.json';

export const dynamic = 'force-dynamic';

const staticPaths = [
  '/',
  '/archive',
  '/heritage/loyalty',
  '/heritage/credibility',
  '/heritage/achievement',
  '/mastery/making',
  '/mastery/creations',
  '/news',
  '/golf',
  '/golf/inquiry',
  '/contact',
  '/terms',
  '/privacy'
];

export default function sitemap(): MetadataRoute.Sitemap {
  const cmsNews = readCmsValue(() => listPublicNews('ko'), []);
  const cmsCollections = readCmsValue(() => listPublicCollections('ko'), []);
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

function readCmsValue<T>(reader: () => T, fallback: T): T {
  try {
    return reader();
  } catch (error) {
    console.error('[cms] Falling back to static sitemap entries because CMS read failed.', error);
    return fallback;
  }
}
