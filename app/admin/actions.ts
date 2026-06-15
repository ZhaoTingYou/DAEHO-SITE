'use server';

import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {
  clearAdminSession,
  createAdminSession,
  validateAdminPassword
} from '@/lib/cms/admin-session';
import {
  createCollection,
  createMedia,
  createNews,
  deleteCollection,
  deleteMedia,
  deleteNews,
  getInquiry,
  updateCollection,
  updateInquiryStatus,
  updateMedia,
  updateNews,
  upsertPage
} from '@/lib/cms/repositories';
import {notifyInquiry} from '@/lib/cms/email';
import {
  collectionPayloadSchema,
  inquiryStatusSchema,
  mediaUpdateSchema,
  newsPayloadSchema,
  pagePayloadSchema
} from '@/lib/cms/validation';
import type {Locale} from '@/lib/locales';

export async function loginAction(formData: FormData) {
  const password = stringFromForm(formData, 'password');

  if (!validateAdminPassword(password)) {
    redirect('/admin/login?error=1');
  }

  await createAdminSession();
  redirect('/admin');
}

export async function logoutAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function updateInquiryStatusAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');
  const parsed = inquiryStatusSchema.safeParse({
    status: stringFromForm(formData, 'status')
  });

  if (id && parsed.success) {
    updateInquiryStatus(id, parsed.data);
  }

  revalidatePath('/admin/inquiries');
  if (id) {
    revalidatePath(`/admin/inquiries/${id}`);
  }
}

export async function resendInquiryNotificationAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');
  const inquiry = id ? getInquiry(id) : null;

  if (inquiry) {
    await notifyInquiry(inquiry);
    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
  }
}

export async function saveNewsAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');
  const payload = newsPayloadSchema.parse({
    slug: stringFromForm(formData, 'slug'),
    category: stringFromForm(formData, 'category'),
    imagePath: stringFromForm(formData, 'imagePath'),
    publishedAt: stringFromForm(formData, 'publishedAt'),
    isFeatured: formData.get('isFeatured') === 'on',
    isVisible: formData.get('isVisible') !== 'off',
    sortOrder: stringFromForm(formData, 'sortOrder') || '0',
    translations: {
      ko: readNewsTranslation(formData, 'ko'),
      en: readNewsTranslation(formData, 'en')
    }
  });

  if (id) {
    updateNews(id, payload);
  } else {
    createNews(payload);
  }

  revalidatePath('/admin/news');
  redirect('/admin/news');
}

export async function deleteNewsAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteNews(id);
  }

  revalidatePath('/admin/news');
}

export async function saveCollectionAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');
  const payload = collectionPayloadSchema.parse({
    slug: stringFromForm(formData, 'slug'),
    category: stringFromForm(formData, 'category'),
    sportCategory: stringFromForm(formData, 'sportCategory'),
    imagePath: stringFromForm(formData, 'imagePath'),
    gallery: parseJsonField(formData, 'gallery', []),
    specs: parseJsonField(formData, 'specs', {}),
    isVisible: formData.get('isVisible') !== 'off',
    sortOrder: stringFromForm(formData, 'sortOrder') || '0',
    translations: {
      ko: readCollectionTranslation(formData, 'ko'),
      en: readCollectionTranslation(formData, 'en')
    }
  });

  if (id) {
    updateCollection(id, payload);
  } else {
    createCollection(payload);
  }

  revalidatePath('/admin/collections');
  redirect('/admin/collections');
}

export async function deleteCollectionAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteCollection(id);
  }

  revalidatePath('/admin/collections');
}

export async function savePageAction(formData: FormData) {
  const pageKey = stringFromForm(formData, 'pageKey');
  const payload = pagePayloadSchema.parse({
    section: stringFromForm(formData, 'section'),
    sortOrder: stringFromForm(formData, 'sortOrder') || '0',
    content: {
      ko: parseJsonField(formData, 'contentKo', {}),
      en: parseJsonField(formData, 'contentEn', {})
    },
    seo: {
      ko: parseJsonField(formData, 'seoKo', {}),
      en: parseJsonField(formData, 'seoEn', {})
    }
  });

  if (pageKey) {
    upsertPage(pageKey, payload);
  }

  revalidatePath('/admin/pages');
  redirect('/admin/pages');
}

export async function uploadMediaAction(formData: FormData) {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    redirect('/admin/media?error=file');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = createPublicFilename(file.name);
  const diskPath = path.join(process.cwd(), 'public', 'images', filename);
  await writeFile(diskPath, bytes);

  createMedia({
    filename,
    path: `public/images/${filename}`,
    url: `/images/${filename}`,
    mimeType: file.type,
    sizeBytes: bytes.length,
    altKo: stringFromForm(formData, 'altKo'),
    altEn: stringFromForm(formData, 'altEn'),
    storageProvider: 'public',
    storageKey: filename
  });

  revalidatePath('/admin/media');
  redirect('/admin/media');
}

export async function updateMediaAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');
  const parsed = mediaUpdateSchema.safeParse({
    altKo: stringFromForm(formData, 'altKo'),
    altEn: stringFromForm(formData, 'altEn')
  });

  if (id && parsed.success) {
    updateMedia(id, parsed.data);
  }

  revalidatePath('/admin/media');
}

export async function deleteMediaAction(formData: FormData) {
  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteMedia(id);
  }

  revalidatePath('/admin/media');
}

function readNewsTranslation(formData: FormData, locale: Locale) {
  return {
    title: stringFromForm(formData, `${locale}.title`),
    categoryLabel: stringFromForm(formData, `${locale}.categoryLabel`),
    excerpt: stringFromForm(formData, `${locale}.excerpt`),
    body: parseJsonField(formData, `${locale}.body`, {}),
    tags: parseTags(stringFromForm(formData, `${locale}.tags`)),
    seoTitle: stringFromForm(formData, `${locale}.seoTitle`),
    seoDescription: stringFromForm(formData, `${locale}.seoDescription`),
    ogImagePath: stringFromForm(formData, `${locale}.ogImagePath`)
  };
}

function readCollectionTranslation(formData: FormData, locale: Locale) {
  return {
    title: stringFromForm(formData, `${locale}.title`),
    caption: stringFromForm(formData, `${locale}.caption`),
    story: stringFromForm(formData, `${locale}.story`),
    categoryLabel: stringFromForm(formData, `${locale}.categoryLabel`),
    sportCategoryLabel: stringFromForm(formData, `${locale}.sportCategoryLabel`),
    seoTitle: stringFromForm(formData, `${locale}.seoTitle`),
    seoDescription: stringFromForm(formData, `${locale}.seoDescription`),
    ogImagePath: stringFromForm(formData, `${locale}.ogImagePath`)
  };
}

function stringFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseJsonField(formData: FormData, key: string, fallback: unknown) {
  const value = stringFromForm(formData, key);

  if (!value) {
    return fallback;
  }

  return JSON.parse(value);
}

function createPublicFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path
    .basename(originalName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${baseName || 'asset'}-${randomUUID().slice(0, 8)}${extension}`;
}
