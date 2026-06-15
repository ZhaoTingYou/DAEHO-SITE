import type {HomeNewsPopupCard} from '@/components/home/home-news-popups';
import type {NewsCard} from '@/components/news/news-journal-grid';
import type {SpecialtyCollectionItem} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';

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

export function getNewsCardsForSite(locale: Locale): NewsCard[] {
  const cmsItems = readCmsValue(() => listPublicNews(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.map((item) => ({
      id: item.slug,
      category: item.category,
      categoryLabel: item.categoryLabel,
      date: item.publishedAt,
      title: item.title,
      image: item.imagePath,
      hasImage: imageExists(item.imagePath)
    }));
  }

  return getLocaleMessages(locale).news.grid.cards.map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export function getHomeNewsCardsForSite(locale: Locale): HomeNewsPopupCard[] {
  return getNewsCardsForSite(locale).slice(0, 4).map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export function getNewsDetailForSite(locale: Locale, slug: string): PublicNewsDetail | null {
  const text = getLocaleMessages(locale).newsUi.detail;
  const cmsItem = readCmsValue(() => getPublicNews(slug, locale), null);

  if (cmsItem) {
    const body = normalizeNewsBody(cmsItem.body);
    return {
      card: {
        id: cmsItem.slug,
        category: cmsItem.category,
        categoryLabel: cmsItem.categoryLabel,
        date: cmsItem.publishedAt,
        title: cmsItem.title,
        image: cmsItem.imagePath,
        hasImage: imageExists(cmsItem.imagePath)
      },
      lead: body.lead || cmsItem.excerpt || text.lead,
      paragraphs: body.paragraphs.length > 0 ? body.paragraphs : text.paragraphs,
      quote: body.quote || text.quote,
      tags: cmsItem.tags.length > 0 ? cmsItem.tags : text.tags,
      ctaTitle: body.ctaTitle || text.ctaTitle,
      seoTitle: cmsItem.seoTitle || cmsItem.title,
      seoDescription: cmsItem.seoDescription || body.lead || cmsItem.excerpt || '',
      ogImagePath: cmsItem.ogImagePath || cmsItem.imagePath
    };
  }

  const card = getLocaleMessages(locale).news.grid.cards.find((item) => item.id === slug);

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
    ogImagePath: 'news_detail_hero.png'
  };
}

export function getCollectionItemsForSite(locale: Locale): SpecialtyCollectionItem[] {
  const cmsItems = readCmsValue(() => listPublicCollections(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.map((item) => {
      const specs = normalizeCollectionSpecs(item.specs);
      return {
        id: item.slug,
        title: item.title,
        caption: item.caption,
        category: item.category,
        categoryLabel: item.categoryLabel,
        sportCategory: item.sportCategory || specs.sportCategory,
        sportCategoryLabel: item.sportCategoryLabel,
        year: specs.year,
        image: item.imagePath,
        hasImage: imageExists(item.imagePath)
      };
    });
  }

  return getLocaleMessages(locale).specialtyPages.collection.gallery.items.map((item) => ({
    ...item,
    hasImage: imageExists(item.image)
  }));
}

export function getCollectionItemForSite(locale: Locale, slug: string) {
  const cmsItem = readCmsValue(() => getPublicCollection(slug, locale), null);

  if (cmsItem) {
    const specs = normalizeCollectionSpecs(cmsItem.specs);
    return {
      id: cmsItem.slug,
      title: cmsItem.title,
      caption: cmsItem.caption,
      story: cmsItem.story,
      category: cmsItem.category,
      categoryLabel: cmsItem.categoryLabel,
      sportCategory: cmsItem.sportCategory || specs.sportCategory,
      sportCategoryLabel: cmsItem.sportCategoryLabel,
      year: specs.year,
      image: cmsItem.imagePath,
      gallery: normalizeGallery(cmsItem.gallery, cmsItem.imagePath),
      hasImage: imageExists(cmsItem.imagePath),
      seoTitle: cmsItem.seoTitle || cmsItem.title,
      seoDescription: cmsItem.seoDescription || cmsItem.caption,
      ogImagePath: cmsItem.ogImagePath || cmsItem.imagePath,
      specs
    };
  }

  const item = getLocaleMessages(locale).specialtyPages.collection.gallery.items.find((entry) => entry.id === slug);

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
    ? value.filter((image): image is string => typeof image === 'string' && image.length > 0)
    : [];

  return images.length > 0 ? images : [fallbackImage].filter(Boolean);
}

function readCmsValue<T>(reader: () => T, fallback: T): T {
  try {
    return reader();
  } catch (error) {
    console.error('[cms] Falling back to static content because CMS read failed.', error);
    return fallback;
  }
}
