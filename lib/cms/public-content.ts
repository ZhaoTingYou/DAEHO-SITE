import type {HomeNewsPopupCard} from '@/components/home/home-news-popups';
import type {NewsCard} from '@/components/news/news-journal-grid';
import type {SpecialtyCollectionItem} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';

import {
  getPublicCollection,
  getPublicNews,
  listPublicCollections,
  listPublicNews
} from './repositories';

export type PublicNewsDetail = {
  card: NewsCard;
  lead: string;
  paragraphs: string[];
  quote: string;
  tags: string[];
  ctaTitle: string;
  seoTitle: string;
  seoDescription: string;
  ogImagePath: string;
};

export async function getNewsCardsForSite(locale: Locale): Promise<NewsCard[]> {
  const cmsItems = await readCmsValue(() => listPublicNews(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.map((item) => ({
      id: String(item.slug),
      category: String(item.category),
      categoryLabel: String(item.categoryLabel),
      date: String(item.publishedAt),
      title: String(item.title),
      image: cmsImageName(item.imagePath),
      hasImage: imageExists(cmsImageName(item.imagePath))
    }));
  }

  return (await getLocaleMessages(locale)).news.grid.cards.map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export async function getHomeNewsCardsForSite(locale: Locale): Promise<HomeNewsPopupCard[]> {
  return (await getNewsCardsForSite(locale)).slice(0, 4).map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export function getHomeNewsCardsFromPage(cards: Array<Omit<HomeNewsPopupCard, 'hasImage'>>): HomeNewsPopupCard[] {
  return cards.slice(0, 4).map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export async function getNewsDetailForSite(locale: Locale, slug: string): Promise<PublicNewsDetail | null> {
  const text = (await getLocaleMessages(locale)).newsUi.detail;
  const cmsItem = await readCmsValue(() => getPublicNews(slug, locale), null);

  if (cmsItem) {
    const body = normalizeNewsBody(cmsItem.body);
    const image = cmsImageName(cmsItem.imagePath);
    const ogImage = cmsImageName(cmsItem.ogImagePath || cmsItem.imagePath);

    return {
      card: {
        id: String(cmsItem.slug),
        category: String(cmsItem.category),
        categoryLabel: String(cmsItem.categoryLabel),
        date: String(cmsItem.publishedAt),
        title: String(cmsItem.title),
        image,
        hasImage: imageExists(image)
      },
      lead: body.lead || String(cmsItem.excerpt ?? '') || text.lead,
      paragraphs: body.paragraphs.length > 0 ? body.paragraphs : text.paragraphs,
      quote: body.quote || text.quote,
      tags: Array.isArray(cmsItem.tags) && cmsItem.tags.length > 0 ? cmsItem.tags.filter((tag): tag is string => typeof tag === 'string') : text.tags,
      ctaTitle: body.ctaTitle || text.ctaTitle,
      seoTitle: String(cmsItem.seoTitle || cmsItem.title || ''),
      seoDescription: String(cmsItem.seoDescription || body.lead || cmsItem.excerpt || ''),
      ogImagePath: ogImage
    };
  }

  const card = (await getLocaleMessages(locale)).news.grid.cards.find((item) => item.id === slug);

  if (!card) {
    return null;
  }

  return {
    card: {
      ...card,
      hasImage: imageExists(card.image)
    },
    lead: text.lead,
    paragraphs: text.paragraphs,
    quote: text.quote,
    tags: text.tags,
    ctaTitle: text.ctaTitle,
    seoTitle: card.title,
    seoDescription: text.lead,
    ogImagePath: text.ogImagePath || card.image
  };
}

export async function getCollectionItemsForSite(locale: Locale): Promise<SpecialtyCollectionItem[]> {
  const cmsItems = await readCmsValue(() => listPublicCollections(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.map((item) => {
      const specs = normalizeCollectionSpecs(item.specs);
      return {
        id: String(item.slug),
        title: String(item.title),
        caption: String(item.caption),
        category: String(item.category),
        categoryLabel: String(item.categoryLabel),
        sportCategory: String(item.sportCategory || specs.sportCategory),
        sportCategoryLabel: String(item.sportCategoryLabel),
        year: specs.year,
        image: cmsImageName(item.imagePath),
        hasImage: imageExists(cmsImageName(item.imagePath))
      };
    });
  }

  return (await getLocaleMessages(locale)).specialtyPages.collection.gallery.items.map((item) => ({
    ...item,
    hasImage: imageExists(item.image)
  }));
}

export async function getCollectionItemForSite(locale: Locale, slug: string) {
  const cmsItem = await readCmsValue(() => getPublicCollection(slug, locale), null);

  if (cmsItem) {
    const specs = normalizeCollectionSpecs(cmsItem.specs);
    const image = cmsImageName(cmsItem.imagePath);
    const ogImage = cmsImageName(cmsItem.ogImagePath || cmsItem.imagePath);

    return {
      id: String(cmsItem.slug),
      title: String(cmsItem.title),
      caption: String(cmsItem.caption),
      story: String(cmsItem.story),
      category: String(cmsItem.category),
      categoryLabel: String(cmsItem.categoryLabel),
      sportCategory: String(cmsItem.sportCategory || specs.sportCategory),
      sportCategoryLabel: String(cmsItem.sportCategoryLabel),
      year: specs.year,
      image,
      gallery: normalizeGallery(cmsItem.gallery, image),
      hasImage: imageExists(image),
      seoTitle: String(cmsItem.seoTitle || cmsItem.title || ''),
      seoDescription: String(cmsItem.seoDescription || cmsItem.caption || ''),
      ogImagePath: ogImage,
      specs
    };
  }

  const item = (await getLocaleMessages(locale)).specialtyPages.collection.gallery.items.find((entry) => entry.id === slug);

  if (!item) {
    return null;
  }

  return {
    ...item,
    story: item.caption,
    gallery: [
      item.image,
      'collection_detail_01.png',
      'collection_detail_02.png',
      'collection_detail_03.png',
      'collection_detail_04.png',
      'collection_detail_05.png'
    ],
    hasImage: imageExists(item.image),
    seoTitle: item.title,
    seoDescription: item.caption,
    ogImagePath: item.image,
    specs: {
      year: item.year ?? '',
      sportCategory: item.sportCategory ?? ''
    }
  };
}

function normalizeNewsBody(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      lead: '',
      paragraphs: [],
      quote: '',
      ctaTitle: ''
    };
  }

  const body = value as Record<string, unknown>;
  return {
    lead: typeof body.lead === 'string' ? body.lead : '',
    paragraphs: Array.isArray(body.paragraphs)
      ? body.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === 'string')
      : [],
    quote: typeof body.quote === 'string' ? body.quote : '',
    ctaTitle: typeof body.ctaTitle === 'string' ? body.ctaTitle : ''
  };
}

function normalizeCollectionSpecs(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      year: '',
      sportCategory: ''
    };
  }

  const specs = value as Record<string, unknown>;
  return {
    year: typeof specs.year === 'string' ? specs.year : '',
    sportCategory: typeof specs.sportCategory === 'string' ? specs.sportCategory : ''
  };
}

function normalizeGallery(value: unknown, fallbackImage: string) {
  const images = Array.isArray(value)
    ? value
      .filter((image): image is string => typeof image === 'string' && image.length > 0)
      .map(cmsImageName)
      .filter(Boolean)
    : [];

  return images.length > 0 ? images : [fallbackImage].filter(Boolean);
}

function cmsImageName(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  let imagePath = value.trim().split(/[?#]/)[0]?.replace(/\\/g, '/') ?? '';

  if (!imagePath) {
    return '';
  }

  if (/^https?:\/\//i.test(imagePath)) {
    try {
      imagePath = new URL(imagePath).pathname;
    } catch {
      return '';
    }
  }

  return imagePath
    .replace(/^\/+/, '')
    .replace(/^public\/images\//, '')
    .replace(/^images\//, '')
    .replace(/^uploads\//, '');
}

async function readCmsValue<T>(reader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await reader();
  } catch (error) {
    if (!isNextDynamicServerError(error)) {
      console.error('[cms] Falling back to static content because CMS read failed.', error);
    }
    return fallback;
  }
}
