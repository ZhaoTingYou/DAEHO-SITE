'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';

import {EmptyState} from '@/components/empty-state';
import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';

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
    <div className="space-y-8 md:space-y-[clamp(32px,4vw,54px)]">
      <div
        className="mobile-news-filters sticky top-[calc(var(--mobile-header-height)+env(safe-area-inset-top))] z-20 -mx-container flex gap-1 overflow-x-auto border-y border-primary/15 bg-white px-container py-2 [scroll-snap-type:x_mandatory] md:static md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:bg-transparent md:px-0 md:py-3"
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
              className={`relative min-h-11 shrink-0 cursor-pointer border px-4 py-3 ${bodyTextClass} text-[16px] leading-none tracking-normal transition duration-hover ease-brand [scroll-snap-align:start] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:px-5 md:text-[15px] ${
                isActive
                  ? 'border-transparent bg-transparent text-primary'
                  : 'border-transparent bg-transparent text-subtext hover:text-primary'
              }`}
            >
              {filter.label}
              {isActive ? <span className="absolute inset-x-4 bottom-2 h-px bg-accent" /> : null}
            </button>
          );
        })}
      </div>

      {visibleCards.length === 0 ? (
        <EmptyState title={empty.title} body={empty.body} />
      ) : (
        <div className="grid gap-0 divide-y divide-primary/15 md:grid-cols-2 md:gap-x-[clamp(24px,2.4vw,34px)] md:gap-y-[clamp(42px,5vw,66px)] md:divide-y-0 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <article
              key={card.id}
              className="bg-transparent transition duration-hover ease-brand hover:-translate-y-1"
            >
              <Link
                href={`/${locale}/news/${card.id}`}
                className="group grid grid-cols-[128px_minmax(0,1fr)] gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:block md:py-0"
                aria-label={`${card.categoryLabel}: ${card.title}`}
              >
                <div className="hover-zoom">
                  <div className="hover-zoom-media">
                    <NewsCardImage card={card} />
                  </div>
                </div>
                <div className="min-w-0 px-0 py-0 md:py-[20px]">
                  <div className={`${bodyTextClass} mobile-copy flex flex-wrap items-center gap-x-3 gap-y-1 leading-none text-subtext md:text-[15px]`}>
                    <span className="text-accent">{card.categoryLabel}</span>
                    <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                    <span>{card.date}</span>
                  </div>
                  <h3 className={`${titleTextClass} mt-2 break-words text-[24px] leading-[1.22] text-primary md:mt-[12px] md:text-[clamp(20px,1.7vw,24px)] md:leading-[1.3]`}>
                    {card.title}
                  </h3>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCardImage({card}: {card: NewsCard}) {
  if (!card.hasImage) {
    return (
      <div
        className="flex aspect-[3/4] max-md:aspect-[4/3] w-full items-center justify-center break-all border border-hairline bg-bg p-3 text-center [font-family:'Pretendard',sans-serif] text-[16px] font-normal leading-5 tracking-normal text-subtext md:p-5 md:text-[15px]"
        role="img"
        aria-label={card.image}
      >
        {card.image}
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/4] max-md:aspect-[4/3] w-full overflow-hidden bg-bg">
      <Image
        src={imageSrc(card.image)}
        alt={`${card.categoryLabel} ${card.title}`}
        fill
        sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
