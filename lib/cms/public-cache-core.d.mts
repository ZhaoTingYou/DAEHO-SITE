export const allPublicCmsCacheTag: 'cms:all';
export type PublicCachePath = {path: string; type?: 'page' | 'layout'};

export function publicPageCacheTags(locale: string, pageKey: string): string[];
export function publicNewsListCacheTags(locale: string): string[];
export function publicNewsItemCacheTags(locale: string, slug: string): string[];
export function publicCollectionListCacheTags(locale: string): string[];
export function publicCollectionItemCacheTags(locale: string, slug: string): string[];

export function pageMutationCacheTags(pageKey: string): string[];
export function pageMutationCachePaths(pageKey: string, href?: string | null): PublicCachePath[];
export function newsMutationCacheTags(previousSlug?: string | null, nextSlug?: string | null): string[];
export function newsMutationCachePaths(previousSlug?: string | null, nextSlug?: string | null): PublicCachePath[];
export function collectionMutationCacheTags(previousSlug?: string | null, nextSlug?: string | null): string[];
export function collectionMutationCachePaths(previousSlug?: string | null, nextSlug?: string | null): PublicCachePath[];
export function allPublicCachePaths(): PublicCachePath[];

export function invalidateCacheTags(
  tags: Iterable<string>,
  invalidate: (tag: string) => void,
  logError?: (message: string, details: {tag: string; error: unknown}) => void
): boolean;
export function invalidateCachePaths(
  paths: Iterable<PublicCachePath>,
  invalidate: (path: string, type?: 'page' | 'layout') => void,
  logError?: (message: string, details: {path: string; type?: 'page' | 'layout'; error: unknown}) => void
): boolean;
