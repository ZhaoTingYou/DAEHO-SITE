'use server';

import path from 'node:path';

import {revalidatePath} from 'next/cache';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';

import {
  assertAdminSession,
  clearAdminLoginFailures,
  clearAdminSession,
  createAdminSession,
  isAdminLoginRateLimited,
  recordFailedAdminLogin,
  verifyAdminPassword
} from '@/lib/cms/admin-session';
import {
  changeStoredAdminPassword,
  isCmsBackendPasswordError
} from '@/lib/cms/admin-password';
import {appendAdminActionError} from '@/lib/cms/admin-action-error';
import {
  createCollection,
  createNews,
  deleteCollection,
  deleteMedia,
  deleteNews,
  getCollection,
  getMedia,
  getInquiry,
  getNews,
  getPage,
  listCollections,
  listMedia,
  listNews,
  listPages,
  resendInquiryNotification,
  updateCollection,
  updateInquiryStatus,
  updateMedia,
  updateNews,
  uploadMediaFile,
  upsertPage
} from '@/lib/cms/repositories';
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
  getEditableLeavesForPageGroup,
  getManagedPageDefinition,
  managedPageDefinitions,
  getObjectValueAtPath,
  getPageFieldDefinitionsForGroup,
  getPageContentGroups,
  isImageEditableField,
  pageContentGroupsKey,
  setObjectValueAtPath,
  type PageDefinition,
} from '@/lib/cms/page-catalog';
import {getAdminI18n} from '@/lib/admin-i18n';
import type {TechniqueLocaleRecord} from '@/lib/cms/technique-records-core.mjs';
import {
  getExternalSiteValidationMessageKey,
  parseExternalSitesSubmission
} from '@/lib/cms/external-sites-core.mjs';
import {normalizeSubmittedTechniqueRecords} from '@/lib/cms/technique-records-submit-core.mjs';
import {locales, type Locale} from '@/lib/locales';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

const maxCollectionGalleryImages = 6;

export async function loginAction(formData: FormData) {
  const password = stringFromForm(formData, 'password');
  const attemptKey = await getAdminLoginAttemptKey();

  if (isAdminLoginRateLimited(attemptKey)) {
    redirect('/admin/login?error=rate');
  }

  const verification = await verifyAdminPassword(password);

  if (!verification.valid) {
    recordFailedAdminLogin(attemptKey);
    redirect('/admin/login?error=1');
  }

  clearAdminLoginFailures(attemptKey);
  await createAdminSession(verification.version);
  redirect('/admin');
}

export async function logoutAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function changeAdminPasswordAction(formData: FormData) {
  await assertAdminSession();

  const currentPassword = stringFromForm(formData, 'currentPassword');
  const newPassword = rawStringFromForm(formData, 'newPassword');
  const confirmPassword = rawStringFromForm(formData, 'confirmPassword');

  if (newPassword !== confirmPassword) {
    redirect('/admin/account?error=mismatch');
  }

  try {
    await changeStoredAdminPassword(currentPassword, newPassword);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (isCmsBackendPasswordError(error, 401)) {
      redirect('/admin/account?error=current');
    } else if (isCmsBackendPasswordError(error, 400)) {
      redirect('/admin/account?error=weak');
    } else {
      redirect('/admin/account?error=server');
    }
  }

  await clearAdminSession();
  redirect('/admin/login?status=password-updated');
}

export async function updateInquiryStatusAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const parsed = inquiryStatusSchema.safeParse({
    status: stringFromForm(formData, 'status')
  });

  if (id && parsed.success) {
    await updateInquiryStatus(id, parsed.data);
  }

  revalidatePath('/admin/inquiries');
  if (id) {
    revalidatePath(`/admin/inquiries/${id}`);
  }
}

export async function resendInquiryNotificationAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const inquiry = id ? await getInquiry(id) : null;

  if (inquiry) {
    await resendInquiryNotification(id);
    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
  }
}

