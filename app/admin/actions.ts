'use server';

import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {revalidatePath} from 'next/cache';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';

import {
  assertAdminSession,
  clearAdminLoginFailures,
  clearAdminSession,
  createAdminSession,
  isAdminLoginRateLimited,
  recordFailedAdminLogin,
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
import {isAllowedImageUpload as isAllowedCmsImageUpload} from '@/lib/cms/upload-policy';
import {
  cloneJson,
  createPageContentPayload,
  getEditableLeaves,
  getManagedPageDefinition,
  getPageContentGroups,
  isImageEditableField,
  setObjectValueAtPath,
  type PageDefinition,
} from '@/lib/cms/page-catalog';
import {locales, type Locale} from '@/lib/locales';

export async function loginAction(formData: FormData) {
  const password = stringFromForm(formData, 'password');
  const attemptKey = await getAdminLoginAttemptKey();

  if (isAdminLoginRateLimited(attemptKey)) {
    redirect('/admin/login?error=rate');
  }

  if (!validateAdminPassword(password)) {
    recordFailedAdminLogin(attemptKey);
    redirect('/admin/login?error=1');
  }

  clearAdminLoginFailures(attemptKey);
  await createAdminSession();
  redirect('/admin');
}

export async function logoutAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function updateInquiryStatusAction(formData: FormData) {
  await assertAdminSession();

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
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const inquiry = id ? getInquiry(id) : null;

  if (inquiry) {
    await notifyInquiry(inquiry);
    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
  }
}

export async function saveNewsAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const editorPath = `/admin/news/${id || 'new'}`;
  const imagePath = await readUploadedImageOrText(formData, 'imagePath', 'imageUpload', 'ko', editorPath);
  const payload = newsPayloadSchema.parse({
    slug: stringFromForm(formData, 'slug'),
    category: stringFromForm(formData, 'category'),
    imagePath,
    publishedAt: stringFromForm(formData, 'publishedAt'),
    isFeatured: formData.get('isFeatured') === 'on',
    isVisible: formData.get('isVisible') !== 'off',
    sortOrder: stringFromForm(formData, 'sortOrder') || '0',
    translations: {
      ko: await readNewsTranslation(formData, 'ko', editorPath),
      en: await readNewsTranslation(formData, 'en', editorPath)
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
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteNews(id);
  }

  revalidatePath('/admin/news');
}

export async function saveCollectionAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const editorPath = `/admin/collections/${id || 'new'}`;
  const imagePath = await readUploadedImageOrText(formData, 'imagePath', 'imageUpload', 'ko', editorPath);
  const gallery = await readGalleryImages(formData, imagePath, editorPath);
  const payload = collectionPayloadSchema.parse({
    slug: stringFromForm(formData, 'slug'),
    category: stringFromForm(formData, 'category'),
    sportCategory: stringFromForm(formData, 'sportCategory'),
    imagePath,
    gallery,
    specs: {
      year: stringFromForm(formData, 'specs.year'),
      sportCategory: stringFromForm(formData, 'specs.sportCategory')
    },
    isVisible: formData.get('isVisible') !== 'off',
    sortOrder: stringFromForm(formData, 'sortOrder') || '0',
    translations: {
      ko: await readCollectionTranslation(formData, 'ko', editorPath),
      en: await readCollectionTranslation(formData, 'en', editorPath)
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
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteCollection(id);
  }

  revalidatePath('/admin/collections');
}

export async function savePageAction(formData: FormData) {
  await assertAdminSession();

  const pageKey = stringFromForm(formData, 'pageKey');
  const definition = getManagedPageDefinition(pageKey);
  const pageEditorPath = `/admin/pages/${encodeURIComponent(pageKey)}`;
  const payload = pagePayloadSchema.parse({
    section: stringFromForm(formData, 'section') || definition?.section || 'site',
    sortOrder: stringFromForm(formData, 'sortOrder') || definition?.sortOrder || '0',
    content: {
      ko: await readPageLocaleContent(formData, 'ko', pageEditorPath, definition),
      en: await readPageLocaleContent(formData, 'en', pageEditorPath, definition)
    },
    seo: {
      ko: await readPageLocaleSeo(formData, 'ko', pageEditorPath),
      en: await readPageLocaleSeo(formData, 'en', pageEditorPath)
    }
  });

  if (pageKey) {
    upsertPage(pageKey, payload);
  }

  revalidatePath('/admin/pages');
  revalidatePath(`/admin/pages/${pageKey}`);

  if (definition?.href) {
    for (const locale of locales) {
      revalidatePath(`/${locale}${definition.href === '/' ? '' : definition.href}`);
    }
  }

  redirect('/admin/pages');
}

export async function uploadMediaAction(formData: FormData) {
  await assertAdminSession();

  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    redirect('/admin/media?error=file');
  }

  if (!isAllowedImageUpload(file)) {
    redirect('/admin/media?error=file');
  }

  await savePublicImage(file, {
    altKo: stringFromForm(formData, 'altKo'),
    altEn: stringFromForm(formData, 'altEn')
  });

  revalidatePath('/admin/media');
  redirect('/admin/media');
}

export async function updateMediaAction(formData: FormData) {
  await assertAdminSession();

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
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');

  if (id) {
    deleteMedia(id);
  }

  revalidatePath('/admin/media');
}

async function readNewsTranslation(formData: FormData, locale: Locale, editorPath: string) {
  return {
    title: stringFromForm(formData, `${locale}.title`),
    categoryLabel: stringFromForm(formData, `${locale}.categoryLabel`),
    excerpt: stringFromForm(formData, `${locale}.excerpt`),
    body: {
      lead: stringFromForm(formData, `${locale}.body.lead`),
      paragraphs: parseParagraphs(stringFromForm(formData, `${locale}.body.paragraphs`)),
      quote: stringFromForm(formData, `${locale}.body.quote`),
      ctaTitle: stringFromForm(formData, `${locale}.body.ctaTitle`)
    },
    tags: parseTags(stringFromForm(formData, `${locale}.tags`)),
    seoTitle: stringFromForm(formData, `${locale}.seoTitle`),
    seoDescription: stringFromForm(formData, `${locale}.seoDescription`),
    ogImagePath: await readUploadedImageOrText(formData, `${locale}.ogImagePath`, `${locale}.ogImageUpload`, locale, editorPath)
  };
}

async function readCollectionTranslation(formData: FormData, locale: Locale, editorPath: string) {
  return {
    title: stringFromForm(formData, `${locale}.title`),
    caption: stringFromForm(formData, `${locale}.caption`),
    story: stringFromForm(formData, `${locale}.story`),
    categoryLabel: stringFromForm(formData, `${locale}.categoryLabel`),
    sportCategoryLabel: stringFromForm(formData, `${locale}.sportCategoryLabel`),
    seoTitle: stringFromForm(formData, `${locale}.seoTitle`),
    seoDescription: stringFromForm(formData, `${locale}.seoDescription`),
    ogImagePath: await readUploadedImageOrText(formData, `${locale}.ogImagePath`, `${locale}.ogImageUpload`, locale, editorPath)
  };
}

async function readGalleryImages(formData: FormData, fallbackImage: string, editorPath: string) {
  const images: string[] = [];

  for (let index = 0; index < 6; index += 1) {
    const image = await readUploadedImageOrText(
      formData,
      `gallery.${index}`,
      `galleryUpload.${index}`,
      'ko',
      editorPath
    );

    if (image) {
      images.push(image);
    }
  }

  return images.length > 0 ? images : [fallbackImage].filter(Boolean);
}

async function readPageLocaleContent(
  formData: FormData,
  locale: Locale,
  pageEditorPath: string,
  definition: PageDefinition | null
) {
  const suffix = locale === 'ko' ? 'Ko' : 'En';
  const groups = definition ? getPageContentGroups(definition) : [{key: 'main', title: '', sourcePath: ''}];
  const nextGroups: Record<string, Record<string, unknown>> = {};

  for (const group of groups) {
    const content = parseJsonField(formData, `content${suffix}.${group.key}`, {}) as Record<string, unknown>;
    const nextContent = cloneJson(content);

    for (const leaf of getEditableLeaves(content)) {
      const formKey = contentFieldFormKey(locale, group.key, leaf.path);

      if (!formData.has(formKey)) {
        if (leaf.valueType === 'boolean') {
          setObjectValueAtPath(nextContent, leaf.path, false);
        }
        continue;
      }

      setObjectValueAtPath(
        nextContent,
        leaf.path,
        await readPageFieldValue(formData, formKey, {
          groupKey: group.key,
          path: leaf.path,
          value: leaf.value,
          valueType: leaf.valueType,
          locale,
          pageEditorPath
        })
      );
    }

    nextGroups[group.key] = nextContent;
  }

  if (!definition) {
    return nextGroups.main ?? {};
  }

  return createPageContentPayload(definition, nextGroups);
}

async function readPageLocaleSeo(formData: FormData, locale: Locale, pageEditorPath: string) {
  const suffix = locale === 'ko' ? 'Ko' : 'En';
  const seo = parseJsonField(formData, `seo${suffix}`, {}) as Record<string, unknown>;
  const nextSeo = cloneJson(seo);

  for (const field of ['title', 'description', 'ogImagePath']) {
    const key = `seoField.${locale}.${field}`;

    if (formData.has(key)) {
      setObjectValueAtPath(nextSeo, field, stringFromForm(formData, key));
    }
  }

  const uploadedOgImage = await readUploadedImageFilename(formData, `seoImage.${locale}.ogImagePath`, locale, pageEditorPath);

  if (uploadedOgImage) {
    setObjectValueAtPath(nextSeo, 'ogImagePath', uploadedOgImage);
  }

  return nextSeo;
}

async function readPageFieldValue(formData: FormData, formKey: string, field: {
  groupKey: string;
  path: string;
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'empty';
  locale: Locale;
  pageEditorPath: string;
}) {
  if (isImageEditableField(field.path, field.value)) {
    const uploadedImage = await readUploadedImageFilename(
      formData,
      contentImageFormKey(field.locale, field.groupKey, field.path),
      field.locale,
      field.pageEditorPath
    );

    if (uploadedImage) {
      return uploadedImage;
    }
  }

  const rawValue = stringFromForm(formData, formKey);

  if (field.valueType === 'number') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : field.value;
  }

  if (field.valueType === 'boolean') {
    return formData.get(formKey) === 'on';
  }

  return rawValue;
}

function contentFieldFormKey(locale: Locale, groupKey: string, pathValue: string) {
  return `contentField.${locale}.${groupKey}.${pathValue}`;
}

function contentImageFormKey(locale: Locale, groupKey: string, pathValue: string) {
  return `contentImage.${locale}.${groupKey}.${pathValue}`;
}

async function readUploadedImageFilename(
  formData: FormData,
  formKey: string,
  locale: Locale,
  pageEditorPath: string
) {
  const file = formData.get(formKey);

  if (!(file instanceof File) || file.size === 0) {
    return '';
  }

  if (!isAllowedImageUpload(file)) {
    redirect(`${pageEditorPath}?error=file`);
  }

  const media = await savePublicImage(file, {
    altKo: locale === 'ko' ? createImageAltFromFilename(file.name) : '',
    altEn: locale === 'en' ? createImageAltFromFilename(file.name) : ''
  });

  return media.filename;
}

async function readUploadedImageOrText(
  formData: FormData,
  textKey: string,
  fileKey: string,
  locale: Locale,
  errorPath: string
) {
  const uploadedImage = await readUploadedImageFilename(formData, fileKey, locale, errorPath);

  return uploadedImage || stringFromForm(formData, textKey);
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

function parseParagraphs(value: string) {
  return value
    .split(/\n\s*\n|\n/)
    .map((paragraph) => paragraph.trim())
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

async function savePublicImage(file: File, alt: {altKo?: string; altEn?: string}) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = createPublicFilename(file.name);
  const diskPath = path.join(process.cwd(), 'public', 'images', filename);
  await writeFile(diskPath, bytes);

  return createMedia({
    filename,
    path: `public/images/${filename}`,
    url: `/images/${filename}`,
    mimeType: file.type,
    sizeBytes: bytes.length,
    altKo: alt.altKo ?? '',
    altEn: alt.altEn ?? '',
    storageProvider: 'public',
    storageKey: filename
  });
}

function createImageAltFromFilename(filename: string) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .trim();
}

function isAllowedImageUpload(file: File) {
  return isAllowedCmsImageUpload(file);
}

async function getAdminLoginAttemptKey() {
  const headerStore = await headers();
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    'local'
  );
}
