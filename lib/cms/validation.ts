import {z} from 'zod';

import {locales} from '@/lib/locales';

export const localeSchema = z.enum(locales);

const optionalText = z.string().trim().optional().default('');
const optionalJson = z.unknown().optional().default({});
const optionalJsonArray = z.array(z.unknown()).optional().default([]);
const inquiryName = z.string().trim().min(1).max(120);
const inquiryContact = z.string().trim().min(1).max(180);
const inquiryShortText = z.string().trim().max(160).optional().default('');
const inquiryMediumText = z.string().trim().max(300).optional().default('');
const inquiryLongText = z.string().trim().max(3000).optional().default('');
const inquiryHoneypot = z.string().trim().max(240).optional().default('');

export const pagePayloadSchema = z.object({
  pageKey: z.string().trim().min(1).optional(),
  section: z.string().trim().min(1).optional().default('site'),
  sortOrder: z.coerce.number().int().optional().default(0),
  content: z
    .object({
      ko: z.unknown().optional(),
      en: z.unknown().optional()
    })
    .optional(),
  seo: z
    .object({
      ko: z.unknown().optional(),
      en: z.unknown().optional()
    })
    .optional()
});

const newsTranslationSchema = z.object({
  title: z.string().trim().min(1),
  categoryLabel: optionalText,
  excerpt: optionalText,
  body: optionalJson,
  tags: z.array(z.string().trim()).optional().default([]),
  seoTitle: optionalText,
  seoDescription: optionalText,
  ogImagePath: optionalText
});

export const newsPayloadSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1),
  imagePath: optionalText,
  publishedAt: optionalText,
  isFeatured: z.coerce.boolean().optional().default(false),
  isVisible: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
  translations: z
    .object({
      ko: newsTranslationSchema.optional(),
      en: newsTranslationSchema.optional()
    })
    .optional()
    .default({})
});

const collectionTranslationSchema = z.object({
  title: z.string().trim().min(1),
  caption: optionalText,
  story: optionalText,
  categoryLabel: optionalText,
  sportCategoryLabel: optionalText,
  seoTitle: optionalText,
  seoDescription: optionalText,
  ogImagePath: optionalText
});

export const collectionPayloadSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1),
  sportCategory: optionalText,
  imagePath: optionalText,
  gallery: optionalJsonArray,
  specs: optionalJson,
  isVisible: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
  translations: z
    .object({
      ko: collectionTranslationSchema.optional(),
      en: collectionTranslationSchema.optional()
    })
    .optional()
    .default({})
});

export const contactInquirySchema = z.object({
  locale: localeSchema.optional().default('ko'),
  name: inquiryName,
  organization: inquiryShortText,
  contact: inquiryContact,
  type: inquiryShortText,
  message: inquiryLongText,
  pagePath: inquiryMediumText,
  website: inquiryHoneypot
});

export const golfInquirySchema = z.object({
  locale: localeSchema.optional().default('ko'),
  name: inquiryName,
  contact: inquiryContact,
  quantity: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().positive().max(10000).optional()
  ),
  due: inquiryShortText,
  team: inquiryShortText,
  use: inquiryShortText,
  message: inquiryLongText,
  selectedHead: inquiryShortText,
  selectedShaft: inquiryShortText,
  selectedStyle: inquiryShortText,
  engravingSample: inquiryMediumText,
  pagePath: inquiryMediumText,
  website: inquiryHoneypot
});

export const inquiryStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'in_progress', 'done', 'spam'])
});

export const mediaPayloadSchema = z.object({
  filename: z.string().trim().min(1),
  path: z.string().trim().min(1),
  url: z.string().trim().min(1),
  mimeType: optionalText,
  sizeBytes: z.coerce.number().int().nonnegative().optional().default(0),
  altKo: optionalText,
  altEn: optionalText,
  storageProvider: z.string().trim().min(1).optional().default('public'),
  storageKey: optionalText
});

export const mediaUpdateSchema = z.object({
  altKo: optionalText,
  altEn: optionalText
});