export async function saveNewsAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const editorPath = `/admin/news/${id || 'new'}`;

  try {
    const previousNews = id ? await getNews(id) : null;
    const previousImages = collectImageFilenames(previousNews);
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

    const savedItem = id ? await updateNews(id, payload) : await createNews(payload);
    const nextEditorPath = savedItem?.id ? `/admin/news/${savedItem.id}` : editorPath;
    await cleanupRemovedImages(previousImages, collectImageFilenames(savedItem));

    revalidatePath('/admin/news');
    revalidatePath(nextEditorPath);
    revalidatePublicNewsPaths(previousNews, savedItem);
    redirect(nextEditorPath);
  } catch (error) {
    redirectWithAdminActionError(editorPath, error);
  }
}

export async function deleteNewsAction(formData: FormData) {
  await assertAdminSession();

  try {
    const id = stringFromForm(formData, 'id');
    const previousImages = collectImageFilenames(id ? await getNews(id) : null);

    if (id) {
      await deleteNews(id);
      await cleanupUnreferencedPublicImages(previousImages);
    }

    revalidatePath('/admin/news');
  } catch (error) {
    redirectWithAdminActionError('/admin/news', error);
  }
}

export async function saveCollectionAction(formData: FormData) {
  await assertAdminSession();

  const id = stringFromForm(formData, 'id');
  const editorPath = `/admin/collections/${id || 'new'}`;

  try {
    const previousImages = collectImageFilenames(id ? await getCollection(id) : null);
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
        sportCategory: stringFromForm(formData, 'specs.sportCategory'),
        linkHref: stringFromForm(formData, 'specs.linkHref')
      },
      isVisible: formData.get('isVisible') !== 'off',
      sortOrder: stringFromForm(formData, 'sortOrder') || '0',
      translations: {
        ko: await readCollectionTranslation(formData, 'ko', editorPath),
        en: await readCollectionTranslation(formData, 'en', editorPath)
      }
    });

    const savedItem = id ? await updateCollection(id, payload) : await createCollection(payload);
    const nextEditorPath = savedItem?.id ? `/admin/collections/${savedItem.id}` : editorPath;
    await cleanupRemovedImages(previousImages, collectImageFilenames(savedItem));

    revalidatePath('/admin/collections');
    revalidatePath(nextEditorPath);
    redirect(nextEditorPath);
  } catch (error) {
    redirectWithAdminActionError(editorPath, error);
  }
}

export async function deleteCollectionAction(formData: FormData) {
  await assertAdminSession();

  try {
    const id = stringFromForm(formData, 'id');
    const previousImages = collectImageFilenames(id ? await getCollection(id) : null);

    if (id) {
      await deleteCollection(id);
      await cleanupUnreferencedPublicImages(previousImages);
    }

    revalidatePath('/admin/collections');
  } catch (error) {
    redirectWithAdminActionError('/admin/collections', error);
  }
}

