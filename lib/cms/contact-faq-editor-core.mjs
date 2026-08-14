import {
  normalizeContactFaqCategories,
  resolveContactFaqCategory
} from '../contact-faq-core.mjs';

const categoryIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class ContactFaqEditorValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ContactFaqEditorValidationError';
    this.code = code;
  }
}

export function pairContactFaqEditorDrafts(koContent = {}, enContent = {}) {
  const koCategories = normalizeContactFaqCategories(
    koContent.faqCategories,
    koContent.faqCategoryLabels
  );
  const enCategories = normalizeContactFaqCategories(
    enContent.faqCategories,
    enContent.faqCategoryLabels
  );
  const enLabels = new Map(enCategories.map(({id, label}) => [id, label]));
  const categoryIds = new Set(koCategories.map(({id}) => id));
  const koFaqs = Array.isArray(koContent.faqs) ? koContent.faqs : [];
  const enFaqs = Array.isArray(enContent.faqs) ? enContent.faqs : [];

  return {
    categories: koCategories.map(({id, label}) => ({
      id,
      koLabel: label,
      enLabel: enLabels.get(id) ?? label
    })),
    faqs: Array.from({length: Math.max(koFaqs.length, enFaqs.length)}, (_, index) => {
      const koFaq = koFaqs[index] ?? {};
      const enFaq = enFaqs[index] ?? {};
      const category = resolveContactFaqCategory(koFaq, categoryIds);

      return {
        id: `faq-${index + 1}`,
        category: categoryIds.has(category) ? category : '',
        ko: normalizeDraftCopy(koFaq),
        en: normalizeDraftCopy(enFaq)
      };
    })
  };
}

export function parseContactFaqEditorSubmission(value) {
  let submission;

  try {
    submission = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    fail('INVALID_JSON');
  }

  if (!submission || typeof submission !== 'object' || Array.isArray(submission)) {
    fail('INVALID_JSON');
  }

  if (!Array.isArray(submission.categories) || submission.categories.length === 0) {
    fail('CATEGORIES_REQUIRED');
  }

  const seenCategoryIds = new Set();
  const categories = submission.categories.map((item) => {
    const id = String(item?.id ?? '').trim().toLocaleLowerCase('en-US');
    const koLabel = normalizeText(item?.koLabel);
    const enLabel = normalizeText(item?.enLabel);

    if (!categoryIdPattern.test(id)) {
      fail('CATEGORY_ID_INVALID');
    }
    if (seenCategoryIds.has(id)) {
      fail('CATEGORY_ID_DUPLICATE');
    }
    if (!koLabel || !enLabel) {
      fail('CATEGORY_LABEL_REQUIRED');
    }

    seenCategoryIds.add(id);
    return {id, koLabel, enLabel};
  });

  const faqs = Array.isArray(submission.faqs) ? submission.faqs : [];
  const seenKoQuestions = new Set();
  const seenEnQuestions = new Set();
  const normalizedFaqs = faqs.map((item) => {
    const category = String(item?.category ?? '').trim().toLocaleLowerCase('en-US');
    const ko = normalizeDraftCopy(item?.ko);
    const en = normalizeDraftCopy(item?.en);

    if (!seenCategoryIds.has(category)) {
      fail('FAQ_CATEGORY_INVALID');
    }
    if (!ko.question || !ko.answer || !en.question || !en.answer) {
      fail('FAQ_COPY_REQUIRED');
    }

    const normalizedKoQuestion = normalizeQuestion(ko.question);
    const normalizedEnQuestion = normalizeQuestion(en.question);
    if (seenKoQuestions.has(normalizedKoQuestion) || seenEnQuestions.has(normalizedEnQuestion)) {
      fail('FAQ_QUESTION_DUPLICATE');
    }
    seenKoQuestions.add(normalizedKoQuestion);
    seenEnQuestions.add(normalizedEnQuestion);

    return {category, ko, en};
  });

  return {
    ko: buildLocaleContent(categories, normalizedFaqs, 'ko'),
    en: buildLocaleContent(categories, normalizedFaqs, 'en')
  };
}

export function contactFaqCategoryUsage(draft, categoryId) {
  return Array.isArray(draft?.faqs)
    ? draft.faqs.filter((faq) => faq?.category === categoryId).length
    : 0;
}

export function moveContactFaqEditorItem(items, index, direction) {
  const result = Array.isArray(items) ? [...items] : [];
  const target = index + direction;

  if (index < 0 || index >= result.length || target < 0 || target >= result.length) {
    return result;
  }

  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

function buildLocaleContent(categories, faqs, locale) {
  const labelKey = locale === 'ko' ? 'koLabel' : 'enLabel';
  const copyKey = locale === 'ko' ? 'ko' : 'en';
  const faqCategories = categories.map(({id, [labelKey]: label}) => ({id, label}));

  return {
    faqCategories,
    faqCategoryLabels: Object.fromEntries(faqCategories.map(({id, label}) => [id, label])),
    faqs: faqs.map(({category, [copyKey]: copy}) => ({category, ...copy}))
  };
}

function normalizeDraftCopy(value) {
  return {
    question: normalizeText(value?.question),
    answer: normalizeText(value?.answer)
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeQuestion(value) {
  return normalizeText(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function fail(code) {
  throw new ContactFaqEditorValidationError(code);
}
