'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {AnimatePresence, LayoutGroup, motion} from 'framer-motion';

import {EmptyState} from '@/components/empty-state';
import type {Locale} from '@/i18n/routing';

export type NewsFilter = {
  id: string;
  label: string;
};

export type NewsCard = {
  id: string;
  category: string;
  categoryLabel: string;
  date: string;
  title: string;
  image: string;
  hasImage: boolean;
};

type NewsJournalGridProps = {
  filters: NewsFilter[];
  cards: NewsCard[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  locale: Locale;
};

export function NewsJournalGrid({filters, cards, empty, filterLabel, locale}: NewsJournalGridProps) {
  const [activeFilter, setActiveFilter] = useState(filters[0]?.id ?? 'all');
  const titleTextClass = locale === 'ko'
    ? "[font-family:'MaruBuri',serif] font-semibold"
    : "[font-family:'Cormorant_Garamond',serif] font-bold";
  const bodyTextClass = "[font-family:'Pretendard',sans-serif] font-normal";
  const visibleCards = useMemo(
    () => (activeFilter === 'all' ? cards : cards.filter((card) => card.category === activeFilter)),
    [activeFilter, cards]
  );

  return (
    <LayoutGroup>
      <div className="space-y-[clamp(32px,4vw,54px)]">
        <div
          className="-mx-container flex gap-3 overflow-x-auto border-y border-primary/15 px-container py-3 [scroll-snap-type:x_mandatory] md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0"
          aria-label={filterLabel}
        >
          {filters.map((filter) => {
            const isActive = filter.id === activeFilter;

            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveFilter(filter.id)}
                className={`relative min-h-11 shrink-0 cursor-pointer border px-5 py-3 ${bodyTextClass} text-[15px] leading-none tracking-normal transition duration-hover ease-brand [scroll-snap-align:start] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  isActive
                    ? 'border-primary/35 bg-white text-primary'
                    : 'border-transparent bg-transparent text-subtext hover:border-primary/25 hover:text-primary'
                }`}
              >
                {filter.label}
                {isActive ? (
                  <motion.span
                    layoutId="news-filter-underline"
                    className="absolute inset-x-4 bottom-2 h-px bg-accent"
                    transition={{duration: 0.32, ease: [0.16, 1, 0.3, 1]}}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {visibleCards.length === 0 ? (
          <EmptyState title={empty.title} body={empty.body} />
        ) : (
          <motion.div layout className="grid gap-x-[clamp(24px,2.4vw,34px)] gap-y-[clamp(42px,5vw,66px)] md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visibleCards.map((card, index) => (
                <motion.article
                  layout
                  key={card.id}
                  initial={{opacity: 0, y: 26}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, scale: 0.97}}
                  transition={{
                    duration: 0.38,
                    delay: Math.min(index * 0.04, 0.18),
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="border-t border-primary/18 bg-transparent pt-[clamp(14px,1.6vw,22px)] transition duration-hover ease-brand hover:-translate-y-1"
                >
                  <Link
                    href={`/${locale}/news/${card.id}`}
                    className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    aria-label={`${card.categoryLabel}: ${card.title}`}
                  >
                    <div className="hover-zoom">
                      <div className="hover-zoom-media">
                        <NewsCardImage card={card} />
                      </div>
                    </div>
                    <div className="px-0 py-[20px]">
                      <motion.div
                        initial={{opacity: 0, y: 8}}
                        whileInView={{opacity: 1, y: 0}}
                        viewport={{once: true, amount: 0.4}}
                        transition={{duration: 0.36, delay: 0.15, ease: [0.16, 1, 0.3, 1]}}
                        className={`${bodyTextClass} flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-none text-subtext`}
                      >
                        <span className="text-accent">{card.categoryLabel}</span>
                        <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                        <span>{card.date}</span>
                      </motion.div>
                      <h3 className={`${titleTextClass} mt-[12px] text-[clamp(20px,1.7vw,24px)] leading-[1.3] text-primary`}>
                        {card.title}
                      </h3>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}

function NewsCardImage({card}: {card: NewsCard}) {
  if (!card.hasImage) {
    return (
      <div
        className="flex aspect-[4/3] w-full items-center justify-center break-all border border-hairline bg-bg p-5 text-center [font-family:'Pretendard',sans-serif] text-[15px] font-normal leading-5 tracking-normal text-subtext"
        role="img"
        aria-label={card.image}
      >
        {card.image}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg">
      <Image
        src={`/images/${card.image}`}
        alt={`${card.categoryLabel} ${card.title}`}
        fill
        sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