export async function savePageAction(formData: FormData) {
  await assertAdminSession();

  const pageKey = stringFromForm(formData, 'pageKey');
  const definition = getManagedPageDefinition(pageKey);
  const pageEditorPath = `/admin/pages/${encodeURIComponent(pageKey)}`;
  const returnTo = safeAdminReturnPath(stringFromForm(formData, 'returnTo')) ?? pageEditorPath;

  try {
    const previousImages = collectImageFilenames(pageKey ? await getPage(pageKey) : null);
    const sharedContentImages = await readSharedPageContentImageUploads(formData, returnTo);
    const sharedSeoImages = await readSharedPageSeoImageUploads(formData, returnTo);
    const contentKo = await readPageLocaleContent(formData, 'ko', returnTo, definition, sharedContentImages);
    const contentEn = await readPageLocaleContent(formData, 'en', returnTo, definition, sharedContentImages);

    if (pageKey === 'common' && formData.has('englishEnabled.present')) {
      const englishEnabled = formData.has('englishEnabled');
      const englishEnabledPath = `${pageContentGroupsKey}.main.features.englishEnabled`;
      setObjectValueAtPath(contentKo, englishEnabledPath, englishEnabled);
      setObjectValueAtPath(contentEn, englishEnabledPath, englishEnabled);
    }

    if (pageKey === 'common' && formData.has('externalSites.payload')) {
      const externalSites = parseExternalSitesSubmission(
        stringFromForm(formData, 'externalSites.payload')
      );
      const externalSitesPath = `${pageContentGroupsKey}.main.footer.externalSites.items`;
      setObjectValueAtPath(contentKo, externalSitesPath, externalSites.ko);
      setObjectValueAtPath(contentEn, externalSitesPath, externalSites.en);
    }

    if (pageKey === 'mastery-technique') {
      const normalizedRecords = normalizeSubmittedTechniqueRecords({
        koItems: techniqueLocaleRecords(getObjectValueAtPath(contentKo, 'records.items')),
        enItems: techniqueLocaleRecords(getObjectValueAtPath(contentEn, 'records.items')),
        submittedIds: stringFromForm(formData, 'techniqueRecords.ids'),
        submittedLength: stringFromForm(formData, 'techniqueRecords.length')
      });

      setObjectValueAtPath(contentKo, 'records.items', normalizedRecords.ko);
      setObjectValueAtPath(contentEn, 'records.items', normalizedRecords.en);
    }

    const payload = pagePayloadSchema.parse({
      section: stringFromForm(formData, 'section') || definition?.section || 'site',
      sortOrder: stringFromForm(formData, 'sortOrder') || definition?.sortOrder || '0',
      content: {
        ko: contentKo,
        en: contentEn
      },
      seo: {
        ko: await readPageLocaleSeo(formData, 'ko', returnTo, sharedSeoImages),
        en: await readPageLocaleSeo(formData, 'en', returnTo, sharedSeoImages)
      }
    });

    if (pageKey) {
      const savedPage = await upsertPage(pageKey, payload);
      await cleanupRemovedImages(previousImages, collectImageFilenames(savedPage));
    }

    revalidatePath('/admin/pages');
    revalidatePath(`/admin/pages/${pageKey}`);
    revalidatePath(returnTo);

    if (pageKey === 'common') {
      revalidateManagedPublicPaths();
    } else if (definition?.href) {
      for (const locale of locales) {
        revalidatePath(`/${locale}${definition.href === '/' ? '' : definition.href}`);
      }
    }

    redirect(returnTo);
  } catch (error) {
    const externalSiteErrorKey = getExternalSiteValidationMessageKey(error);

    if (externalSiteErrorKey) {
      const {t} = await getAdminI18n();
      redirectWithAdminActionError(returnTo, new Error(t(externalSiteErrorKey)));
    }

    redirectWithAdminActionError(returnTo, error);
  }
}

function techniqueLocaleRecords(value: unknown) {
  return Array.isArray(value) ? value as TechniqueLocaleRecord[] : [];
}

export async function uploadMediaAction(formData: FormData) {
  await assertAdminSession();

  try {
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
    }, stringFromForm(formData, 'filename'));

    revalidatePath('/admin/media');
    redirect('/admin/media');
  } catch (error) {
    redirectWithAdminActionError('/admin/media', error);
  }
}

export async function updateMediaAction(formData: FormData) {
  await assertAdminSession();

  try {
    const id = stringFromForm(formData, 'id');
    const parsed = mediaUpdateSchema.safeParse({
      altKo: stringFromForm(formData, 'altKo'),
      altEn: stringFromForm(formData, 'altEn')
    });

    if (id && parsed.success) {
      await updateMedia(id, parsed.data);
    }

    revalidatePath('/admin/media');
  } catch (error) {
    redirectWithAdminActionError('/admin/media', error);
  }
}

export async function deleteMediaAction(formData: FormData) {
  await assertAdminSession();

  try {
    const id = stringFromForm(formData, 'id');
    const media = id ? await getMedia(id) : null;
    const previousImages = collectImageFilenames(media);

    if (id) {
      await deleteMedia(id);
      await cleanupUnreferencedPublicImages(previousImages, {allowUnregistered: true});
    }

    revalidatePath('/admin/media');
  } catch (error) {
    redirectWithAdminActionError('/admin/media', error);
  }
}

