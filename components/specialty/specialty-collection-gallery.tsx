'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion, useScroll, useTransform, type MotionValue} from 'framer-motion';

import {EmptyState} from '@/components/empty-state';
import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import type {Locale} from '@/i18n/routing';

export type SpecialtyCollectionFilter = {
  id: string;
  label: string;
  description?: string;
  image?: string;
  hasImage?: boolean;
};

type CollectionImageSource = {
  title: string;
  caption: string;
  image: string;
  hasImage: boolean;
};

export type SpecialtyCollectionItem = {
  id: string;
  title: string;
  caption: string;
  category: string;
  categoryLabel: string;
  sportCategory?: string;
  sportCategoryLabel?: string;
  year?: string;
  image: string;
  hasImage: boolean;
};

type CollectionFinderLabels = {
  eyebrow: string;
  title: string;
  body: string;
  filterButton: string;
  filterBy: string;
  sportCategory: string;
  year: string;
  all: string;
  clear: string;
  apply: string;
  close: string;
  results: string;
};

type SpecialtyCollectionGalleryProps = {
  filters: SpecialtyCollectionFilter[];
  items: SpecialtyCollectionItem[];
  chooseLabel: string;
  countSuffix: string;
  viewLabel: string;
  locale: Locale;
};

type SpecialtyCollectionCategoryProps = {
  categoryId: string;
  filters: SpecialtyCollectionFilter[];
  items: SpecialtyCollectionItem[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  allLabel: string;
  countSuffix: string;
  finder: CollectionFinderLabels;
  locale: Locale;
};

export function SpecialtyCollectionGallery({
  filters,
  items,
  chooseLabel,
  countSuffix,
  viewLabel,
  locale
}: SpecialtyCollectionGalleryProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const formatCount = (count: number) => `${count}${locale === 'en' ? ' ' : ''}${countSuffix}`;

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      map[item.category] = (map[item.category] ?? 0) + 1;
    });
    return map;
  }, [items]);

  const categoryCards = useMemo(
    () =>
      filters.map((filter) => {
        const categoryItems = items.filter((item) => item.category === filter.id);
        return {
          ...filter,
          count: counts[filter.id] ?? 0,
          item:
            filter.image && filter.hasImage
              ? {
                  title: filter.label,
                  caption: filter.description ?? filter.label,
                  image: filter.image,
                  hasImage: filter.hasImage
                }
              : categoryItems.find((item) => item.hasImage) ?? categoryItems[0],
          description: filter.description ?? categoryItems[0]?.caption ?? ''
        };
      }),
    [counts, filters, items]
  );

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.4, ease: [0.16, 1, 0.3, 1]}}
    >
      <div
        role="group"
        aria-label={chooseLabel}
        className="grid"
      >
        {categoryCards.map((category, index) => (
          <CollectionStagePanel
            key={category.id}
            index={index}
            label={category.label}
            description={category.description}
            countText={formatCount(category.count)}
            viewLabel={viewLabel}
            href={`/${locale}/specialty/collection/${category.id}`}
            item={category.item}
            reducedMotion={prefersReducedMotion}
            textSide={index === 1 ? 'left' : 'right'}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function SpecialtyCollectionCategory({
  categoryId,
  filters,
  items,
  empty,
  filterLabel,
  allLabel,
  countSuffix,
  finder,
  locale
}: SpecialtyCollectionCategoryProps) {
  const [finderOpen, setFinderOpen] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const activeFilter = filters.find((filter) => filter.id === categoryId);
  const visibleItems = useMemo(
    () => items.filter((item) => item.category === categoryId),
    [categoryId, items]
  );
  const formatCount = (count: number) => `${count}${locale === 'en' ? ' ' : ''}${countSuffix}`;
  const backHref = `/${locale}/specialty/collection`;

  if (!activeFilter) {
    return null;
  }

  if (categoryId === 'champion') {
    return (
      <CollectionFinderView
        items={visibleItems}
        empty={empty}
        filterLabel={filterLabel}
        activeLabel={activeFilter.label}
        allLabel={allLabel}
        labels={finder}
        selectedSports={selectedSports}
        selectedYears={selectedYears}
        setSelectedSports={setSelectedSports}
        setSelectedYears={setSelectedYears}
        finderOpen={finderOpen}
        setFinderOpen={setFinderOpen}
        backHref={backHref}
        locale={locale}
      />
    );
  }

  if (categoryId === 'appointment') {
    return (
      <AppointmentCollectionView
        items={visibleItems}
        empty={empty}
        filterLabel={filterLabel}
        activeLabel={activeFilter.label}
        allLabel={allLabel}
        backHref={backHref}
        locale={locale}
      />
    );
  }

  return (
    <CollectionGridView
      items={visibleItems}
      empty={empty}
      filterLabel={filterLabel}
      activeLabel={activeFilter.label}
      allLabel={allLabel}
      countText={formatCount(visibleItems.length)}
      backHref={backHref}
      locale={locale}
    />
  );
}

function CollectionGridView({
  items,
  empty,
  filterLabel,
  activeLabel,
  allLabel,
  countText,
  backHref,
  locale
}: {
  items: SpecialtyCollectionItem[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  activeLabel: string;
  allLabel: string;
  countText: string;
  backHref: string;
  locale: Locale;
}) {
  return (
    <div className="mx-auto max-w-[1280px] px-container">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-hairline pb-5">
        <div className="space-y-2">
          <Link
            href={backHref}
            className="link-sweep font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            {allLabel}
          </Link>
          <h2 className="font-heading text-[clamp(24px,2.6vw,36px)] font-semibold leading-tight text-primary">
            {activeLabel}
          </h2>
        </div>
        <span className="font-numeric text-[12px] font-semibold tracking-[0.04em] text-subtext">
          {countText}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="pt-10">
          <EmptyState title={empty.title} body={empty.body} />
        </div>
      ) : (
        <CollectionProductGrid
          items={items}
          filterLabel={filterLabel}
          locale={locale}
          columns="md:grid-cols-3"
        />
      )}
    </div>
  );
}

function AppointmentCollectionView({
  items,
  empty,
  filterLabel,
  activeLabel,
  allLabel,
  backHref,
  locale
}: {
  items: SpecialtyCollectionItem[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  activeLabel: string;
  allLabel: string;
  backHref: string;
  locale: Locale;
}) {
  const featuredItems = items.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1180px] px-container">
      <div className="border-b border-hairline pb-[clamp(24px,4vw,44px)] pt-[clamp(8px,2vw,20px)] text-center">
        <Link
          href={backHref}
          className="link-sweep font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
        >
          {allLabel}
        </Link>
        <h2 className="mt-[clamp(24px,4vw,52px)] font-heading text-[clamp(32px,4.2vw,54px)] font-semibold leading-none text-primary">
          {activeLabel}
        </h2>
      </div>

      {featuredItems.length === 0 ? (
        <div className="pt-10">
          <EmptyState title={empty.title} body={empty.body} />
        </div>
      ) : (
        <div
          aria-label={filterLabel}
          className="space-y-[clamp(72px,9vw,128px)] pt-[clamp(56px,7vw,96px)]"
        >
          {featuredItems.map((item, index) => (
            <motion.article
              key={item.id}
              className="mx-auto max-w-[760px]"
              initial={{opacity: 0, y: 34}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, margin: '-12% 0px'}}
              transition={{
                duration: 0.48,
                delay: Math.min(index * 0.05, 0.12),
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <Link
                href={`/${locale}/specialty/collection/${item.id}`}
                className="group block min-h-11 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                aria-label={`${item.title}: ${item.caption}`}
              >
                <div className="mx-auto w-full max-w-[min(620px,88vw)]">
                  <CollectionImage
                    item={item}
                    aspect="aspect-square"
                    sizes="(min-width: 1024px) 620px, 88vw"
                    priority={index === 0}
                  />
                </div>
                <div className="mx-auto mt-[clamp(20px,3vw,34px)] max-w-[520px] space-y-2 text-center">
                  <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                    {item.categoryLabel}
                  </p>
                  <h3 className="font-heading text-[clamp(24px,3vw,34px)] font-semibold leading-tight text-primary">
                    {item.title}
                  </h3>
                  <p className="font-body text-[13px] leading-7 text-subtext">{item.caption}</p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionFinderView({
  items,
  empty,
  filterLabel,
  activeLabel,
  allLabel,
  labels,
  selectedSports,
  selectedYears,
  setSelectedSports,
  setSelectedYears,
  finderOpen,
  setFinderOpen,
  backHref,
  locale
}: {
  items: SpecialtyCollectionItem[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  activeLabel: string;
  allLabel: string;
  labels: CollectionFinderLabels;
  selectedSports: string[];
  selectedYears: string[];
  setSelectedSports: (values: string[]) => void;
  setSelectedYears: (values: string[]) => void;
  finderOpen: boolean;
  setFinderOpen: (open: boolean) => void;
  backHref: string;
  locale: Locale;
}) {
  const sportOptions = useMemo(
    () => buildCollectionOptions(items, 'sportCategory', 'sportCategoryLabel'),
    [items]
  );
  const yearOptions = useMemo(() => buildCollectionOptions(items, 'year', 'year', true), [items]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const sportMatches = selectedSports.length === 0 || selectedSports.includes(item.sportCategory ?? '');
        const yearMatches = selectedYears.length === 0 || selectedYears.includes(item.year ?? '');
        return sportMatches && yearMatches;
      }),
    [items, selectedSports, selectedYears]
  );
  const clearFilters = () => {
    setSelectedSports([]);
    setSelectedYears([]);
  };

  return (
    <div className="relative bg-white pb-[calc(112px+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[1480px] px-container">
        <div className="border-b border-hairline pb-[clamp(24px,4vw,48px)] pt-[clamp(10px,2vw,22px)]">
          <Link
            href={backHref}
            className="link-sweep mb-[clamp(34px,5vw,72px)] font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            {allLabel}
          </Link>
          <div className="mx-auto max-w-3xl space-y-7 text-center">
            <div className="space-y-4">
              <h2 className="font-heading text-[clamp(32px,4.2vw,54px)] font-semibold leading-none text-primary">
                {activeLabel}
              </h2>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="pt-10">
            <EmptyState title={empty.title} body={empty.body} />
          </div>
        ) : (
          <CollectionProductGrid
            items={filteredItems}
            filterLabel={filterLabel}
            locale={locale}
            columns="sm:grid-cols-2 lg:grid-cols-4"
            finder
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setFinderOpen(true)}
        className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 z-[70] inline-flex min-h-12 -translate-x-1/2 items-center gap-3 rounded-full bg-accent px-7 font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(122,34,48,.24)] transition duration-hover ease-brand hover:bg-primary hover:shadow-[0_20px_52px_rgba(16,29,48,.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        aria-expanded={finderOpen}
      >
        <SlidersIcon />
        <span>{labels.filterButton}</span>
      </button>

      <AnimatePresence>
        {finderOpen ? (
          <CollectionFilterDrawer
            labels={labels}
            sportOptions={sportOptions}
            yearOptions={yearOptions}
            selectedSports={selectedSports}
            selectedYears={selectedYears}
            setSelectedSports={setSelectedSports}
            setSelectedYears={setSelectedYears}
            clearFilters={clearFilters}
            close={() => setFinderOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CollectionProductGrid({
  items,
  filterLabel,
  locale,
  columns,
  finder = false
}: {
  items: SpecialtyCollectionItem[];
  filterLabel: string;
  locale: Locale;
  columns: string;
  finder?: boolean;
}) {
  return (
    <div
      aria-label={filterLabel}
      className={`grid grid-cols-2 gap-x-[clamp(18px,2.4vw,40px)] gap-y-[clamp(42px,5vw,76px)] pt-[clamp(32px,4vw,64px)] ${columns}`}
    >
      {items.map((item, index) => (
        <motion.article
          key={item.id}
          initial={{opacity: 0, y: 22}}
          animate={{opacity: 1, y: 0}}
          transition={{
            duration: 0.4,
            delay: Math.min(index * 0.04, 0.2),
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <Link
            href={`/${locale}/specialty/collection/${item.id}`}
            className="group block min-h-11 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            aria-label={`${item.title}: ${item.caption}`}
          >
            <CollectionImage
              item={item}
              aspect="aspect-square"
              sizes={finder ? '(min-width: 1280px) 280px, (min-width: 768px) 38vw, 50vw' : '(min-width: 1024px) 340px, 50vw'}
            />
            <div className={finder ? 'space-y-1 px-1 pt-4' : 'space-y-1.5 px-1 pt-5'}>
              <h3 className="font-heading text-[clamp(15px,1.3vw,18px)] font-semibold leading-snug text-primary">
                {item.title}
              </h3>
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                {item.categoryLabel}
              </p>
              <p className="font-body text-[12px] leading-6 text-subtext">{item.caption}</p>
              {finder ? (
                <p className="font-numeric text-[11px] uppercase tracking-[0.12em] text-subtext">
                  {[item.sportCategoryLabel, item.year].filter(Boolean).join(' / ')}
                </p>
              ) : null}
            </div>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}

function CollectionFilterDrawer({
  labels,
  sportOptions,
  yearOptions,
  selectedSports,
  selectedYears,
  setSelectedSports,
  setSelectedYears,
  clearFilters,
  close
}: {
  labels: CollectionFinderLabels;
  sportOptions: CollectionFinderOption[];
  yearOptions: CollectionFinderOption[];
  selectedSports: string[];
  selectedYears: string[];
  setSelectedSports: (values: string[]) => void;
  setSelectedYears: (values: string[]) => void;
  clearFilters: () => void;
  close: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close]);

  return (
    <motion.div
      className="fixed inset-0 z-[90] bg-primary/45"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={close}
        aria-label={labels.close}
      />
      <motion.aside
        className="absolute left-0 top-0 flex h-dvh w-full max-w-[496px] flex-col bg-white shadow-[24px_0_80px_rgba(16,29,48,.2)]"
        initial={{x: '-100%'}}
        animate={{x: 0}}
        exit={{x: '-100%'}}
        transition={{duration: 0.42, ease: [0.16, 1, 0.3, 1]}}
        role="dialog"
        aria-modal="true"
        aria-label={labels.filterBy}
      >
        <div className="grid min-h-[112px] grid-cols-[72px_1fr_auto] items-center border-b border-hairline bg-bg">
          <button
            type="button"
            onClick={close}
            className="grid h-full min-h-14 place-items-center border-r border-hairline text-primary transition duration-hover ease-brand hover:bg-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent"
            aria-label={labels.close}
          >
            <span className="text-[24px] leading-none" aria-hidden="true">
              x
            </span>
          </button>
          <div className="space-y-2 px-6">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.26em] text-subtext">
              {labels.filterBy}
            </p>
            <h3 className="font-heading text-[clamp(25px,2.2vw,32px)] font-semibold leading-none text-primary">
              {labels.filterButton}
            </h3>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mr-6 min-h-11 whitespace-nowrap border-b border-primary font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-primary transition duration-hover ease-brand hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {labels.clear}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[clamp(24px,4vw,48px)] py-8">
          <FilterSection
            title={labels.sportCategory}
            options={sportOptions}
            selected={selectedSports}
            setSelected={setSelectedSports}
            allLabel={labels.all}
          />
          <FilterSection
            title={labels.year}
            options={yearOptions}
            selected={selectedYears}
            setSelected={setSelectedYears}
            allLabel={labels.all}
          />
        </div>
      </motion.aside>
    </motion.div>
  );
}

function FilterSection({
  title,
  options,
  selected,
  setSelected,
  allLabel
}: {
  title: string;
  options: CollectionFinderOption[];
  selected: string[];
  setSelected: (values: string[]) => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="border-b border-hairline first:border-t">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-[72px] w-full items-center justify-between gap-4 text-left font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-primary transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="font-numeric text-[18px]">{open ? '-' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-7">
              <FilterOptionButton
                label={allLabel}
                count={options.reduce((sum, option) => sum + option.count, 0)}
                active={selected.length === 0}
                onClick={() => setSelected([])}
              />
              {options.map((option) => (
                <FilterOptionButton
                  key={option.id}
                  label={option.label}
                  count={option.count}
                  active={selected.includes(option.id)}
                  onClick={() => setSelected(toggleCollectionFilter(selected, option.id))}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function FilterOptionButton({
  label,
  count,
  active,
  onClick
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-12 w-full items-center gap-4 text-left font-body text-[13px] transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active ? 'text-primary' : 'text-text hover:text-primary'
      }`}
      aria-pressed={active}
    >
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center border transition duration-hover ease-brand ${
          active ? 'border-primary bg-primary text-white' : 'border-hairline bg-white text-transparent group-hover:border-primary'
        }`}
        aria-hidden="true"
      >
        <CheckIcon />
      </span>
      <span className="flex-1">{label}</span>
      <span className="font-numeric text-[11px] text-subtext">{count}</span>
    </button>
  );
}

function SlidersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[17px] w-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M4 17h16" />
      <path d="M9 4v6" />
      <path d="M15 14v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 6.25 4.8 8.75 9.75 3.25" />
    </svg>
  );
}

type CollectionFinderOption = {
  id: string;
  label: string;
  count: number;
};

function buildCollectionOptions(
  items: SpecialtyCollectionItem[],
  valueKey: 'sportCategory' | 'year',
  labelKey: 'sportCategoryLabel' | 'year',
  sortDescending = false
) {
  const options = new Map<string, CollectionFinderOption>();

  items.forEach((item) => {
    const value = item[valueKey];
    const label = item[labelKey];

    if (!value || !label) {
      return;
    }

    const current = options.get(value);
    options.set(value, {
      id: value,
      label,
      count: (current?.count ?? 0) + 1
    });
  });

  const values = Array.from(options.values());
  return sortDescending ? values.sort((a, b) => b.id.localeCompare(a.id, undefined, {numeric: true})) : values;
}

function toggleCollectionFilter(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function CollectionStagePanel({
  index,
  label,
  description,
  countText,
  viewLabel,
  href,
  item,
  reducedMotion,
  textSide
}: {
  index: number;
  label: string;
  description: string;
  countText: string;
  viewLabel: string;
  href: string;
  item?: CollectionImageSource;
  reducedMotion: boolean;
  textSide: 'left' | 'right';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });
  const imageY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [24, -24]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], reducedMotion ? [1, 1, 1] : [1.025, 1, 1.025]);
  const textX = useTransform(
    scrollYProgress,
    [0.16, 0.48],
    reducedMotion ? [0, 0] : textSide === 'left' ? [-28, 0] : [28, 0]
  );
  const textY = useTransform(scrollYProgress, [0.16, 0.48], reducedMotion ? [0, 0] : [34, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.16, 0.42], reducedMotion ? [1, 1] : [0.35, 1]);

  return (
    <section
      ref={ref}
      className="relative min-h-[78svh] overflow-hidden bg-black text-on-navy md:min-h-[92svh]"
      aria-label={label}
    >
      <motion.div
        initial={reducedMotion ? {opacity: 1} : {opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true, amount: 0.2}}
        transition={{duration: 1, delay: Math.min(index * 0.06, 0.16), ease: [0.16, 1, 0.3, 1]}}
        className="absolute inset-0 w-full"
      >
        <StageImage
          item={item}
          priority={index === 0}
          y={imageY}
          scale={imageScale}
        />
      </motion.div>

      <div
        className={`pointer-events-none absolute inset-0 ${
          textSide === 'left'
            ? 'bg-gradient-to-r from-black via-black/68 to-black/5'
            : 'bg-gradient-to-l from-black via-black/68 to-black/5'
        }`}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid min-h-[78svh] max-w-[1440px] items-center px-container py-[clamp(84px,9vw,150px)] md:min-h-[92svh] md:grid-cols-2">
        <motion.div
          style={{opacity: textOpacity, x: textX, y: textY}}
          className={`max-w-[340px] space-y-5 ${
            textSide === 'left'
              ? 'md:col-start-1 md:ml-[clamp(28px,5vw,96px)] md:justify-self-start'
              : 'md:col-start-2 md:mr-[clamp(28px,5vw,96px)] md:justify-self-end'
          }`}
        >
          <div className="space-y-3">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-on-navy/70">
              {description}
            </p>
            <h2 className="font-heading text-[clamp(26px,3.1vw,42px)] font-semibold leading-[1.12] text-on-navy">
              {label}
            </h2>
            <p className="font-numeric text-[11px] font-semibold tracking-[0.08em] text-on-navy/60">
              {String(index + 1).padStart(2, '0')} / {countText}
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-on-navy/45 px-6 py-2.5 font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-on-navy transition duration-hover ease-brand hover:border-on-navy hover:bg-on-navy hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-on-navy"
          >
            {viewLabel}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function StageImage({
  item,
  priority,
  y,
  scale
}: {
  item?: CollectionImageSource;
  priority: boolean;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}) {
  if (!item || !item.hasImage) {
    return (
      <div
        className="flex h-full w-full items-center justify-center break-all bg-black p-8 text-center font-body text-[10px] font-semibold leading-5 tracking-[0.04em] text-on-navy/60"
        role="img"
        aria-label={item?.image ?? 'image pending'}
      >
        {item?.image ?? 'image pending'}
      </div>
    );
  }

  return (
    <motion.div className="absolute inset-0 will-change-transform" style={{y, scale}}>
      <Image
        src={`/images/${item.image}`}
        alt={`${item.title} ${item.caption}`}
        fill
        sizes="100vw"
        priority={priority}
        className="object-cover object-center"
      />
    </motion.div>
  );
}

function CollectionImage({
  item,
  aspect,
  sizes,
  priority = false
}: {
  item?: SpecialtyCollectionItem;
  aspect: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!item || !item.hasImage) {
    return (
      <div
        className={`${aspect} flex w-full items-center justify-center break-all border border-hairline bg-bg p-4 text-center font-body text-[10px] font-semibold leading-5 tracking-[0.04em] text-subtext`}
        role="img"
        aria-label={item?.image ?? 'image pending'}
      >
        {item?.image ?? 'image pending'}
      </div>
    );
  }

  return (
    <div className={`${aspect} hover-zoom relative w-full overflow-hidden bg-bg`}>
      <div className="hover-zoom-media absolute inset-0">
        <Image
          src={`/images/${item.image}`}
          alt={`${item.title} ${item.caption}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    </div>
  );
}
