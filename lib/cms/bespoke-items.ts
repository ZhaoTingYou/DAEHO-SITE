import type {Locale} from '@/i18n/routing';

export type BespokeCollectionItem = {
  id: string;
  title: string;
  caption: string;
  category: string;
  categoryLabel: string;
  sportCategory?: string;
  sportCategoryLabel?: string;
  year?: string;
  image: string;
  hasImage: boolean;
};

export type BespokeCollectionItemOverride = Partial<BespokeCollectionItem> & {
  id?: string;
};

export function mergeBespokeItems<Item extends BespokeCollectionItem>(
  items: Item[],
  overrides: BespokeCollectionItemOverride[] | undefined,
  locale: Locale
): Item[] {
  if (!overrides?.length) {
    return items;
  }

  const overridesById = new Map(
    overrides
      .map((item) => [normalizedText(item.id), item] as const)
      .filter(([id]) => Boolean(id))
  );
  const nextItems = items.map((item) => {
    const override = overridesById.get(item.id);
    return override ? mergeBespokeItem(item, override, locale) : item;
  });
  const existingIds = new Set(nextItems.map((item) => item.id));

  for (const override of overrides) {
    const id = normalizedText(override.id);

    if (!id || existingIds.has(id)) {
      continue;
    }

    const nextItem = createBespokeItemFromOverride(override, locale);

    if (nextItem) {
      nextItems.push(nextItem as Item);
      existingIds.add(nextItem.id);
    }
  }

  return nextItems;
}

function mergeBespokeItem<Item extends BespokeCollectionItem>(
  item: Item,
  override: BespokeCollectionItemOverride,
  locale: Locale
): Item {
  const image = normalizedText(override.image);

  return {
    ...item,
    title: normalizedText(override.title) || item.title,
    caption: normalizedText(override.caption) || item.caption,
    categoryLabel: normalizedText(override.categoryLabel) || item.categoryLabel || defaultBespokeCategoryLabel(locale),
    year: normalizedText(override.year) || item.year,
    image: image || item.image,
    hasImage: image ? true : item.hasImage
  };
}

function createBespokeItemFromOverride(
  override: BespokeCollectionItemOverride,
  locale: Locale
): BespokeCollectionItem | null {
  const id = normalizedText(override.id);
  const image = normalizedText(override.image);
  const title = normalizedText(override.title);
  const caption = normalizedText(override.caption);

  if (!id || (!image && !title && !caption)) {
    return null;
  }

  return {
    id,
    title: title || id,
    caption,
    category: 'bespoke',
    categoryLabel: normalizedText(override.categoryLabel) || defaultBespokeCategoryLabel(locale),
    sportCategory: normalizedText(override.sportCategory),
    sportCategoryLabel: normalizedText(override.sportCategoryLabel),
    year: normalizedText(override.year),
    image,
    hasImage: Boolean(image)
  };
}

function defaultBespokeCategoryLabel(locale: Locale) {
  return locale === 'ko' ? '주문제작' : 'Bespoke';
}

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
