type CollectionCategoryFilter = {
  id: string;
};

export function preserveCollectionCategoryFilters<T extends CollectionCategoryFilter>(
  configuredFilters: readonly T[] | null | undefined,
  staticFilters: readonly T[]
): T[] {
  const configuredById = new Map(
    (Array.isArray(configuredFilters) ? configuredFilters : []).map((filter) => [
      filter.id,
      filter
    ])
  );

  return staticFilters.map((staticFilter) => ({
    ...staticFilter,
    ...configuredById.get(staticFilter.id),
    id: staticFilter.id
  }));
}
