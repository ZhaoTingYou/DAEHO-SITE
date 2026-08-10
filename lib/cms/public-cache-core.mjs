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

export function pageMutationCachePaths(pageKey, href) {
  if (pageKey === 'common' || pageKey === 'site-popup') {
    return allPublicCachePaths();
  }

  if (typeof href !== 'string' || !href.trim()) {
    return [];
  }

  return publicLocales.map((locale) => ({
    path: `/${locale}${href === '/' ? '' : href}`
  }));
}

export function newsMutationCacheTags(previousSlug, nextSlug) {
  return mutationCacheTags(
    newsListCacheTag,
    newsItemCacheTag,
    previousSlug,
    nextSlug
  );
}

export function newsMutationCachePaths(previousSlug, nextSlug) {
  const paths = [
    ...publicLocales.flatMap((locale) => [
      {path: `/${locale}`},
      {path: `/${locale}/news`}
    ]),
    {path: '/[locale]/news/[slug]', type: 'page'},
    {path: '/rss.xml'},
    {path: '/sitemap.xml'}
  ];

  for (const slug of uniqueSlugs(previousSlug, nextSlug)) {
    for (const locale of publicLocales) {
      paths.push({path: `/${locale}/news/${slug}`});
    }
  }

  return paths;
}

export function collectionMutationCacheTags(previousSlug, nextSlug) {
  return mutationCacheTags(
    collectionListCacheTag,
    collectionItemCacheTag,
    previousSlug,
    nextSlug
  );
}

export function collectionMutationCachePaths(previousSlug, nextSlug) {
  const paths = [
    ...publicLocales.flatMap((locale) => [
      {path: `/${locale}/mastery/creations`},
      {path: `/${locale}/mastery/creations/champion`},
      {path: `/${locale}/mastery/creations/appointment`},
      {path: `/${locale}/mastery/creations/bespoke`}
    ]),
    {path: '/[locale]/mastery/creations/[slug]', type: 'page'},
    {path: '/sitemap.xml'}
  ];

  for (const slug of uniqueSlugs(previousSlug, nextSlug)) {
    for (const locale of publicLocales) {
      paths.push({path: `/${locale}/mastery/creations/${slug}`});
    }
  }

  return paths;
}

export function allPublicCachePaths() {
  return [
    {path: '/[locale]', type: 'layout'},
    {path: '/rss.xml'},
    {path: '/sitemap.xml'}
  ];
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

export function invalidateCachePaths(paths, invalidate, logError = console.error) {
  let succeeded = true;
  const uniquePaths = new Map(paths.map((entry) => [`${entry.type ?? ''}:${entry.path}`, entry]));

  for (const entry of uniquePaths.values()) {
    try {
      invalidate(entry.path, entry.type);
    } catch (error) {
      succeeded = false;
      logError('[cms-cache] Path invalidation failed after a successful CMS write.', {
        path: entry.path,
        type: entry.type,
        error
      });
    }
  }

  return succeeded;
}

function mutationCacheTags(listTag, itemTag, previousSlug, nextSlug) {
  const tags = publicLocales.map((locale) => listTag(locale));
  const slugs = uniqueSlugs(previousSlug, nextSlug);

  for (const slug of slugs) {
    for (const locale of publicLocales) {
      tags.push(itemTag(locale, slug));
    }
  }

  return tags;
}

function uniqueSlugs(previousSlug, nextSlug) {
  return new Set([normalizeSlug(previousSlug), normalizeSlug(nextSlug)].filter(Boolean));
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
