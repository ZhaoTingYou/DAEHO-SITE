import {z} from 'zod';

import {locales} from '@/lib/locales';

export const localeSchema = z.enum(locales);

const optionalText = z.string().trim().optional().default('');
const optionalJson = z.unknown().optional().default({});
const optionalJsonArray = z.array(z.unknown()).optional().default([]);
const inquiryName = z.string().trim().min(1).max(120);
const inquiryContact = z.string().trim().max(180).optional().default('');
const inquiryEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'Expected a valid email address.'
  })
  .optional()
  .default('');
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
  tags: z.array(z.string().trim()).optional().default([])
});

export const newsPayloadSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1),
  imagePath: optionalText,
  mobileImagePath: optionalText,
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
  story: optionalText,
  sportCategoryLabel: optionalText
});

export const collectionPayloadSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  category: z.enum(['champion', 'bespoke']),
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

const contactFields = {
  phone: inquiryContact,
  contact: inquiryContact,
  email: inquiryEmail
};

function requireEmailOrPhone(
  value: {phone?: string; contact?: string; email?: string},
  context: z.RefinementCtx
) {
  if (!value.phone?.trim() && !value.contact?.trim() && !value.email?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contact'],
      message: 'Expected at least one email address or phone number.'
    });
  }
}

export const contactInquirySchema = z
  .object({
    locale: localeSchema.optional().default('ko'),
    name: inquiryName,
    organization: inquiryShortText,
    ...contactFields,
    type: inquiryShortText,
    message: inquiryLongText,
    pagePath: inquiryMediumText,
    website: inquiryHoneypot
  })
  .superRefine(requireEmailOrPhone);

export const golfInquirySchema = z
  .object({
    locale: localeSchema.optional().default('ko'),
    name: inquiryName,
    ...contactFields,
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
  })
  .superRefine(requireEmailOrPhone);

export const inquiryStatusCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]{0,31}$/, 'Use lowercase letters, numbers, and underscores.');

export const inquiryStatusSchema = z.object({
  status: inquiryStatusCodeSchema,
  expectedStatus: inquiryStatusCodeSchema.optional()
});

export const inquiryStatusDefinitionSchema = z.object({
  code: inquiryStatusCodeSchema,
  labelKo: z.string().trim().min(1).max(80),
  labelEn: z.string().trim().max(80).default(''),
  labelZh: z.string().trim().max(80).default(''),
  color: z.enum(['slate', 'blue', 'amber', 'green', 'red', 'purple']).default('slate'),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true)
});

export const inquiryStatusDefinitionUpdateSchema = inquiryStatusDefinitionSchema
  .omit({code: true})
  .extend({expectedUpdatedAt: z.string().trim().datetime()});

export const notificationSettingsSchema = z
  .object({
    internalEmail: inquiryEmail,
    internalEmailEnabled: z.boolean(),
    customerEmailEnabled: z.boolean(),
    kakaoEnabled: z.boolean(),
    telegramEnabled: z.boolean(),
    telegramBotToken: z.string().trim().max(512).default(''),
    telegramChatId: z.string().trim().max(80).default(''),
    telegramMessageThreadId: z.string().trim().max(10).refine(
      (value) => value === '' || (/^[1-9]\d*$/.test(value) && Number(value) <= 2_147_483_647),
      'Telegram Topic ID must be a positive integer or left blank for General.'
    ).default(''),
    clearTelegramBotToken: z.boolean().default(false)
  })
  .superRefine((value, context) => {
    if (value.internalEmailEnabled && !value.internalEmail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalEmail'],
        message: 'Internal email is required when internal notifications are enabled.'
      });
    }
    if (value.telegramEnabled && !value.telegramChatId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telegramChatId'],
        message: 'Telegram Chat ID is required when Telegram notifications are enabled.'
      });
    }
  });

export const notificationTemplateSchema = z
  .object({
    subject: z.string().trim().max(300),
    body: z.string().trim().max(4000),
    providerTemplateCode: z.string().trim().max(160),
    kakaoTemplateType: z.enum(['basic', 'highlight']),
    approvalStatus: z.enum(['draft', 'pending', 'approved']),
    isActive: z.boolean()
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
