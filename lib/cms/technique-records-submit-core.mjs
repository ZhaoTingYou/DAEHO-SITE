import {
  buildTechniqueRecordLocales,
  minimumTechniqueCarouselItems,
  pairTechniqueRecords
} from './technique-records-core.mjs';

const blankRecord = Object.freeze({
  title: '',
  body: '',
  image: ''
});

function localeItems(value) {
  return Array.isArray(value) ? value : [];
}

function submittedRecordLength(value, fallbackLength) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  return Number.isInteger(parsed)
    ? Math.max(minimumTechniqueCarouselItems, parsed)
    : Math.max(minimumTechniqueCarouselItems, fallbackLength);
}

function submittedRecordIds(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordsAtLength(items, length) {
  return Array.from({length}, (_, index) => ({...(items[index] ?? blankRecord), id: undefined}));
}

export function normalizeSubmittedTechniqueRecords({
  koItems,
  enItems,
  submittedIds,
  submittedLength
}) {
  const koSource = localeItems(koItems);
  const enSource = localeItems(enItems);
  const fallbackLength = Math.max(minimumTechniqueCarouselItems, koSource.length, enSource.length);
  const length = submittedRecordLength(submittedLength, fallbackLength);
  const ids = submittedRecordIds(submittedIds);
  const drafts = pairTechniqueRecords(
    recordsAtLength(koSource, length),
    recordsAtLength(enSource, length)
  ).slice(0, length).map((draft, index) => ({
    ...draft,
    id: typeof ids[index] === 'string'
      ? ids[index]
      : koSource[index]?.id || enSource[index]?.id || draft.id
  }));

  return buildTechniqueRecordLocales(drafts);
}
