export type ContactFaqEditorCategory = {
  id: string;
  koLabel: string;
  enLabel: string;
};

export type ContactFaqEditorCopy = {
  question: string;
  answer: string;
};

export type ContactFaqEditorFaq = {
  id: string;
  category: string;
  ko: ContactFaqEditorCopy;
  en: ContactFaqEditorCopy;
};

export type ContactFaqEditorDraft = {
  categories: ContactFaqEditorCategory[];
  faqs: ContactFaqEditorFaq[];
};

export type ContactFaqLocaleContent = {
  faqCategories: Array<{id: string; label: string}>;
  faqCategoryLabels: Record<string, string>;
  faqs: Array<{category: string; question: string; answer: string}>;
};

export class ContactFaqEditorValidationError extends Error {
  code: string;
  constructor(code: string);
}

export function pairContactFaqEditorDrafts(
  koContent?: Record<string, unknown>,
  enContent?: Record<string, unknown>
): ContactFaqEditorDraft;

export function parseContactFaqEditorSubmission(value: string | unknown): {
  ko: ContactFaqLocaleContent;
  en: ContactFaqLocaleContent;
};

export function contactFaqCategoryUsage(
  draft: Pick<ContactFaqEditorDraft, 'faqs'>,
  categoryId: string
): number;

export function moveContactFaqEditorItem<T>(
  items: T[],
  index: number,
  direction: number
): T[];
