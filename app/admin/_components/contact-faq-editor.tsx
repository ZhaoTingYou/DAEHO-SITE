'use client';

import {useMemo, useState} from 'react';

import {
  contactFaqCategoryUsage,
  moveContactFaqEditorItem,
  type ContactFaqEditorCategory,
  type ContactFaqEditorCopy,
  type ContactFaqEditorDraft,
  type ContactFaqEditorFaq
} from '@/lib/cms/contact-faq-editor-core.mjs';

export type ContactFaqEditorLabels = {
  title: string;
  hint: string;
  categories: string;
  addCategory: string;
  categoryId: string;
  categoryKo: string;
  categoryEn: string;
  categoryInUse: string;
  minimumCategory: string;
  faqs: string;
  addFaq: string;
  category: string;
  koQuestion: string;
  koAnswer: string;
  enQuestion: string;
  enAnswer: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  confirmDeleteCategory: string;
  confirmDeleteFaq: string;
  expand: string;
  collapse: string;
};

type Props = {
  draft: ContactFaqEditorDraft;
  labels: ContactFaqEditorLabels;
};

const emptyCopy = (): ContactFaqEditorCopy => ({question: '', answer: ''});

export function ContactFaqEditor({draft, labels}: Props) {
  const [categories, setCategories] = useState<ContactFaqEditorCategory[]>(draft.categories);
  const [faqs, setFaqs] = useState<ContactFaqEditorFaq[]>(draft.faqs);
  const [openFaqId, setOpenFaqId] = useState<string | null>(draft.faqs[0]?.id ?? null);
  const payload = useMemo(() => JSON.stringify({categories, faqs}), [categories, faqs]);

  const addCategory = () => {
    setCategories((current) => [
      ...current,
      {id: `category-${crypto.randomUUID()}`, koLabel: '', enLabel: ''}
    ]);
  };

  const updateCategory = (index: number, patch: Partial<ContactFaqEditorCategory>) => {
    const previousId = categories[index]?.id;
    setCategories((current) => current.map((item, itemIndex) => (
      itemIndex === index ? {...item, ...patch} : item
    )));

    if (previousId && patch.id !== undefined && patch.id !== previousId) {
      setFaqs((current) => current.map((item) => (
        item.category === previousId ? {...item, category: patch.id ?? ''} : item
      )));
    }
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    setCategories((current) => moveContactFaqEditorItem(current, index, direction));
  };

  const removeCategory = (index: number) => {
    const category = categories[index];
    if (!category) {
      return;
    }

    const usage = contactFaqCategoryUsage({faqs}, category.id);
    if (usage > 0) {
      window.alert(labels.categoryInUse.replace('{count}', String(usage)));
      return;
    }

    if (categories.length <= 1) {
      window.alert(labels.minimumCategory);
      return;
    }

    if (window.confirm(labels.confirmDeleteCategory)) {
      setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  const addFaq = () => {
    const item = {
      id: `faq-${crypto.randomUUID()}`,
      category: categories[0]?.id ?? '',
      ko: emptyCopy(),
      en: emptyCopy()
    };
    setFaqs((current) => [...current, item]);
    setOpenFaqId(item.id);
  };

  const updateFaq = (index: number, patch: Partial<ContactFaqEditorFaq>) => {
    setFaqs((current) => current.map((item, itemIndex) => (
      itemIndex === index ? {...item, ...patch} : item
    )));
  };

  const updateFaqCopy = (
    index: number,
    locale: 'ko' | 'en',
    patch: Partial<ContactFaqEditorCopy>
  ) => {
    setFaqs((current) => current.map((item, itemIndex) => (
      itemIndex === index
        ? {...item, [locale]: {...item[locale], ...patch}}
        : item
    )));
  };

  const moveFaq = (index: number, direction: -1 | 1) => {
    setFaqs((current) => moveContactFaqEditorItem(current, index, direction));
  };

  const removeFaq = (index: number) => {
    const item = faqs[index];
    if (!item || !window.confirm(labels.confirmDeleteFaq)) {
      return;
    }

    setFaqs((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setOpenFaqId((current) => current === item.id ? null : current);
  };

  return (
    <section className="grid gap-6 rounded-xl border border-[#d9dee7] bg-white p-5 shadow-[0_14px_40px_rgba(16,24,39,.06)]">
      <input type="hidden" name="contactFaq.payload" value={payload} readOnly />

      <header className="border-b border-[#e4e7ec] pb-5">
        <p className="font-numeric text-xs font-semibold uppercase tracking-[0.18em] text-[#7a2230]">Contact / FAQ</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#101828]">{labels.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">{labels.hint}</p>
      </header>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#101828]">{labels.categories}</h3>
            <p className="mt-1 text-xs text-[#98a2b3]">{categories.length}</p>
          </div>
          <button type="button" onClick={addCategory} className={secondaryButtonClass}>
            + {labels.addCategory}
          </button>
        </div>

        <div className="grid gap-3">
          {categories.map((category, index) => {
            const usage = contactFaqCategoryUsage({faqs}, category.id);
            return (
              <article key={`contact-faq-category-${index}`} className="grid gap-4 rounded-lg border border-[#e4e7ec] bg-[#fbfcfe] p-4 lg:grid-cols-[72px_minmax(150px,.8fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] lg:items-end">
                <div>
                  <p className="font-numeric text-lg font-semibold text-[#7a2230]">{String(index + 1).padStart(2, '0')}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#98a2b3]">{usage} FAQ</p>
                </div>
                <EditorField label={labels.categoryId}>
                  <input
                    value={category.id}
                    onChange={(event) => updateCategory(index, {id: event.target.value})}
                    required
                    pattern="[a-z0-9][a-z0-9-]{0,63}"
                    className={inputClass}
                  />
                </EditorField>
                <EditorField label={labels.categoryKo}>
                  <input value={category.koLabel} onChange={(event) => updateCategory(index, {koLabel: event.target.value})} required className={inputClass} />
                </EditorField>
                <EditorField label={labels.categoryEn}>
                  <input value={category.enLabel} onChange={(event) => updateCategory(index, {enLabel: event.target.value})} required className={inputClass} />
                </EditorField>
                <EditorActions
                  index={index}
                  length={categories.length}
                  labels={labels}
                  onMove={moveCategory}
                  onDelete={() => removeCategory(index)}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 border-t border-[#e4e7ec] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#101828]">{labels.faqs}</h3>
            <p className="mt-1 text-xs text-[#98a2b3]">{faqs.length}</p>
          </div>
          <button type="button" onClick={addFaq} disabled={categories.length === 0} className={secondaryButtonClass}>
            + {labels.addFaq}
          </button>
        </div>

        <div className="grid gap-3">
          {faqs.map((item, index) => {
            const isOpen = openFaqId === item.id;
            const category = categories.find(({id}) => id === item.category);
            return (
              <article key={item.id} className="overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
                <div className="grid gap-3 bg-[#fbfcfe] p-4 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <p className="font-numeric text-lg font-semibold text-[#7a2230]">{String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-1 truncate text-[11px] font-medium text-[#98a2b3]">{category?.koLabel ?? item.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`contact-faq-editor-${item.id}`}
                    className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7a2230]"
                  >
                    <span className="block truncate text-sm font-semibold text-[#101828]">{item.ko.question || labels.koQuestion}</span>
                    <span className="mt-1 block truncate text-xs text-[#667085]">{item.en.question || labels.enQuestion}</span>
                    <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a2230]">{isOpen ? labels.collapse : labels.expand}</span>
                  </button>
                  <EditorActions
                    index={index}
                    length={faqs.length}
                    labels={labels}
                    onMove={moveFaq}
                    onDelete={() => removeFaq(index)}
                  />
                </div>

                <div id={`contact-faq-editor-${item.id}`} hidden={!isOpen} className="grid gap-5 border-t border-[#e4e7ec] p-4">
                  <EditorField label={labels.category}>
                    <select value={item.category} onChange={(event) => updateFaq(index, {category: event.target.value})} required className={inputClass}>
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>{option.koLabel} / {option.enLabel}</option>
                      ))}
                    </select>
                  </EditorField>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <LocalizedFaqFields
                      questionLabel={labels.koQuestion}
                      answerLabel={labels.koAnswer}
                      values={item.ko}
                      onChange={(patch) => updateFaqCopy(index, 'ko', patch)}
                    />
                    <LocalizedFaqFields
                      questionLabel={labels.enQuestion}
                      answerLabel={labels.enAnswer}
                      values={item.en}
                      onChange={(patch) => updateFaqCopy(index, 'en', patch)}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function LocalizedFaqFields({
  questionLabel,
  answerLabel,
  values,
  onChange
}: {
  questionLabel: string;
  answerLabel: string;
  values: ContactFaqEditorCopy;
  onChange: (patch: Partial<ContactFaqEditorCopy>) => void;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-[#e4e7ec] bg-[#fbfcfe] p-4">
      <EditorField label={questionLabel}>
        <textarea value={values.question} onChange={(event) => onChange({question: event.target.value})} required rows={2} className={inputClass} />
      </EditorField>
      <EditorField label={answerLabel}>
        <textarea value={values.answer} onChange={(event) => onChange({answer: event.target.value})} required rows={6} className={inputClass} />
      </EditorField>
    </section>
  );
}

function EditorField({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold text-[#475467]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EditorActions({
  index,
  length,
  labels,
  onMove,
  onDelete
}: {
  index: number;
  length: number;
  labels: ContactFaqEditorLabels;
  onMove: (index: number, direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className={compactButtonClass}>{labels.moveUp}</button>
      <button type="button" onClick={() => onMove(index, 1)} disabled={index === length - 1} className={compactButtonClass}>{labels.moveDown}</button>
      <button type="button" onClick={onDelete} className={deleteButtonClass}>{labels.delete}</button>
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm font-normal leading-6 text-[#101828] outline-none transition placeholder:text-[#98a2b3] focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/10';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230] disabled:cursor-not-allowed disabled:opacity-40';
const compactButtonClass = 'min-h-9 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230] disabled:cursor-not-allowed disabled:opacity-40';
const deleteButtonClass = 'min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]';
