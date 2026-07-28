import type {HomeNewsPopupCard} from '@/components/home/home-news-popups';
import type {NewsCard} from '@/components/news/news-journal-grid';
import type {SpecialtyCollectionItem} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
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
  blocks: NewsBodyBlock[];
  tags: string[];
  ctaTitle: string;
  ctaHref: string;
  seoTitle: string;
  seoDescription: string;
  ogImagePath: string;
};

export type NewsBodyBlock = {
  type: 'text' | 'imageFull' | 'imageText' | 'quote';
  title: string;
  body: string;
  image: string;
  layout: 'imageLeft' | 'imageRight';
  width: 'narrow' | 'standard' | 'wide';
  spacing: 'compact' | 'default' | 'loose';
};

export async function getNewsCardsForSite(locale: Locale): Promise<NewsCard[]> {
  const cmsItems = await readCmsValue(() => listPublicNews(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.map((item) => toNewsCard(item, locale));
  }

  return (await getLocaleMessages(locale)).news.grid.cards.map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export async function getHomeNewsCardsForSite(locale: Locale): Promise<HomeNewsPopupCard[]> {
  const cmsItems = await readCmsValue(() => listPublicNews(locale), []);

  if (cmsItems.length > 0) {
    return cmsItems.slice(0, 4).map((item) => ({
      ...toNewsCard(item, locale),
      body: typeof item.excerpt === 'string' ? item.excerpt : ''
    }));
  }

  return (await getLocaleMessages(locale)).news.grid.cards.slice(0, 4).map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export async function getNewsDetailForSite(locale: Locale, slug: string): Promise<PublicNewsDetail | null> {
  const cmsItem = await readCmsValue(() => getPublicNews(slug, locale), null);

  if (cmsItem) {
    const body = normalizeNewsBody(cmsItem.body);
    const card = toNewsCard(cmsItem, locale);

    return {
      card,
      blocks: body.blocks,
      tags: Array.isArray(cmsItem.tags) ? cmsItem.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      ctaTitle: body.ctaTitle,
      ctaHref: resolveCmsHref(locale, body.ctaHref, '/contact?type=other&source=news&item={slug}', {slug}),
      seoTitle: String(cmsItem.title || ''),
      seoDescription: String(cmsItem.excerpt || cmsItem.title || ''),
      ogImagePath: card.image
    };
  }

  const card = (await getLocaleMessages(locale)).news.grid.cards.find((item) => item.id === slug);

  if (!card) {
    return null;
  }

  return {
    card: {
      ...card,
      href: resolveCmsHref(locale, `/news/${card.id}`),
      hasImage: imageExists(card.image)
    },
    blocks: [],
    tags: [],
    ctaTitle: '',
    ctaHref: resolveCmsHref(locale, '/contact?type=other&source=news&item={slug}', undefined, {slug}),
    seoTitle: card.title,
    seoDescription: card.title,
    ogImagePath: card.image
  };
}

export async function getCollectionItemsForSite(locale: Locale): Promise<SpecialtyCollectionItem[]> {
  const cmsItems = await readCmsValue(() => listPublicCollections(locale), []);

  if (cmsItems.length === 0) {
    return [];
  }

  const categoryLabels = collectionCategoryLabels(await getLocaleMessages(locale));

  return cmsItems.map((item) => {
    const specs = normalizeCollectionSpecs(item.specs);
    const category = String(item.category);
    const story = String(item.story);
    const sportCategory = String(item.sportCategory);
    return {
      id: String(item.slug),
      href: resolveCmsHref(locale, `/mastery/creations/${String(item.slug)}`),
      title: String(item.title),
      caption: story,
      category,
      categoryLabel: categoryLabels.get(category) ?? category,
      sportCategory,
      sportCategoryLabel: String(item.sportCategoryLabel || sportCategory),
      year: specs.year,
      image: cmsImageName(item.imagePath),
      hasImage: imageExists(cmsImageName(item.imagePath))
    };
  });
}

export async function getCollectionItemForSite(locale: Locale, slug: string) {
  const cmsItem = await readCmsValue(() => getPublicCollection(slug, locale), null);

  if (cmsItem) {
    const specs = normalizeCollectionSpecs(cmsItem.specs);
    const image = cmsImageName(cmsItem.imagePath);
    const gallery = normalizeGallery(cmsItem.gallery, image);
    const category = String(cmsItem.category);
    const story = String(cmsItem.story);
    const sportCategory = String(cmsItem.sportCategory);
    const categoryLabels = collectionCategoryLabels(await getLocaleMessages(locale));

    return {
      id: String(cmsItem.slug),
      href: resolveCmsHref(locale, `/mastery/creations/${String(cmsItem.slug)}`),
      title: String(cmsItem.title),
      caption: story,
      story,
      category,
      categoryLabel: categoryLabels.get(category) ?? category,
      sportCategory,
      sportCategoryLabel: String(cmsItem.sportCategoryLabel || sportCategory),
      year: specs.year,
      image,
      gallery,
      hasImage: imageExists(image),
      seoTitle: String(cmsItem.title),
      seoDescription: story,
      ogImagePath: image,
      specs
    };
  }

  const item = (await getCollectionItemsForSite(locale)).find((entry) => entry.id === slug);

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
      year: item.year ?? ''
    }
  };
}

function collectionCategoryLabels(messages: Awaited<ReturnType<typeof getLocaleMessages>>) {
  return new Map(
    messages.specialtyPages.collection.gallery.filters.map((filter) => [filter.id, filter.label])
  );
}

function normalizeNewsBody(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      blocks: [],
      ctaTitle: '',
      ctaHref: ''
    };
  }

  const body = value as Record<string, unknown>;
  return {
    blocks: normalizeNewsBlocks(body.blocks),
    ctaTitle: typeof body.ctaTitle === 'string' ? body.ctaTitle : '',
    ctaHref: typeof body.ctaHref === 'string' ? body.ctaHref : ''
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? '';
}

