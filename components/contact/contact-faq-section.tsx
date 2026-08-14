'use client';

import {useId, useMemo, useReducer} from 'react';

import {
  groupContactFaqs,
  type ContactFaqCategory,
  type ContactFaqGroupId,
  type ContactFaqSourceItem
} from '@/lib/contact-faq-core.mjs';
import {
  createInitialContactFaqState,
  reduceContactFaqInteraction
} from '@/lib/contact-faq-interaction-core.mjs';

type ContactFaqSectionProps = {
  title: string;
  categories: ContactFaqCategory[];
  otherLabel: string;
  faqs: ContactFaqSourceItem[];
};

export function ContactFaqSection({title, categories, otherLabel, faqs}: ContactFaqSectionProps) {
  const instanceId = useId().replace(/:/g, '');
  const groups = useMemo(
    () => groupContactFaqs(faqs, categories, otherLabel),
    [faqs, categories, otherLabel]
  );
  const [state, dispatch] = useReducer(
    reduceContactFaqInteraction,
    groups[0]?.id ?? null,
    createInitialContactFaqState
  );
  const headingId = `contact-faq-${instanceId}-heading`;

  return (
    <section aria-labelledby={headingId} className="bg-bg py-[var(--mobile-section-space)] md:py-section">
      <div className="mx-auto max-w-[1240px] px-[var(--mobile-page-gutter)] md:px-container">
        <header className="mb-12 max-w-3xl md:mb-20">
          <p className="mb-5 font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-subtext">
            FAQ / INDEX
          </p>
          <h2 id={headingId} className="font-heading text-[clamp(30px,4vw,52px)] font-semibold leading-[1.08] text-primary">
            {title}
          </h2>
        </header>

        <div>
          {groups.map((group, groupIndex) => {
            const categoryOpen = state.openCategory === group.id;
            const categoryPanelId = `contact-faq-${instanceId}-${group.id}-panel`;
            const categoryButtonId = `contact-faq-${instanceId}-${group.id}-button`;
            const indexedItems = group.items.map((item, index) => ({item, index}));
            const splitAt = Math.ceil(indexedItems.length / 2);
            const columns = [indexedItems.slice(0, splitAt), indexedItems.slice(splitAt)];

            return (
              <article key={group.id} className="border-t border-primary/70 last:border-b">
                <button
                  id={categoryButtonId}
                  type="button"
                  data-contact-faq-category={group.id}
                  aria-expanded={categoryOpen}
                  aria-controls={categoryPanelId}
                  className="mobile-tap-target grid min-h-[72px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left md:hidden"
                  onClick={() => dispatch({type: 'toggleCategory', category: group.id})}
                >
                  <span className="font-numeric text-[11px] tracking-[0.08em] text-accent">
                    {chapterNumber(groupIndex)}
                  </span>
                  <span className="font-heading text-[18px] font-semibold leading-tight text-primary">
                    {group.label}
                  </span>
                  <span className="flex items-center gap-3 font-numeric text-[11px] tracking-[0.08em] text-subtext">
                    {itemCount(group.items.length)}
                    <AccordionMark open={categoryOpen} />
                  </span>
                </button>

                <div
                  id={categoryPanelId}
                  role="region"
                  aria-labelledby={categoryButtonId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-brand motion-reduce:transition-none ${
                    categoryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  } md:grid-rows-[1fr]`}
                >
                  <div className="overflow-hidden md:overflow-visible">
                    <div className="pb-9 md:grid md:grid-cols-[176px_minmax(0,1fr)] md:gap-12 md:py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
                      <div className="hidden self-start md:block">
                        <div className="sticky top-28">
                          <p className="font-numeric text-[11px] tracking-[0.14em] text-accent">
                            {chapterNumber(groupIndex)} / {itemCount(groups.length)}
                          </p>
                          <h3 className="mt-5 max-w-[180px] font-heading text-[clamp(22px,2.2vw,30px)] font-semibold leading-[1.15] text-primary">
                            {group.label}
                          </h3>
                          <p className="mt-4 font-numeric text-[10px] uppercase tracking-[0.2em] text-subtext">
                            {itemCount(group.items.length)} FAQ
                          </p>
                        </div>
                      </div>

                      <div className="grid min-w-0 gap-x-10 md:grid-cols-2 lg:gap-x-14">
                        {columns.map((column, columnIndex) => (
                          <div key={`${group.id}-column-${columnIndex}`} className="min-w-0">
                            {column.map(({item, index}) => (
                              <FaqQuestion
                                key={`${group.id}-${item.question}`}
                                instanceId={instanceId}
                                groupId={group.id}
                                item={item}
                                index={index}
                                open={state.openQuestion === `${group.id}-${index}`}
                                onToggle={() => dispatch({
                                  type: 'toggleQuestion',
                                  question: `${group.id}-${index}`
                                })}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqQuestion({
  instanceId,
  groupId,
  item,
  index,
  open,
  onToggle
}: {
  instanceId: string;
  groupId: ContactFaqGroupId;
  item: ContactFaqSourceItem;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const questionId = `contact-faq-${instanceId}-${groupId}-${index}-question`;
  const answerId = `contact-faq-${instanceId}-${groupId}-${index}-answer`;

  return (
    <div className="border-b border-hairline">
      <button
        id={questionId}
        type="button"
        data-contact-faq-question={`${groupId}-${index}`}
        aria-expanded={open}
        aria-controls={answerId}
        className="mobile-tap-target grid min-h-[68px] w-full grid-cols-[28px_minmax(0,1fr)_22px] items-center gap-3 py-4 text-left md:min-h-[76px] md:gap-4"
        onClick={onToggle}
      >
        <span className="self-start pt-1 font-numeric text-[10px] tracking-[0.08em] text-subtext">
          {itemCount(index + 1)}
        </span>
        <span className="font-body text-[15px] font-semibold leading-[1.55] text-primary md:text-[16px]">
          {item.question}
        </span>
        <AccordionMark open={open} />
      </button>
      <div
        id={answerId}
        role="region"
        aria-labelledby={questionId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-brand motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="mobile-copy whitespace-pre-line break-words pb-7 pl-[40px] pr-2 font-body text-subtext md:pb-8 md:pl-[44px] md:pr-5 md:text-[14px] md:leading-[1.9]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function AccordionMark({open}: {open: boolean}) {
  return (
    <span aria-hidden="true" className="relative block h-4 w-4 justify-self-end text-accent">
      <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
      <span
        className={`absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-300 motion-reduce:transition-none ${
          open ? 'scale-y-0' : 'scale-y-100'
        }`}
      />
    </span>
  );
}

function chapterNumber(index: number) {
  return itemCount(index + 1);
}

function itemCount(value: number) {
  return String(value).padStart(2, '0');
}
