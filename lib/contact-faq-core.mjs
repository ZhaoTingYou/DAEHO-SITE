export const CONTACT_FAQ_CATEGORY_ORDER = [
  'consultation',
  'design',
  'business',
  'sports'
];

const knownCategoryIds = new Set(CONTACT_FAQ_CATEGORY_ORDER);
const safeCategoryIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

const legacyQuestionCategories = new Map([
  ...questions('consultation', [
    '주문제작은 어떤 과정으로 진행되나요?',
    '주문제작 기간은 얼마나 걸리나요?',
    '주문제작 비용은 어떻게 결정되나요?',
    '소량 또는 1개도 주문제작이 가능한가요?',
    '예산에 맞춰 제품을 제작할 수 있나요?',
    'How does the custom production process work?',
    'How long does custom production take?',
    'How is the cost of custom production determined?',
    'Can I order a small quantity or even a single item?',
    'Can you produce an item within a set budget?'
  ]),
  ...questions('design', [
    '원하는 디자인이 없어도 주문제작을 의뢰할 수 있나요?',
    '직접 만든 디자인이나 로고로 제작할 수 있나요?',
    '금속 외에 다양한 소재로도 제작할 수 있나요?',
    '금·은 등 귀금속으로도 주문제작할 수 있나요?',
    '기존 제품이나 이미지를 참고하여 새로운 제품을 개발할 수 있나요?',
    '제작 전에 디자인이나 시안을 확인할 수 있나요?',
    'Can I request custom production without a finished design?',
    'Can you produce an item using my own design or logo?',
    'Can you work with materials other than metal?',
    'Can you produce custom items in precious metals such as gold and silver?',
    'Can you develop a new product based on an existing product or reference image?',
    'Can I review a design or proof before production?'
  ]),
  ...questions('business', [
    '기업이나 단체에서 대량으로 주문할 수 있나요?',
    '기업이나 브랜드의 기념품·굿즈도 제작할 수 있나요?',
    '반지 사이즈는 어떻게 측정하고 취합하나요?',
    '어떤 제품까지 주문제작이 가능한가요?',
    '디자인부터 생산까지 한 곳에서 진행할 수 있나요?',
    '전국에서 주문제작 상담이 가능한가요?',
    'Can companies or organizations place bulk orders?',
    'Can you produce commemorative gifts or merchandise for companies and brands?',
    'How are ring sizes measured and collected?',
    'What kinds of products can be custom-made?',
    'Can design and production be handled in one place?',
    'Is custom production consultation available nationwide?'
  ]),
  ...questions('sports', [
    '우승반지와 스포츠 기념제품도 주문제작할 수 있나요?',
    '스포츠 구단 팬 굿즈와 MD 상품도 제작할 수 있나요?',
    '우승반지를 팬 판매용 상품으로도 제작할 수 있나요?',
    'Can you produce championship rings and sports commemorative products?',
    'Can you produce fan merchandise and official products for sports teams?',
    'Can championship rings be developed as products for fan sales?'
  ])
]);

export function normalizeContactFaqCategories(categories, labels = {}) {
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : CONTACT_FAQ_CATEGORY_ORDER.map((id) => ({id, label: labels[id]}));
  const seen = new Set();

  return source.flatMap((item) => {
    const id = normalizeCategoryId(item?.id);
    const label = String(item?.label ?? '').trim();

    if (!id || !label || seen.has(id)) {
      return [];
    }

    seen.add(id);
    return [{id, label}];
  });
}

export function resolveContactFaqCategory(item, availableCategoryIds = knownCategoryIds) {
  const category = String(item?.category ?? '').trim();

  if (category) {
    return availableCategoryIds.has(category) ? category : 'other';
  }

  return legacyQuestionCategories.get(normalizeQuestion(item?.question)) ?? 'other';
}

export function groupContactFaqs(items, categories, otherLabel) {
  const normalizedCategories = normalizeContactFaqCategories(categories);
  const categoryIds = new Set(normalizedCategories.map(({id}) => id));
  const grouped = new Map([...categoryIds, 'other'].map((id) => [id, []]));

  for (const item of Array.isArray(items) ? items : []) {
    grouped.get(resolveContactFaqCategory(item, categoryIds)).push(item);
  }

  return [...normalizedCategories, {id: 'other', label: otherLabel}]
    .map(({id, label}) => ({id, label, items: grouped.get(id)}))
    .filter(({items}) => items.length > 0);
}

function questions(category, values) {
  return values.map((question) => [normalizeQuestion(question), category]);
}

function normalizeQuestion(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

function normalizeCategoryId(value) {
  const id = String(value ?? '').trim().toLocaleLowerCase('en-US');
  return safeCategoryIdPattern.test(id) ? id : '';
}