async function readNewsTranslation(formData: FormData, locale: Locale, editorPath: string) {
  return {
    title: stringFromForm(formData, `${locale}.title`),
    categoryLabel: stringFromForm(formData, `${locale}.categoryLabel`),
    excerpt: stringFromForm(formData, `${locale}.excerpt`),
    body: {
      lead: stringFromForm(formData, `${locale}.body.lead`),
      paragraphs: parseParagraphs(stringFromForm(formData, `${locale}.body.paragraphs`)),
      blocks: await readNewsBlocks(formData, locale, editorPath),
      quote: stringFromForm(formData, `${locale}.body.quote`),
      ctaTitle: stringFromForm(formData, `${locale}.body.ctaTitle`),
      ctaHref: stringFromForm(formData, `${locale}.body.ctaHref`),
      linkHref: stringFromForm(formData, `${locale}.body.linkHref`)
    },
    tags: parseTags(stringFromForm(formData, `${locale}.tags`)),
    seoTitle: stringFromForm(formData, `${locale}.seoTitle`),
    seoDescription: stringFromForm(formData, `${locale}.seoDescription`),
    ogImagePath: await readUploadedImageOrText(formData, `${locale}.ogImagePath`, `${locale}.ogImageUpload`, locale, editorPath)
  };
}

async function readNewsBlocks(formData: FormData, locale: Locale, editorPath: string) {
  const indexes = new Set<number>();
  const prefix = `${locale}.body.blocks.`;

  for (const key of formData.keys()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const index = Number(key.slice(prefix.length).split('.')[0]);

    if (Number.isInteger(index) && index >= 0) {
      indexes.add(index);
    }
  }

  const blocks = [];

  for (const index of Array.from(indexes).sort((a, b) => a - b)) {
    const blockPrefix = `${prefix}${index}`;
    const type = newsBlockType(stringFromForm(formData, `${blockPrefix}.type`));
    const title = stringFromForm(formData, `${blockPrefix}.title`);
    const body = stringFromForm(formData, `${blockPrefix}.body`);
    const image = await readUploadedImageOrText(
      formData,
      `${blockPrefix}.image`,
      `${blockPrefix}.imageUpload`,
      locale,
      editorPath
    );

    if (!title && !body && !image) {
      continue;
    }

    blocks.push({
      type,
      title,
      body,
      image,
      layout: newsBlockLayout(stringFromForm(formData, `${blockPrefix}.layout`)),
      width: newsBlockWidth(stringFromForm(formData, `${blockPrefix}.width`)),
      spacing: newsBlockSpacing(stringFromForm(formData, `${blockPrefix}.spacing`))
    });
  }

  return blocks;
}

function newsBlockType(value: string) {
  return value === 'imageFull' || value === 'imageText' || value === 'quote' ? value : 'text';
}

function newsBlockLayout(value: string) {
  return value === 'imageRight' ? 'imageRight' : 'imageLeft';
}

function newsBlockWidth(value: string) {
  return value === 'narrow' || value === 'wide' ? value : 'standard';
}

function newsBlockSpacing(value: string) {
  return value === 'compact' || value === 'loose' ? value : 'default';
}

function revalidatePublicNewsPaths(previousNews: unknown, nextNews: unknown) {
  const slugs = new Set([newsItemSlug(previousNews), newsItemSlug(nextNews)].filter(isString));

  for (const locale of locales) {
    revalidatePath(`/${locale}/news`);

    for (const slug of slugs) {
      revalidatePath(`/${locale}/news/${slug}`);
    }
  }
}