function toNewsCard(item: Record<string, unknown>, locale: Locale): NewsCard {
  const image = cmsImageName(item.imagePath);

  return {
    id: String(item.slug),
    href: resolveCmsHref(locale, `/news/${String(item.slug)}`),
    category: String(item.category),
    categoryLabel: String(item.categoryLabel),
    date: String(item.publishedAt),
    title: String(item.title),
    image,
    mobileImage: cmsImageName(item.mobileImagePath),
    hasImage: imageExists(image)
  };
}

function normalizeNewsBlocks(value: unknown): NewsBodyBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const block = item as Record<string, unknown>;
      const type = newsBlockType(block.type);
      const title = firstString(block.title);
      const body = firstString(block.body);
      const image = cmsImageName(block.image);

      if (!title && !body && !image) {
        return null;
      }

      return {
        type,
        title,
        body,
        image,
        layout: newsBlockLayout(block.layout),
        width: newsBlockWidth(block.width),
        spacing: newsBlockSpacing(block.spacing)
      };
    })
    .filter((block): block is NewsBodyBlock => block !== null);
}

function newsBlockType(value: unknown): NewsBodyBlock['type'] {
  return value === 'imageFull' || value === 'imageText' || value === 'quote' ? value : 'text';
}

function newsBlockLayout(value: unknown): NewsBodyBlock['layout'] {
  return value === 'imageRight' ? 'imageRight' : 'imageLeft';
}

function newsBlockWidth(value: unknown): NewsBodyBlock['width'] {
  return value === 'narrow' || value === 'wide' ? value : 'standard';
}

function newsBlockSpacing(value: unknown): NewsBodyBlock['spacing'] {
  return value === 'compact' || value === 'loose' ? value : 'default';
}

function normalizeCollectionSpecs(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {
      year: ''
    };
  }

  const specs = value as Record<string, unknown>;
  return {
    year: typeof specs.year === 'string' ? specs.year : ''
  };
}

function normalizeGallery(value: unknown, fallbackImage: string) {
  const images = normalizeCollectionImageArray(value);

  return images.length > 0 ? images : [fallbackImage].filter(Boolean);
}

function normalizeCollectionImageArray(value: unknown) {
  return Array.isArray(value)
    ? value
      .filter((image): image is string => typeof image === 'string' && image.length > 0)
      .map(cmsImageName)
      .filter(Boolean)
    : [];
}

function cmsImageName(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const imagePath = value.trim().split(/[?#]/)[0]?.replace(/\\/g, '/') ?? '';

  if (!imagePath) {
    return '';
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
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
