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
      body: ''
    }));
  }

  return (await getLocaleMessages(locale)).news.grid.cards.slice(0, 4).map((card) => ({
    ...card,
    hasImage: imageExists(card.image)
  }));
}

export async function getNewsDetailForSite(locale: Locale, slug: string): Promise<PublicNewsDetail | null> {
  const text = (await getLocaleMessages(locale)).newsUi.detail;
  const cmsItem = await readCmsValue(() => getPublicNews(slug, locale), null);

  if (cmsItem) {
    const body = normalizeNewsBody(cmsItem.body);
    const card = toNewsCard(cmsItem, locale);

    return {
      card,
      blocks: body.blocks,
      tags: Array.isArray(cmsItem.tags) && cmsItem.tags.length > 0 ? cmsItem.tags.filter((tag): tag is string => typeof tag === 'string') : text.tags,
      ctaTitle: body.ctaTitle,
      ctaHref: resolveCmsHref(locale, body.ctaHref, text.ctaHref, {slug}),
      seoTitle: String(cmsItem.seoTitle || cmsItem.title || ''),
      seoDescription: String(cmsItem.seoDescription || body.lead || cmsItem.excerpt || ''),
      ogImagePath: cmsImageName(cmsItem.ogImagePath || card.image)
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
    ctaHref: resolveCmsHref(locale, text.ctaHref, '/contact?type=other&source=news&item={slug}', {slug}),
    seoTitle: card.title,
    seoDescription: card.title,
    ogImagePath: card.image
  };
}

export async function getCollectionItemsForSite(locale: Locale): Promise<SpecialtyCollectionItem[]> {
  const cmsItems = await readCmsValue(() => listPublicCollections(locale), []);
  const messages = await getLocaleMessages(locale);

  return cmsItems.length > 0
    ? cmsItems.map((item) => {
        const specs = normalizeCollectionSpecs(item.specs);
        return {
          id: String(item.slug),
          href: resolveCmsHref(locale, specs.linkHref, `/mastery/creations/${String(item.slug)}`),
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
      })
    : messages.specialtyPages.collection.gallery.items.map((item) => ({
        ...item,
        href: resolveCmsHref(locale, `/mastery/creations/${item.id}`),
        hasImage: imageExists(item.image)
      }));
}

export async function getCollectionItemForSite(locale: Locale, slug: string) {
  const cmsItem = await readCmsValue(() => getPublicCollection(slug, locale), null);

  if (cmsItem) {
    const specs = normalizeCollectionSpecs(cmsItem.specs);
    const image = cmsImageName(cmsItem.imagePath);
    const ogImage = cmsImageName(cmsItem.ogImagePath || cmsItem.imagePath);
    const gallery = normalizeGallery(cmsItem.gallery, image);

    return {
      id: String(cmsItem.slug),
      href: resolveCmsHref(locale, specs.linkHref, `/mastery/creations/${String(cmsItem.slug)}`),
      title: String(cmsItem.title),
      caption: String(cmsItem.caption),
      story: String(cmsItem.story),
      category: String(cmsItem.category),
      categoryLabel: String(cmsItem.categoryLabel),
      sportCategory: String(cmsItem.sportCategory || specs.sportCategory),
      sportCategoryLabel: String(cmsItem.sportCategoryLabel),
      year: specs.year,
      image,
      gallery,
      detailImages: normalizeCollectionDetailImages(specs.detailImages),
      hasImage: imageExists(image),
      seoTitle: String(cmsItem.seoTitle || cmsItem.title || ''),
      seoDescription: String(cmsItem.seoDescription || cmsItem.caption || ''),
      ogImagePath: ogImage,
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
    detailImages: [],
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
      blocks: [],
      quote: '',
      ctaTitle: '',
      ctaHref: '',
      linkHref: ''
    };
  }

  const body = value as Record<string, unknown>;
  return {
    lead: typeof body.lead === 'string' ? body.lead : '',
    paragraphs: Array.isArray(body.paragraphs)
      ? body.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === 'string')
      : [],
    blocks: normalizeNewsBlocks(body.blocks),
    quote: typeof body.quote === 'string' ? body.quote : '',
    ctaTitle: typeof body.ctaTitle === 'string' ? body.ctaTitle : '',
    ctaHref: typeof body.ctaHref === 'string' ? body.ctaHref : '',
    linkHref: typeof body.linkHref === 'string' ? body.linkHref : ''
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? '';
}

function toNewsCard(item: Record<string, unknown>, locale: Locale): NewsCard {
  const image = cmsImageName(item.imagePath);
  const body = normalizeNewsBody(item.body);

  return {
    id: String(item.slug),
    href: resolveCmsHref(locale, body.linkHref, `/news/${String(item.slug)}`),
    category: String(item.category),
    categoryLabel: String(item.categoryLabel),
    date: String(item.publishedAt),
    title: String(item.title),
    image,
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
      year: '',
      sportCategory: '',
      linkHref: '',
      detailImages: []
    };
  }

  const specs = value as Record<string, unknown>;
  return {
    year: typeof specs.year === 'string' ? specs.year : '',
    sportCategory: typeof specs.sportCategory === 'string' ? specs.sportCategory : '',
    linkHref: typeof specs.linkHref === 'string' ? specs.linkHref : '',
    detailImages: normalizeCollectionDetailImages(specs.detailImages)
  };
}

function normalizeCollectionDetailImages(value: unknown) {
  return normalizeCollectionImageArray(value).slice(0, 3);
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