function newsItemSlug(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const slug = (value as {slug?: unknown}).slug;
  return typeof slug === 'string' && slug.trim() ? slug.trim() : null;
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

  for (const index of collectionGalleryIndexes(formData).slice(0, maxCollectionGalleryImages)) {
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

function collectionGalleryIndexes(formData: FormData) {
  return collectionImageIndexes(formData, /^gallery(?:Upload)?\.(\d+)$/);
}

function collectionImageIndexes(formData: FormData, pattern: RegExp) {
  const indexes = new Set<number>();

  for (const key of formData.keys()) {
    const match = key.match(pattern);
    const index = match ? Number(match[1]) : NaN;

    if (Number.isInteger(index) && index >= 0) {
      indexes.add(index);
    }
  }

  return [...indexes].sort((left, right) => left - right);
}

type SharedImageUploads = Map<string, string>;

async function readPageLocaleContent(
  formData: FormData,
  locale: Locale,
  pageEditorPath: string,
  definition: PageDefinition | null,
  sharedContentImages: SharedImageUploads
) {
  const suffix = locale === 'ko' ? 'Ko' : 'En';
  const groups = definition ? getPageContentGroups(definition) : [{key: 'main', title: '', sourcePath: ''}];
  const nextGroups: Record<string, Record<string, unknown>> = {};

  for (const group of groups) {
    const content = parseJsonField(formData, `content${suffix}.${group.key}`, {}) as Record<string, unknown>;
    const nextContent = cloneJson(content);

    const editableLeaves = definition
      ? getEditableLeavesForPageGroup(definition, group.key, content)
      : getEditableLeaves(content);

    for (const leaf of editableLeaves) {
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
          isImage: leaf.isImage,
          locale,
          pageEditorPath,
          sharedContentImages
        })
      );
    }

    if (definition) {
      applyAppendablePageArrayFields(
        formData,
        locale,
        group.key,
        nextContent,
        definition,
        sharedContentImages
      );
    }

    nextGroups[group.key] = nextContent;
  }

  if (!definition) {
    return nextGroups.main ?? {};
  }

  return createPageContentPayload(definition, nextGroups);
}

async function readPageLocaleSeo(
  formData: FormData,
  locale: Locale,
  pageEditorPath: string,
  sharedSeoImages: SharedImageUploads
) {
  const suffix = locale === 'ko' ? 'Ko' : 'En';
  const seo = parseJsonField(formData, `seo${suffix}`, {}) as Record<string, unknown>;
  const nextSeo = cloneJson(seo);

  for (const field of ['title', 'description', 'ogImagePath']) {
    const key = `seoField.${locale}.${field}`;

    if (formData.has(key)) {
      setObjectValueAtPath(nextSeo, field, stringFromForm(formData, key));
    }
  }

  const sharedOgImage = sharedSeoImages.get('ogImagePath');

  if (sharedOgImage) {
    setObjectValueAtPath(nextSeo, 'ogImagePath', sharedOgImage);
    return nextSeo;
  }

  const uploadedOgImage = await readUploadedImageFilename(
    formData,
    `seoImage.${locale}.ogImagePath`,
    locale,
    pageEditorPath,
    `seoField.${locale}.ogImagePath`
  );

  if (uploadedOgImage) {
    setObjectValueAtPath(nextSeo, 'ogImagePath', uploadedOgImage);
  }

  return nextSeo;
}

function applyAppendablePageArrayFields(
  formData: FormData,
  locale: Locale,
  groupKey: string,
  content: Record<string, unknown>,
  definition: PageDefinition,
  sharedContentImages: SharedImageUploads
) {
  const fields = getPageFieldDefinitionsForGroup(definition, groupKey, content).filter(
    (field) => field.itemFields?.length
  );

  for (const field of fields) {
    const existingValue = getObjectValueAtPath(content, field.path);
    const existingItems = Array.isArray(existingValue) ? existingValue : [];
    const appendIndexes = getSubmittedAppendIndexes(formData, locale, groupKey, field.path, existingItems.length);

    if (appendIndexes.length === 0) {
      continue;
    }

    const nextItems = [...existingItems];

    for (const index of appendIndexes) {
      const nextItem: Record<string, unknown> = {};

      for (const itemField of field.itemFields ?? []) {
        const itemPath = `${field.path}.${index}.${itemField.path}`;
        const formKey = contentFieldFormKey(locale, groupKey, itemPath);
        const sharedImage = itemField.type === 'image'
          ? sharedContentImages.get(sharedPageImageKey(groupKey, itemPath))
          : '';
        const rawValue = sharedImage || stringFromForm(formData, formKey);

        if (rawValue) {
          setObjectValueAtPath(nextItem, itemField.path, rawValue);
        }
      }

      if (Object.keys(nextItem).length > 0) {
        nextItems.push(nextItem);
      }
    }

    setObjectValueAtPath(content, field.path, nextItems);
  }
}

