import {isDeepStrictEqual} from 'node:util';

const locales = ['ko', 'en'];

export function parseContactFaqMigrationArguments(args) {
  const replaceIncompleteEnglish = args.includes('--replace-incomplete-en');

  return {
    apply: args.includes('--apply'),
    migrationOptions: replaceIncompleteEnglish
      ? {replaceIncompleteEnglishCount: 2}
      : {}
  };
}

export function migrateContactFaqContents(input, canonical, options = {}) {
  validateCanonical(canonical);

  const next = cloneJson(input);
  const questionIndexes = buildQuestionIndexes(canonical);
  const matched = {};

  for (const locale of locales) {
    const main = contactMain(next[locale]);
    const currentFaqs = Array.isArray(main.faqs) ? main.faqs : [];
    const indexes = currentFaqs.map((item) => questionIndexes.get(normalizeQuestion(item?.question)));
    const uniqueIndexes = new Set(indexes);
    const knownTwenty = currentFaqs.length === 20
      && indexes.every((index) => index !== undefined)
      && uniqueIndexes.size === 20;
    const replaceIncompleteEnglish = locale === 'en'
      && options.replaceIncompleteEnglishCount === 2
      && currentFaqs.length === 2;

    if (!knownTwenty && !replaceIncompleteEnglish) {
      throw new Error(`${locale} FAQ migration requires exactly the known twenty unique questions.`);
    }

    if (replaceIncompleteEnglish) {
      main.faqCategories = cloneJson(canonical[locale].faqCategories);
      main.faqCategoryLabels = cloneJson(canonical[locale].faqCategoryLabels);
      main.faqs = cloneJson(canonical[locale].faqs);
      matched[locale] = currentFaqs.length;
      continue;
    }

    const currentByCanonicalIndex = new Map(
      currentFaqs.map((item, position) => [indexes[position], item])
    );
    main.faqCategories = cloneJson(canonical[locale].faqCategories);
    main.faqCategoryLabels = cloneJson(canonical[locale].faqCategoryLabels);
    main.faqs = canonical[locale].faqs.map((canonicalItem, index) => {
      const item = currentByCanonicalIndex.get(index);

      if (locale === 'ko') {
        return {
          ...item,
          category: canonicalItem.category
        };
      }

      return {
        ...item,
        category: canonicalItem.category,
        question: canonicalItem.question,
        answer: canonicalItem.answer
      };
    });
    matched[locale] = currentFaqs.length;
  }

  return {
    content: next,
    matched,
    changed: !isDeepStrictEqual(next, input)
  };
}

function validateCanonical(canonical) {
  let sharedCategoryOrder = null;

  for (const locale of locales) {
    const contact = canonical?.[locale];
    const faqs = Array.isArray(contact?.faqs) ? contact.faqs : [];
    const categories = Array.isArray(contact?.faqCategories) ? contact.faqCategories : [];
    const ids = categories.map((item) => item?.id);
    const categoryIds = new Set(ids);
    const uniqueQuestions = new Set(faqs.map((item) => normalizeQuestion(item.question)));
    const categoryOrder = ids.join('\0');

    if (
      categories.length === 0
      || categoryIds.size !== categories.length
      || categories.some((item) => !item?.id || !item?.label?.trim())
      || faqs.length !== 20
      || uniqueQuestions.size !== 20
      || faqs.some((item) => !categoryIds.has(item.category) || !item.answer?.trim())
      || !contact?.faqCategoryLabels
    ) {
      throw new Error(`Canonical ${locale} Contact FAQ content must contain twenty categorized items.`);
    }

    if (sharedCategoryOrder !== null && sharedCategoryOrder !== categoryOrder) {
      throw new Error('Canonical Contact FAQ category IDs and order must be shared across locales.');
    }
    sharedCategoryOrder = categoryOrder;
  }
}

function buildQuestionIndexes(canonical) {
  const indexes = new Map();

  for (const locale of locales) {
    canonical[locale].faqs.forEach((item, index) => {
      indexes.set(normalizeQuestion(item.question), index);
    });
  }

  return indexes;
}

function contactMain(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Contact CMS content must be a JSON object.');
  }

  const groupedMain = content.__groups?.main;
  if (groupedMain && typeof groupedMain === 'object' && !Array.isArray(groupedMain)) {
    return groupedMain;
  }

  return content;
}

function normalizeQuestion(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
