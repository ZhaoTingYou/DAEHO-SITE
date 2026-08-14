export type ContactFaqCategoryId = 'consultation' | 'design' | 'business' | 'sports';
export type ContactFaqGroupId = string;

export type ContactFaqCategory = {
  id: string;
  label: string;
};

export type ContactFaqItem = {
  category: string;
  question: string;
  answer: string;
};

export type ContactFaqCategoryLabels = Record<string, string>;

export type LegacyContactFaqItem = Omit<ContactFaqItem, 'category'> & {
  category?: string;
};

export type ContactFaqSourceItem = ContactFaqItem | LegacyContactFaqItem;

export type ContactFaqGroup = {
  id: ContactFaqGroupId;
  label: string;
  items: ContactFaqSourceItem[];
};

export const CONTACT_FAQ_CATEGORY_ORDER: ContactFaqCategoryId[];
export function normalizeContactFaqCategories(
  categories: ContactFaqCategory[] | undefined,
  labels?: ContactFaqCategoryLabels
): ContactFaqCategory[];
export function resolveContactFaqCategory(
  item: ContactFaqSourceItem,
  availableCategoryIds?: Set<string>
): ContactFaqGroupId;
export function groupContactFaqs(
  items: ContactFaqSourceItem[],
  categories: ContactFaqCategory[],
  otherLabel: string
): ContactFaqGroup[];
