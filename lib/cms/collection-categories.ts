export const collectionCategoryValues = ['champion', 'bespoke'] as const;

export type CollectionCategory = typeof collectionCategoryValues[number];

export function isCollectionBackedCategory(value: unknown): value is CollectionCategory {
  return typeof value === 'string' && collectionCategoryValues.includes(value as CollectionCategory);
}
