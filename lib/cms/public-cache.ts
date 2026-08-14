import 'server-only';

import {revalidatePath, revalidateTag} from 'next/cache';

import {
  allPublicCachePaths,
  allPublicCmsCacheTag,
  collectionMutationCachePaths,
  collectionMutationCacheTags,
  invalidateCachePaths,
  invalidateCacheTags,
  newsMutationCachePaths,
  newsMutationCacheTags,
  pageMutationCachePaths,
  pageMutationCacheTags,
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags
} from '@/lib/cms/public-cache-core.mjs';
import {managedPageDefinitions} from '@/lib/cms/page-catalog';

export const publicCmsCacheSeconds = 60 * 60;

export {
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags
};

export function revalidatePublicPageCache(pageKey: string) {
  const definition = managedPageDefinitions.find((page) => page.pageKey === pageKey);
  return revalidateEntries(
    pageMutationCacheTags(pageKey),
    pageMutationCachePaths(pageKey, definition?.href)
  );
}

export function revalidatePublicNewsCache(previousSlug?: string | null, nextSlug?: string | null) {
  return revalidateEntries(
    newsMutationCacheTags(previousSlug, nextSlug),
    newsMutationCachePaths(previousSlug, nextSlug)
  );
}

export function revalidatePublicCollectionCache(previousSlug?: string | null, nextSlug?: string | null) {
  return revalidateEntries(
    collectionMutationCacheTags(previousSlug, nextSlug),
    collectionMutationCachePaths(previousSlug, nextSlug)
  );
}

export function revalidateAllPublicCmsCache() {
  return revalidateEntries([allPublicCmsCacheTag], allPublicCachePaths());
}

export function revalidatePathsSafely(paths: Iterable<string>) {
  return revalidatePaths(Array.from(paths, (path) => ({path})));
}

function revalidateEntries(
  tags: Iterable<string>,
  paths: Iterable<{path: string; type?: 'page' | 'layout'}>
) {
  const tagsSucceeded = revalidateTags(tags);
  const pathsSucceeded = revalidatePaths(paths);
  return tagsSucceeded && pathsSucceeded;
}

function revalidateTags(tags: Iterable<string>) {
  return invalidateCacheTags(tags, (tag) => revalidateTag(tag, {expire: 0}));
}

function revalidatePaths(paths: Iterable<{path: string; type?: 'page' | 'layout'}>) {
  return invalidateCachePaths(paths, (path, type) => {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  });
}