function getSubmittedAppendIndexes(
  formData: FormData,
  locale: Locale,
  groupKey: string,
  arrayPath: string,
  startIndex: number
) {
  const indexes = new Set<number>();
  const prefix = contentFieldFormKey(locale, groupKey, `${arrayPath}.`);

  for (const key of formData.keys()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const rest = key.slice(prefix.length);
    const index = Number(rest.split('.')[0]);

    if (Number.isInteger(index) && index >= startIndex) {
      indexes.add(index);
    }
  }

  return Array.from(indexes).sort((a, b) => a - b);
}

async function readPageFieldValue(formData: FormData, formKey: string, field: {
  groupKey: string;
  path: string;
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'empty';
  isImage: boolean;
  locale: Locale;
  pageEditorPath: string;
  sharedContentImages: SharedImageUploads;
}) {
  if (field.isImage || isImageEditableField(field.path, field.value)) {
    const sharedImage = field.sharedContentImages.get(sharedPageImageKey(field.groupKey, field.path));

    if (sharedImage) {
      return sharedImage;
    }

    const uploadedImage = await readUploadedImageFilename(
      formData,
      contentImageFormKey(field.locale, field.groupKey, field.path),
      field.locale,
      field.pageEditorPath,
      formKey
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

async function readSharedPageContentImageUploads(formData: FormData, pageEditorPath: string) {
  const images: SharedImageUploads = new Map();

  for (const [formKey, value] of formData.entries()) {
    const parsedKey = parseContentImageFormKey(formKey);

    if (!parsedKey || images.has(sharedPageImageKey(parsedKey.groupKey, parsedKey.path)) || !(value instanceof File) || value.size === 0) {
      continue;
    }

    images.set(
      sharedPageImageKey(parsedKey.groupKey, parsedKey.path),
      await saveSharedPageImage(
        value,
        pageEditorPath,
        stringFromForm(formData, contentFieldFormKey(parsedKey.locale, parsedKey.groupKey, parsedKey.path))
      )
    );
  }

  return images;
}

async function readSharedPageSeoImageUploads(formData: FormData, pageEditorPath: string) {
  const images: SharedImageUploads = new Map();

  for (const locale of locales) {
    const formKey = `seoImage.${locale}.ogImagePath`;
    const value = formData.get(formKey);

    if (images.has('ogImagePath') || !(value instanceof File) || value.size === 0) {
      continue;
    }

    images.set(
      'ogImagePath',
      await saveSharedPageImage(value, pageEditorPath, stringFromForm(formData, `seoField.${locale}.ogImagePath`))
    );
  }

  return images;
}

async function saveSharedPageImage(file: File, pageEditorPath: string, preferredFilename: string) {
  if (!isAllowedImageUpload(file)) {
    redirect(`${pageEditorPath}?error=file`);
  }

  const alt = createImageAltFromFilename(file.name);
  const media = await savePublicImage(file, {
    altKo: alt,
    altEn: alt
  }, preferredFilename);

  return mediaImageFieldValue(media);
}

function parseContentImageFormKey(formKey: string) {
  const match = /^contentImage\.(ko|en)\.([^.]+)\.(.+)$/.exec(formKey);

  if (!match) {
    return null;
  }

  return {
    locale: match[1] as Locale,
    groupKey: match[2],
    path: match[3]
  };
}

function sharedPageImageKey(groupKey: string, pathValue: string) {
  return `${groupKey}\u0000${pathValue}`;
}

async function readUploadedImageFilename(
  formData: FormData,
  formKey: string,
  locale: Locale,
  pageEditorPath: string,
  preferredFilenameKey?: string
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
  }, preferredFilenameKey ? stringFromForm(formData, preferredFilenameKey) : '');

  return mediaImageFieldValue(media);
}

async function readUploadedImageOrText(
  formData: FormData,
  textKey: string,
  fileKey: string,
  locale: Locale,
  errorPath: string
) {
  const uploadedImage = await readUploadedImageFilename(formData, fileKey, locale, errorPath, textKey);

  return uploadedImage || stringFromForm(formData, textKey);
}

function stringFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function rawStringFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function safeAdminReturnPath(value: string) {
  if (!value || (value !== '/admin' && !value.startsWith('/admin/')) || value.startsWith('//') || value.includes('://')) {
    return null;
  }

  return value;
}

function redirectWithAdminActionError(pathValue: string, error: unknown): never {
  if (isRedirectError(error)) {
    throw error;
  }

  redirect(appendAdminActionError(pathValue, error));
}

function revalidateManagedPublicPaths() {
  const hrefs = new Set(managedPageDefinitions.map((definition) => definition.href).filter(Boolean));

  for (const href of hrefs) {
    for (const locale of locales) {
      revalidatePath(`/${locale}${href === '/' ? '' : href}`);
    }
  }
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

async function cleanupRemovedImages(previousImages: Set<string>, nextImages: Set<string>) {
  const removedImages = Array.from(previousImages).filter((filename) => !nextImages.has(filename));
  await cleanupUnreferencedPublicImages(removedImages);
}

async function cleanupUnreferencedPublicImages(
  candidates: Iterable<string>,
  options: {allowUnregistered?: boolean} = {}
) {
  const filenames = Array.from(new Set(Array.from(candidates).map(normalizePublicImageFilename).filter(isString)));

  for (const filename of filenames) {
    if (await isPublicImageStillReferenced(filename)) {
      continue;
    }

    const mediaRows = await findMediaRowsForFilename(filename);

    if (!options.allowUnregistered && mediaRows.length === 0) {
      continue;
    }

    for (const media of mediaRows) {
      await deleteMedia(media.id);
    }

    deletePublicImageFile(filename);
  }
}

async function isPublicImageStillReferenced(filename: string) {
  const [news, collections, pages] = await Promise.all([
    listNews(),
    listCollections(),
    listPages()
  ]);

  return (
    hasImageReference(news, filename) ||
    hasImageReference(collections, filename) ||
    hasImageReference(pages, filename) ||
    hasImageReference(getStaticMessagesImageReferences(), filename)
  );
}

async function findMediaRowsForFilename(filename: string) {
  return (await listMedia()).filter((media) => {
    const values = [media.filename, media.path, media.url, media.storageKey];
    return values.some((value) => normalizePublicImageFilename(value) === filename);
  });
}

function deletePublicImageFile(filename: string) {
  void filename;
}

let staticMessagesImageReferences: Set<string> | null = null;

function getStaticMessagesImageReferences() {
  staticMessagesImageReferences ??= collectImageFilenames({
    ko: koMessages,
    en: enMessages
  });

  return staticMessagesImageReferences;
}

function hasImageReference(value: unknown, filename: string) {
  return collectImageFilenames(value).has(filename);
}

function collectImageFilenames(value: unknown, filenames = new Set<string>()) {
  const filename = normalizePublicImageFilename(value);

  if (filename) {
    filenames.add(filename);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageFilenames(item, filenames);
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectImageFilenames(item, filenames);
    }
  }

  return filenames;
}

function normalizePublicImageFilename(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let imagePath = trimmed.split(/[?#]/)[0]?.replace(/\\/g, '/') ?? '';

  if (/^https?:\/\//i.test(imagePath)) {
    try {
      imagePath = new URL(imagePath).pathname;
    } catch {
      return null;
    }
  }

  const imageMarker = '/images/';
  const markerIndex = imagePath.indexOf(imageMarker);

  if (markerIndex >= 0) {
    imagePath = imagePath.slice(markerIndex + imageMarker.length);
  }

  imagePath = imagePath
    .replace(/^\/+/, '')
    .replace(/^public\/images\//, '')
    .replace(/^images\//, '');

  if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(imagePath)) {
    return null;
  }

  const normalized = path.posix.normalize(imagePath);

  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.startsWith('/')) {
    return null;
  }

  return normalized;
}

function isString(value: string | null): value is string {
  return Boolean(value);
}

async function savePublicImage(file: File, alt: {altKo?: string; altEn?: string}, preferredName = '') {
  return uploadMediaFile(file, {
    filename: preferredName,
    altKo: alt.altKo ?? '',
    altEn: alt.altEn ?? ''
  });
}

function mediaImageFieldValue(media: {filename: string; url?: string}) {
  const url = media.url?.trim() ?? '';
  return /^https?:\/\//i.test(url) ? url : media.filename;
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
