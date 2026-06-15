import {z} from 'zod';

export const localeSchema = z.enum(['ko', 'en']);

const optionalText = z.string().trim().optional().default('');
const optionalJson = z.unknown().optional().default({});
const optionalJsonArray = z.array(z.unknown()).optional().default([]);

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
  name: z.string().trim().min(1),
  organization: optionalText,
  contact: z.string().trim().min(1),
  type: optionalText,
  message: optionalText,
  pagePath: optionalText
});

export const golfInquirySchema = z.object({
  locale: localeSchema.optional().default('ko'),
  name: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  quantity: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  due: optionalText,
  team: optionalText,
  use: optionalText,
  message: optionalText,
  selectedHead: optionalText,
  selectedShaft: optionalText,
  engravingSample: optionalText,
  pagePath: optionalText
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
