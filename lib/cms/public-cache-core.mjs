const publicLocales = ['ko', 'en'];

export const allPublicCmsCacheTag = 'cms:all';

export function publicPageCacheTags(locale, pageKey) {
  return [allPublicCmsCacheTag, pageCacheTag(locale, pageKey)];
}

export function publicNewsListCacheTags(locale) {
  return [allPublicCmsCacheTag, newsListCacheTag(locale)];
}

export function publicNewsItemCacheTags(locale, slug) {
  return [allPublicCmsCacheTag, newsItemCacheTag(locale, slug)];
}

export function publicCollectionListCacheTags(locale) {
  return [allPublicCmsCacheTag, collectionListCacheTag(locale)];
}

export function publicCollectionItemCacheTags(locale, slug) {
  return [allPublicCmsCacheTag, collectionItemCacheTag(locale, slug)];
}

export function pageMutationCacheTags(pageKey) {
  return publicLocales.map((locale) => pageCacheTag(locale, pageKey));
}

export function newsMutationCacheTags(previousSlug, nextSlug) {
  return mutationCacheTags(
    newsListCacheTag,
    newsItemCacheTag,
    previousSlug,
    nextSlug
  );
}

export function collectionMutationCacheTags(previousSlug, nextSlug) {
  return mutationCacheTags(
    collectionListCacheTag,
    collectionItemCacheTag,
    previousSlug,
    nextSlug
  );
}

export function invalidateCacheTags(tags, invalidate, logError = console.error) {
  let succeeded = true;

  for (const tag of new Set(tags)) {
    try {
      invalidate(tag);
    } catch (error) {
      succeeded = false;
      logError('[cms-cache] Cache invalidation failed after a successful CMS write.', {
        tag,
        error
      });
    }
  }

  return succeeded;
}

function mutationCacheTags(listTag, itemTag, previousSlug, nextSlug) {
  const tags = publicLocales.map((locale) => listTag(locale));
  const slugs = new Set([normalizeSlug(previousSlug), normalizeSlug(nextSlug)].filter(Boolean));

  for (const slug of slugs) {
    for (const locale of publicLocales) {
      tags.push(itemTag(locale, slug));
    }
  }

  return tags;
}

function pageCacheTag(locale, pageKey) {
  return `cms:page:${locale}:${pageKey}`;
}

function newsListCacheTag(locale) {
  return `cms:news:list:${locale}`;
}

function newsItemCacheTag(locale, slug) {
  return `cms:news:item:${locale}:${slug}`;
}

function collectionListCacheTag(locale) {
  return `cms:collection:list:${locale}`;
}

function collectionItemCacheTag(locale, slug) {
  return `cms:collection:item:${locale}:${slug}`;
}

function normalizeSlug(value) {
  return typeof value === 'string' ? value.trim() : '';
}
