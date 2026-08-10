import {revalidateTag} from 'next/cache';

import {
  allPublicCmsCacheTag,
  collectionMutationCacheTags,
  invalidateCacheTags,
  newsMutationCacheTags,
  pageMutationCacheTags,
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags
} from '@/lib/cms/public-cache-core.mjs';

export const publicCmsCacheSeconds = 60 * 60;

export {
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags
};

export function revalidatePublicPageCache(pageKey: string) {
  return revalidateTags(pageMutationCacheTags(pageKey));
}

export function revalidatePublicNewsCache(previousSlug?: string | null, nextSlug?: string | null) {
  return revalidateTags(newsMutationCacheTags(previousSlug, nextSlug));
}

export function revalidatePublicCollectionCache(previousSlug?: string | null, nextSlug?: string | null) {
  return revalidateTags(collectionMutationCacheTags(previousSlug, nextSlug));
}

export function revalidateAllPublicCmsCache() {
  return revalidateTags([allPublicCmsCacheTag]);
}

function revalidateTags(tags: Iterable<string>) {
  return invalidateCacheTags(tags, (tag) => revalidateTag(tag, {expire: 0}));
}
