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
  viewLabel,
  locale
}: SpecialtyCollectionGalleryProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const categoryCards = useMemo(
    () =>
      filters.map((filter) => {
        const categoryItems = items.filter((item) => item.category === filter.id);
        return {
          ...filter,
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
    [filters, items]
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
        {categoryCards.map((category, index) => {
          const imageSide = index === 1 ? 'right' : 'left';

          return (
            <CollectionStagePanel
              key={category.id}
              index={index}
              label={category.label}
              description={category.description}
              viewLabel={viewLabel}
              href={`/${locale}/mastery/creations/${category.id}`}
              item={category.item}
              reducedMotion={prefersReducedMotion}
              textSide={imageSide === 'left' ? 'right' : 'left'}
            />
          );
        })}
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
  const backHref = `/${locale}/mastery/creations`;

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

  if (categoryId === 'bespoke') {
    return (
      <BespokeCreationsView
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
      backHref={backHref}
      locale={locale}
    />
  );
}

type BespokeDisplayMode = 'archive' | 'grid';
type BespokeFilterKey = 'notice' | 'year' | 'period' | 'materials' | 'stones' | 'functions';
type BespokeSelectedFilters = Record<BespokeFilterKey, string[]>;
type BespokeFilterOption = {
  id: string;
  label: string;
  count: number;
};
type BespokeFilterSectionData = {
  id: BespokeFilterKey;
  title: string;
  options: BespokeFilterOption[];
};

const bespokeViewCopy: Record<
  Locale,
  {
    period: string;
    collectionTitle: string;
    introTitle: string;
    introBody: string;
    tabCorpus: string;
    tabNotes: string;
    filter: string;
    filterTitle: string;
    reset: string;
    apply: string;
    close: string;
    display: string;
    archive: string;
    grid: string;
    shuffle: string;
    withNotice: string;
    withoutNotice: string;
    filterSections: Record<BespokeFilterKey, string>;
    filterOptions: Record<BespokeFilterKey, Record<string, string>>;
    archiveChapterPeriod: string;
    archiveChapterTitle: string;
    chapterEyebrow: string;
    chapterTitle: string;
    chapterBody: string;
    featureEyebrow: string;
    featureTitle: string;
    featureBody: string;
    process: Array<{label: string; title: string; body: string}>;
  }
> = {
  ko: {
    period: '2022 - 2026',
    collectionTitle: 'The collection',
    introTitle: '주문 제작 아카이브',
    introBody:
      '고객의 이야기, 상징, 착용감을 하나의 구조로 정리해 완성하는 맞춤 제작 기록입니다.',
    tabCorpus: 'Scientific corpus',
    tabNotes: 'Design notes',
    filter: 'Filter',
    filterTitle: 'Filter the creations',
    reset: 'Reset',
    apply: 'Apply',
    close: 'Close',
    display: 'Display',
    archive: 'Archive',
    grid: 'Grid',
    shuffle: 'Shuffle the creations',
    withNotice: 'Creation with notice',
    withoutNotice: 'Creation without notice',
    filterSections: {
      notice: 'Creation with notice',
      year: 'Creation year',
      period: 'Period',
      materials: 'Materials',
      stones: 'Stones',
      functions: 'Functions'
    },
    filterOptions: {
      notice: {
        yes: 'With notice',
        no: 'Without notice'
      },
      year: {
        '2026': '2026',
        '2025': '2025',
        '2024': '2024',
        '2023': '2023'
      },
      period: {
        contemporary: 'Contemporary orders',
        archive: 'Archive-inspired'
      },
      materials: {
        gold: 'Gold',
        silver: 'Silver',
        mixed: 'Mixed metal'
      },
      stones: {
        diamond: 'Diamond',
        color: 'Color stone',
        none: 'No stone'
      },
      functions: {
        engraving: 'Engraving',
        symbol: 'Symbol work',
        comfort: 'Comfort fit'
      }
    },
    archiveChapterPeriod: '2022 - 2026',
    archiveChapterTitle: 'The bespoke brief',
    chapterEyebrow: 'Made to order',
    chapterTitle: 'One story, one structure',
    chapterBody:
      '주문 제작은 형태를 먼저 고르는 과정이 아니라, 사용될 장면과 남겨야 할 정보를 함께 정리하는 과정에서 시작됩니다.',
    featureEyebrow: 'Bespoke records',
    featureTitle: 'From briefing to final polish',
    featureBody:
      '상담 내용, 상징 요소, 소재 선택, 착용감 확인까지 같은 기준으로 남겨 다음 제작에서도 흐름이 이어지도록 관리합니다.',
    process: [
      {
        label: '01',
        title: 'Brief',
        body: '이름, 날짜, 상징, 착용 목적을 정리합니다.'
      },
      {
        label: '02',
        title: 'Drawing',
        body: '비율과 문양을 스케치로 검토합니다.'
      },
      {
        label: '03',
        title: 'Finish',
        body: '광택, 각인, 착용감을 마지막까지 확인합니다.'
      }
    ]
  },
  en: {
    period: '2022 - 2026',
    collectionTitle: 'The collection',
    introTitle: 'Bespoke archive',
    introBody:
      'A made-to-order record shaped from personal stories, symbols, and wearing details.',
    tabCorpus: 'Scientific corpus',
    tabNotes: 'Design notes',
    filter: 'Filter',
    filterTitle: 'Filter the creations',
    reset: 'Reset',
    apply: 'Apply',
    close: 'Close',
    display: 'Display',
    archive: 'Archive',
    grid: 'Grid',
    shuffle: 'Shuffle the creations',
    withNotice: 'Creation with notice',
    withoutNotice: 'Creation without notice',
    filterSections: {
      notice: 'Creation with notice',
      year: 'Creation year',
      period: 'Period',
      materials: 'Materials',
      stones: 'Stones',
      functions: 'Functions'
    },
    filterOptions: {
      notice: {
        yes: 'With notice',
        no: 'Without notice'
      },
      year: {
        '2026': '2026',
        '2025': '2025',
        '2024': '2024',
        '2023': '2023'
      },
      period: {
        contemporary: 'Contemporary orders',
        archive: 'Archive-inspired'
      },
      materials: {
        gold: 'Gold',
        silver: 'Silver',
        mixed: 'Mixed metal'
      },
      stones: {
        diamond: 'Diamond',
        color: 'Color stone',
        none: 'No stone'
      },
      functions: {
        engraving: 'Engraving',
        symbol: 'Symbol work',
        comfort: 'Comfort fit'
      }
    },
    archiveChapterPeriod: '2022 - 2026',
    archiveChapterTitle: 'The bespoke brief',
    chapterEyebrow: 'Made to order',
    chapterTitle: 'One story, one structure',
    chapterBody:
      'Bespoke work starts by clarifying how the ring will be used and which details must remain legible over time.',
    featureEyebrow: 'Bespoke records',
    featureTitle: 'From briefing to final polish',
    featureBody:
      'Briefing notes, symbolic elements, material choices, and wearing comfort are kept in one stable production record.',
    process: [
      {
        label: '01',
        title: 'Brief',
        body: 'Names, dates, symbols, and purpose are arranged first.'
      },
      {
        label: '02',
        title: 'Drawing',
        body: 'Proportion and ornament are reviewed through sketches.'
      },
      {
        label: '03',
        title: 'Finish',
        body: 'Polish, engraving, and wearing comfort are checked to the end.'
      }
    ]
  }
};

type BespokeViewCopy = (typeof bespokeViewCopy)['ko'];

function BespokeCreationsView({
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
  const [displayMode, setDisplayMode] = useState<BespokeDisplayMode>('archive');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<BespokeSelectedFilters>({
    notice: [],
    year: [],
    period: [],
    materials: [],
    stones: [],
    functions: []
  });
  const copy = bespokeViewCopy[locale] ?? bespokeViewCopy.ko;
  const filterSections = useMemo(() => buildBespokeFilterSections(items, copy), [items, copy]);
  const activeFilterCount = Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0);
  const filteredItems = useMemo(
    () => items.filter((item, index) => bespokeItemMatchesFilters(item, index, selectedFilters)),
    [items, selectedFilters]
  );
  const orderedItems = useMemo(
    () => {
      if (shuffleSeed === 0 || filteredItems.length <= 1) {
        return filteredItems;
      }

      const shuffled = [...filteredItems].sort((a, b) => stableShuffleScore(a.id, shuffleSeed) - stableShuffleScore(b.id, shuffleSeed));
      const offset = shuffleSeed % shuffled.length;
      return [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    },
    [filteredItems, shuffleSeed]
  );
  const displayedItems = displayMode === 'archive' ? orderedItems : orderedItems.slice(0, 12);
  const clearBespokeFilters = () => {
    setSelectedFilters({
      notice: [],
      year: [],
      period: [],
      materials: [],
      stones: [],
      functions: []
    });
  };

  return (
    <div className="bg-[#F8F6F2] text-primary">
      <section className="mx-auto max-w-[1580px] px-container">
        <div className="border-b border-primary/15 pb-[clamp(26px,4vw,54px)] pt-[clamp(8px,2vw,22px)]">
          <Link
            href={backHref}
            className="link-sweep font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            {allLabel}
          </Link>

          <div className="mt-[clamp(34px,6vw,88px)] grid gap-8 md:grid-cols-[minmax(140px,0.34fr)_1fr_minmax(180px,0.34fr)] md:items-end">
            <p className="font-numeric text-[13px] font-semibold uppercase tracking-[0.14em] text-primary/65">
              {copy.period}
            </p>
            <div className="space-y-4 text-center md:space-y-5">
              <h1 className="font-heading text-[clamp(48px,8vw,116px)] font-semibold leading-[0.88] text-primary">
                {copy.collectionTitle}
              </h1>
              <div className="mx-auto h-px w-12 bg-accent/70" />
              <p className="font-body text-[13px] font-semibold uppercase tracking-[0.22em] text-primary/65">
                {activeLabel}
              </p>
            </div>
            <div className="hidden md:block" aria-hidden="true" />
          </div>
        </div>

        <div className="grid border-b border-primary/15 font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-primary md:grid-cols-[180px_1fr]">
          <div className="border-primary/15 py-5 md:border-r">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex min-h-10 items-center gap-3 transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              aria-expanded={filterOpen}
            >
              <SlidersIcon />
              {copy.filter}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-5 pl-0 text-primary/45 md:pl-8">
            <span className="text-primary/45">{activeLabel}</span>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearBespokeFilters}
                className="border-b border-primary/30 text-primary/55 transition duration-hover ease-brand hover:border-accent hover:text-accent"
              >
                {copy.reset} ({activeFilterCount})
              </button>
            ) : null}
          </div>
        </div>

        <AnimatePresence>
          {filterOpen ? (
            <BespokeFilterDrawer
              copy={copy}
              sections={filterSections}
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              clearFilters={clearBespokeFilters}
              close={() => setFilterOpen(false)}
            />
          ) : null}
        </AnimatePresence>

      </section>

      {items.length === 0 || filteredItems.length === 0 ? (
        <div className="mx-auto max-w-[1180px] px-container pb-section">
          <EmptyState title={empty.title} body={empty.body} />
        </div>
      ) : (
        <section aria-label={filterLabel}>
          {displayMode === 'archive' ? (
            <BespokeCreationCanvas
              items={displayedItems}
              locale={locale}
              copy={copy}
              shuffle={() => setShuffleSeed((value) => value + 1)}
              setDisplayMode={setDisplayMode}
              displayMode={displayMode}
            />
          ) : (
            <div className="bg-[#F8F6F2] px-container py-[clamp(54px,7vw,96px)]">
              <BespokeCreationGrid
                items={displayedItems}
                locale={locale}
                mode={displayMode}
              />
              <BespokeArchivePagination
                current={1}
                nextLabel="Next"
              />
              <BespokeFloatingNav
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const bespokeCanvasPlacements = [
  'md:absolute md:left-[8%] md:top-[105px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[31%] md:top-[105px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[54%] md:top-[105px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[77%] md:top-[105px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[8%] md:top-[470px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[31%] md:top-[470px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[54%] md:top-[470px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[77%] md:top-[470px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[13%] md:top-[880px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[72%] md:top-[880px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[8%] md:top-[1195px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[31%] md:top-[1195px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[54%] md:top-[1195px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[77%] md:top-[1195px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[20%] md:top-[1535px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[43%] md:top-[1535px] md:w-[15%] md:aspect-square',
  'md:absolute md:left-[66%] md:top-[1535px] md:w-[15%] md:aspect-square'
];

function BespokeCreationCanvas({
  items,
  locale,
  copy,
  shuffle,
  displayMode,
  setDisplayMode
}: {
  items: SpecialtyCollectionItem[];
  locale: Locale;
  copy: BespokeViewCopy;
  shuffle: () => void;
  displayMode: BespokeDisplayMode;
  setDisplayMode: (mode: BespokeDisplayMode) => void;
}) {
  const canvasItems = bespokeCanvasPlacements.map((placement, index) => ({
    item: items[index % items.length],
    placement
  }));

  return (
    <div className="relative overflow-hidden bg-[#F8F6F2]">
      <div className="sticky top-[96px] z-20 flex justify-center pt-4">
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex min-h-10 items-center gap-2 bg-white/92 px-4 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[0_10px_24px_rgba(16,29,48,.12)] transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {copy.shuffle}
          <ShuffleIcon />
        </button>
      </div>

      <div className="mx-auto grid max-w-[1540px] grid-cols-2 gap-x-[clamp(28px,8vw,96px)] gap-y-[clamp(42px,8vw,92px)] px-container pb-[clamp(180px,18vw,280px)] pt-[clamp(50px,7vw,92px)] md:relative md:block md:h-[2020px] md:px-0 md:pb-0 md:pt-0">
        {canvasItems.slice(0, 8).map(({item, placement}, index) => (
          <BespokeCanvasItem
            key={`${item.id}-${index}`}
            item={item}
            index={index}
            locale={locale}
            placement={placement}
          />
        ))}

        <BespokeCanvasChapterCard copy={copy} />

        {canvasItems.slice(8).map(({item, placement}, index) => (
          <BespokeCanvasItem
            key={`${item.id}-${index + 8}`}
            item={item}
            index={index + 8}
            locale={locale}
            placement={placement}
          />
        ))}
      </div>

      <BespokeFloatingNav
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
      />
    </div>
  );
}

function BespokeCanvasItem({
  item,
  index,
  locale,
  placement
}: {
  item: SpecialtyCollectionItem;
  index: number;
  locale: Locale;
  placement: string;
}) {
  return (
    <motion.div
      className={`relative aspect-square ${placement}`}
      initial={{opacity: 0, y: 22}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-8% 0px'}}
      transition={{
        duration: 0.46,
        delay: Math.min((index % 8) * 0.04, 0.2),
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <Link
        href={`/${locale}/mastery/creations/${item.id}`}
        className="group relative block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        aria-label={`${item.title}: ${item.caption}`}
      >
        {item.hasImage ? (
          <Image
            src={`/images/${item.image}`}
            alt={`${item.title} ${item.caption}`}
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 42vw"
            className="object-cover opacity-[0.96] mix-blend-multiply contrast-[1.03] saturate-[0.98] drop-shadow-[0_18px_18px_rgba(16,29,48,.12)] transition duration-700 ease-expo [mask-image:radial-gradient(ellipse_at_center,#000_38%,rgba(0,0,0,.8)_55%,transparent_78%)] group-hover:scale-[1.04] [-webkit-mask-image:radial-gradient(ellipse_at_center,#000_38%,rgba(0,0,0,.8)_55%,transparent_78%)]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center break-all p-4 text-center font-body text-[10px] font-semibold leading-5 tracking-[0.04em] text-subtext">
            {item.image}
          </div>
        )}
        {index % 5 === 2 ? (
          <span
            className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-white/90 font-body text-[18px] leading-none text-primary shadow-[0_8px_18px_rgba(16,29,48,.14)]"
            aria-hidden="true"
          >
            +
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}

function BespokeCanvasChapterCard({copy}: {copy: BespokeViewCopy}) {
  return (
    <div className="col-span-2 grid min-h-[260px] place-items-center bg-white px-8 py-10 text-center shadow-[0_16px_34px_rgba(16,29,48,.08)] md:absolute md:left-1/2 md:top-[840px] md:h-[320px] md:w-[430px] md:-translate-x-1/2">
      <div className="space-y-5">
        <p className="font-numeric text-[13px] font-semibold uppercase tracking-[0.16em] text-primary">
          {copy.archiveChapterPeriod}
        </p>
        <h2 className="font-heading text-[clamp(32px,3.6vw,54px)] font-semibold uppercase leading-[0.98] text-primary">
          {copy.archiveChapterTitle}
        </h2>
      </div>
    </div>
  );
}

function BespokeFloatingNav({
  displayMode,
  setDisplayMode
}: {
  displayMode: BespokeDisplayMode;
  setDisplayMode: (mode: BespokeDisplayMode) => void;
}) {
  return (
    <div className="fixed bottom-[calc(1.2rem+env(safe-area-inset-bottom))] left-1/2 z-[55] flex min-h-[58px] -translate-x-1/2 items-center bg-white/95 px-4 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[0_14px_34px_rgba(16,29,48,.15)] backdrop-blur">
      <button
        type="button"
        onClick={() => setDisplayMode('archive')}
        className={`inline-flex min-h-11 items-center gap-2 px-4 transition duration-hover ease-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          displayMode === 'archive' ? 'text-primary' : 'text-primary/55'
        }`}
      >
        Collection
        <DisplayGridIcon />
      </button>
      <button
        type="button"
        onClick={() => setDisplayMode('grid')}
        className={`inline-flex min-h-11 items-center gap-2 px-4 transition duration-hover ease-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          displayMode === 'grid' ? 'text-primary' : 'text-primary/55'
        }`}
      >
        Inspirations
        <EyeIcon />
      </button>
    </div>
  );
}

function BespokeCreationGrid({
  items,
  locale,
  mode
}: {
  items: SpecialtyCollectionItem[];
  locale: Locale;
  mode: BespokeDisplayMode;
}) {
  const layout = [
    'md:col-span-3 md:pt-[clamp(28px,5vw,76px)]',
    'md:col-span-4',
    'md:col-span-3 md:pt-[clamp(52px,8vw,126px)]',
    'md:col-span-2 md:pt-[clamp(18px,4vw,64px)]',
    'md:col-span-4 md:pt-[clamp(12px,3vw,42px)]',
    'md:col-span-3 md:pt-[clamp(68px,9vw,132px)]',
    'md:col-span-5'
  ];
  const aspects = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[5/6]', 'aspect-[1.08/1]', 'aspect-[4/5]', 'aspect-[16/11]'];

  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-x-[clamp(18px,2.4vw,40px)] gap-y-[clamp(42px,5vw,76px)] md:grid-cols-4">
        {items.map((item, index) => (
          <BespokeCreationCard
            key={item.id}
            item={item}
            index={index}
            locale={locale}
            aspect="aspect-square"
            sizes="(min-width: 1280px) 320px, (min-width: 768px) 25vw, 50vw"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-x-[clamp(20px,3vw,52px)] gap-y-[clamp(52px,7vw,104px)] md:grid-cols-12">
      {items.map((item, index) => (
        <motion.article
          key={item.id}
          className={layout[index % layout.length]}
          initial={{opacity: 0, y: 28}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10% 0px'}}
          transition={{
            duration: 0.48,
            delay: Math.min(index * 0.04, 0.16),
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <BespokeCreationCard
            item={item}
            index={index}
            locale={locale}
            aspect={aspects[index % aspects.length]}
            sizes="(min-width: 1280px) 34vw, (min-width: 768px) 42vw, 100vw"
          />
        </motion.article>
      ))}
    </div>
  );
}

function BespokeCreationCard({
  item,
  index,
  locale,
  aspect,
  sizes
}: {
  item: SpecialtyCollectionItem;
  index: number;
  locale: Locale;
  aspect: string;
  sizes: string;
}) {
  return (
    <Link
      href={`/${locale}/mastery/creations/${item.id}`}
      className="group block min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      aria-label={`${item.title}: ${item.caption}`}
    >
      <div className={`${aspect} hover-zoom relative overflow-hidden bg-white`}>
        {item.hasImage ? (
          <div className="hover-zoom-media absolute inset-0">
            <Image
              src={`/images/${item.image}`}
              alt={`${item.title} ${item.caption}`}
              fill
              sizes={sizes}
              priority={index === 0}
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center break-all p-5 text-center font-body text-[10px] font-semibold leading-5 tracking-[0.04em] text-subtext"
            role="img"
            aria-label={item.image}
          >
            {item.image}
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
        <div className="space-y-1.5">
          <h3 className="font-heading text-[clamp(17px,1.5vw,22px)] font-semibold leading-tight text-primary">
            {item.title}
          </h3>
          <p className="font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-accent">
            {item.categoryLabel}
          </p>
          <p className="font-body text-[13px] leading-6 text-subtext">{item.caption}</p>
        </div>
        <p className="font-numeric text-[12px] font-semibold tracking-[0.12em] text-primary/45">
          {String(index + 1).padStart(2, '0')}
        </p>
      </div>
    </Link>
  );
}

function BespokeArchivePagination({
  current,
  nextLabel
}: {
  current: number;
  nextLabel: string;
}) {
  return (
    <nav
      className="mt-[clamp(64px,8vw,112px)] flex items-center justify-center gap-5 border-t border-primary/15 pt-8 font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-primary"
      aria-label="Archive pagination"
    >
      <span className="border-b border-primary pb-1">{current}</span>
      {[2, 3, 4, 5, 6].map((page) => (
        <span key={page} className="text-primary/35">
          {page}
        </span>
      ))}
      <span className="text-primary/35">...</span>
      <span className="text-primary/35">19</span>
      <button
        type="button"
        className="ml-2 min-h-10 border border-primary/20 px-4 text-primary/45"
        disabled
      >
        {nextLabel}
      </button>
    </nav>
  );
}

function BespokeFilterDrawer({
  copy,
  sections,
  selectedFilters,
  setSelectedFilters,
  clearFilters,
  close
}: {
  copy: BespokeViewCopy;
  sections: BespokeFilterSectionData[];
  selectedFilters: BespokeSelectedFilters;
  setSelectedFilters: (values: BespokeSelectedFilters) => void;
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
    window.dispatchEvent(new Event('deaho:lenis-stop'));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('deaho:lenis-start'));
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close]);

  const updateFilter = (sectionId: BespokeFilterKey, optionId: string) => {
    setSelectedFilters({
      ...selectedFilters,
      [sectionId]: toggleCollectionFilter(selectedFilters[sectionId], optionId)
    });
  };

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
        aria-label={copy.close}
      />
      <motion.aside
        className="absolute left-0 top-0 flex h-dvh w-full max-w-[520px] flex-col bg-[#F8F6F2] shadow-[28px_0_90px_rgba(16,29,48,.2)]"
        initial={{x: '-100%'}}
        animate={{x: 0}}
        exit={{x: '-100%'}}
        transition={{duration: 0.48, ease: [0.16, 1, 0.3, 1]}}
        role="dialog"
        aria-modal="true"
        aria-label={copy.filterTitle}
      >
        <div className="grid min-h-[112px] grid-cols-[72px_1fr_auto] items-center border-b border-primary/15 bg-white/55">
          <button
            type="button"
            onClick={close}
            className="grid h-full min-h-14 place-items-center border-r border-primary/15 text-primary transition duration-hover ease-brand hover:bg-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent"
            aria-label={copy.close}
          >
            <span className="text-[24px] leading-none" aria-hidden="true">
              x
            </span>
          </button>
          <div className="space-y-2 px-6">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.26em] text-primary/45">
              {copy.collectionTitle}
            </p>
            <h3 className="font-heading text-[clamp(25px,2.2vw,32px)] font-semibold leading-none text-primary">
              {copy.filterTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mr-6 min-h-11 whitespace-nowrap border-b border-primary font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-primary transition duration-hover ease-brand hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {copy.reset}
          </button>
        </div>

        <div
          className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-[clamp(24px,4vw,48px)] py-6 [-webkit-overflow-scrolling:touch]"
          data-lenis-prevent
        >
          {sections.map((section) => (
            <BespokeFilterSection
              key={section.id}
              section={section}
              selected={selectedFilters[section.id]}
              onToggle={(optionId) => updateFilter(section.id, optionId)}
            />
          ))}
        </div>

        <div className="border-t border-primary/15 bg-white/65 p-5">
          <button
            type="button"
            onClick={close}
            className="min-h-12 w-full bg-primary px-5 font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition duration-hover ease-brand hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {copy.apply}
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function BespokeFilterSection({
  section,
  selected,
  onToggle
}: {
  section: BespokeFilterSectionData;
  selected: string[];
  onToggle: (optionId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="border-b border-primary/15 first:border-t">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-[70px] w-full items-center justify-between gap-4 text-left font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-primary transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        aria-expanded={open}
      >
        <span>{section.title}</span>
        <span className="font-numeric text-[18px] text-primary/45">{open ? '-' : '+'}</span>
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
            <div className="space-y-1 pb-6">
              {section.options.map((option) => (
                <FilterOptionButton
                  key={option.id}
                  label={option.label}
                  active={selected.includes(option.id)}
                  onClick={() => onToggle(option.id)}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function DisplayGridIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[17px] w-[17px]"
      viewBox="0 0 18 18"
      fill="none"
    >
      <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="11" width="5" height="5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="5" height="5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[14px] w-[14px]"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 5h2.8c2.5 0 3.4 8 6.2 8H16" />
      <path d="M13 10l3 3-3 3" />
      <path d="M2 13h2.8c.9 0 1.6-.8 2.2-1.9" />
      <path d="M11 5h5" />
      <path d="M13 2l3 3-3 3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[16px] w-[16px]"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.2 9s2.5-4 6.8-4 6.8 4 6.8 4-2.5 4-6.8 4-6.8-4-6.8-4Z" />
      <circle cx="9" cy="9" r="1.8" />
    </svg>
  );
}

const bespokeFilterKeys: BespokeFilterKey[] = ['notice', 'year', 'period', 'materials', 'stones', 'functions'];

function buildBespokeFilterSections(items: SpecialtyCollectionItem[], copy: BespokeViewCopy): BespokeFilterSectionData[] {
  return bespokeFilterKeys.map((key) => ({
    id: key,
    title: copy.filterSections[key],
    options: Object.entries(copy.filterOptions[key]).map(([id, label]) => ({
      id,
      label,
      count: items.filter((item, index) => getBespokeArchiveMeta(item, index)[key] === id).length
    }))
  }));
}

function bespokeItemMatchesFilters(
  item: SpecialtyCollectionItem,
  index: number,
  selectedFilters: BespokeSelectedFilters
) {
  const meta = getBespokeArchiveMeta(item, index);

  return bespokeFilterKeys.every((key) => {
    const selected = selectedFilters[key];
    return selected.length === 0 || selected.includes(meta[key]);
  });
}

function getBespokeArchiveMeta(item: SpecialtyCollectionItem, index: number): Record<BespokeFilterKey, string> {
  const yearFallbacks = ['2026', '2025', '2024', '2023'];
  const periodFallbacks = ['contemporary', 'archive'];
  const materialFallbacks = ['gold', 'silver', 'mixed'];
  const stoneFallbacks = ['diamond', 'color', 'none'];
  const functionFallbacks = ['engraving', 'symbol', 'comfort'];

  return {
    notice: index % 3 === 1 ? 'no' : 'yes',
    year: item.year ?? yearFallbacks[index % yearFallbacks.length],
    period: periodFallbacks[index % periodFallbacks.length],
    materials: materialFallbacks[index % materialFallbacks.length],
    stones: stoneFallbacks[index % stoneFallbacks.length],
    functions: functionFallbacks[index % functionFallbacks.length]
  };
}

function stableShuffleScore(value: string, seed: number) {
  let score = seed * 97;

  for (let index = 0; index < value.length; index += 1) {
    score = (score * 31 + value.charCodeAt(index)) % 1000003;
  }

  return score;
}

function CollectionGridView({
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
                href={`/${locale}/mastery/creations/${item.id}`}
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
            href={`/${locale}/mastery/creations/${item.id}`}
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
    window.dispatchEvent(new Event('deaho:lenis-stop'));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('deaho:lenis-start'));
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

        <div
          className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-[clamp(24px,4vw,48px)] py-8 [-webkit-overflow-scrolling:touch]"
          data-lenis-prevent
        >
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
                active={selected.length === 0}
                onClick={() => setSelected([])}
              />
              {options.map((option) => (
                <FilterOptionButton
                  key={option.id}
                  label={option.label}
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
  active,
  onClick
}: {
  label: string;
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
  viewLabel,
  href,
  item,
  reducedMotion,
  textSide
}: {
  index: number;
  label: string;
  description: string;
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
              ? 'ml-[clamp(20px,6vw,96px)] justify-self-start text-left md:col-start-1'
              : 'mr-[clamp(20px,6vw,96px)] justify-self-end text-right md:col-start-2'
          }`}
        >
          <div className="space-y-3">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-on-navy/70">
              {description}
            </p>
            <h2 className="font-heading text-[clamp(26px,3.1vw,42px)] font-semibold leading-[1.12] text-on-navy">
              {label}
            </h2>
          </div>
          <Link
            href={href}
            className="link-sweep inline-flex min-h-11 items-center justify-center font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
