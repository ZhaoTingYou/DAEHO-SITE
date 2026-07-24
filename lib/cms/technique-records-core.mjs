function localizedText(record) {
  return {
    title: record?.title ?? '',
    body: record?.body ?? ''
  };
}

export const minimumTechniqueCarouselItems = 3;

function sanitizeTechniqueRecordId(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function fallbackTechniqueRecordId(index, usedIds) {
  const base = `technique-record-${String(index + 1).padStart(2, '0')}`;
  let candidate = base;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeDraftIds(drafts) {
  const usedIds = new Set();

  return drafts.map((draft, index) => {
    const sanitizedId = sanitizeTechniqueRecordId(draft?.id);
    const id = sanitizedId && !usedIds.has(sanitizedId) ? sanitizedId : fallbackTechniqueRecordId(index, usedIds);

    usedIds.add(id);
    return id;
  });
}

function withNormalizedDraftIds(drafts) {
  const ids = normalizeDraftIds(drafts);

  return drafts.map((draft, index) => ({...draft, id: ids[index]}));
}

function withMinimumDrafts(drafts) {
  const next = [...drafts];

  while (next.length < minimumTechniqueCarouselItems) {
    next.push({
      id: '',
      image: '',
      ko: localizedText(),
      en: localizedText()
    });
  }

  return withNormalizedDraftIds(next);
}

function hasCompleteUniqueIds(items) {
  const ids = items.map((item) => item?.id);

  return ids.every((id) => typeof id === 'string' && id.trim() !== '') && new Set(ids).size === ids.length;
}

export function pairTechniqueRecords(koItems, enItems) {
  const canPairById =
    koItems.length > 0 &&
    enItems.length > 0 &&
    hasCompleteUniqueIds(koItems) &&
    hasCompleteUniqueIds(enItems);

  if (canPairById) {
    const enItemsById = new Map(enItems.map((item) => [item.id, item]));
    const koIds = new Set(koItems.map((item) => item.id));
    const pairedDrafts = koItems.map((koItem) => {
      const enItem = enItemsById.get(koItem.id);

      return {
        id: koItem.id,
        image: koItem.image || enItem?.image || '',
        ko: localizedText(koItem),
        en: localizedText(enItem)
      };
    });

    const enOnlyDrafts = enItems
      .filter((enItem) => !koIds.has(enItem.id))
      .map((enItem) => ({
        id: enItem.id,
        image: enItem.image || '',
        ko: localizedText(),
        en: localizedText(enItem)
      }));

    return withMinimumDrafts([...pairedDrafts, ...enOnlyDrafts]);
  }

  const length = Math.max(minimumTechniqueCarouselItems, koItems.length, enItems.length);

  const pairedDrafts = Array.from({length}, (_, index) => {
    const koItem = koItems[index];
    const enItem = enItems[index];

    return {
      id: `technique-record-${String(index + 1).padStart(2, '0')}`,
      image: koItem?.image || enItem?.image || '',
      ko: localizedText(koItem),
      en: localizedText(enItem)
    };
  });

  return withMinimumDrafts(pairedDrafts);
}

function buildLocaleRecord(draft, locale, id) {
  return {
    id,
    ...localizedText(draft[locale]),
    image: draft.image
  };
}

export function buildTechniqueRecordLocales(drafts) {
  const sourceDrafts = [...drafts];

  while (sourceDrafts.length < minimumTechniqueCarouselItems) {
    sourceDrafts.push({id: '', image: '', ko: {}, en: {}});
  }

  const ids = normalizeDraftIds(sourceDrafts);

  return {
    ko: sourceDrafts.map((draft, index) => buildLocaleRecord(draft, 'ko', ids[index])),
    en: sourceDrafts.map((draft, index) => buildLocaleRecord(draft, 'en', ids[index]))
  };
}
