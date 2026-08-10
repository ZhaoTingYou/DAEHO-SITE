export const allPublicCmsCacheTag: 'cms:all';

export function publicPageCacheTags(locale: string, pageKey: string): string[];
export function publicNewsListCacheTags(locale: string): string[];
export function publicNewsItemCacheTags(locale: string, slug: string): string[];
export function publicCollectionListCacheTags(locale: string): string[];
export function publicCollectionItemCacheTags(locale: string, slug: string): string[];

export function pageMutationCacheTags(pageKey: string): string[];
export function newsMutationCacheTags(previousSlug?: string | null, nextSlug?: string | null): string[];
export function collectionMutationCacheTags(previousSlug?: string | null, nextSlug?: string | null): string[];

export function invalidateCacheTags(
  tags: Iterable<string>,
  invalidate: (tag: string) => void,
  logError?: (message: string, details: {tag: string; error: unknown}) => void
): boolean;
