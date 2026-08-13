'use client';

import Image from 'next/image';
import Link from 'next/link';
import {type ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion, useScroll, useTransform, type MotionValue} from 'framer-motion';

import {EmptyState} from '@/components/empty-state';
import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';

export type SpecialtyCollectionFilter = {
  id: string;
  label: string;
  href?: string;
  description?: string;
  image?: string;
  background?: string;
  product?: string;
  mobileImage?: string;
  hasImage?: boolean;
  hasMobileImage?: boolean;
};

type CollectionImageSource = {
  title: string;
  caption: string;
  image: string;
  hasImage: boolean;
};

type CollectionStageArtwork = {
  background: string;
  product: string;
  productWidth: number;
  productHeight: number;
  productClassName?: string;
};

const collectionStageArtwork = [
  {background: 'bg1.jpg', product: 'c1.png', productWidth: 1672, productHeight: 941, productClassName: 'collection-stage-product--c1'},
  {background: 'bg3.jpg', product: 'c2.png', productWidth: 1672, productHeight: 941},
  {background: 'bg2.jpg', product: 'c3.png', productWidth: 1535, productHeight: 1024}
] as const;

function getCollectionStageArtwork(filter: SpecialtyCollectionFilter, index: number): CollectionStageArtwork {
  const fallback = collectionStageArtwork[index] ?? collectionStageArtwork[0];

  return {
    ...fallback,
    background: filter.background ?? fallback.background,
    product: filter.product ?? filter.image ?? fallback.product
  };
}

export type SpecialtyCollectionItem = {
  id: string;
  href?: string;
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
  appointment?: Partial<AppointmentShowcaseCopy>;
  bespoke?: Partial<BespokeViewCopy>;
  locale: Locale;
  backHref: string;
};

export function SpecialtyCollectionGallery({
  filters,
  chooseLabel,
  viewLabel,
  locale
}: SpecialtyCollectionGalleryProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const categoryCards = useMemo(
    () =>
      filters.map((filter) => {
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
              : undefined,
          description: filter.description ?? ''
        };
      }),
    [filters]
  );

  return (
    <motion.div
      initial={false}
      animate={{opacity: 1}}
      transition={prefersReducedMotion ? {duration: 0} : {duration: 0.3, ease: [0.16, 1, 0.3, 1]}}
    >
      <MobileCollectionActs
        categories={categoryCards}
        locale={locale}
        viewLabel={viewLabel}
      />
      <div
        role="group"
        aria-label={chooseLabel}
        className="hidden lg:grid"
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
              href={category.href ?? `/${locale}/mastery/creations/${category.id}`}
              item={category.item}
              artwork={getCollectionStageArtwork(category, index)}
              reducedMotion={prefersReducedMotion}
              textSide={imageSide === 'left' ? 'right' : 'left'}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

type MobileCollectionActDirection = {
  themeLabel: string;
  sceneClassName: string;
  backgroundImage: string;
  overlayClassName: string;
  haloClassName: string;
};

const mobileCollectionActDirections: Record<string, MobileCollectionActDirection> = {
  champion: {
    themeLabel: 'Victory · Legacy',
    sceneClassName: 'bg-[#07182D] text-white',
    backgroundImage: 'radial-gradient(circle at 64% 34%, #667884 0%, #26435D 18%, #0A2038 54%, #061426 100%)',
    overlayClassName: 'bg-gradient-to-b from-transparent via-transparent to-[#061426]/90',
    haloClassName: 'border-[#C4A474]'
  },
  appointment: {
    themeLabel: 'Memory · Honor',
    sceneClassName: 'bg-[#EFE8DC] text-primary',
    backgroundImage: 'radial-gradient(circle at 34% 30%, #FFFFFF 0%, #E3D8C7 28%, #B0A595 78%, #93887B 100%)',
    overlayClassName: 'bg-gradient-to-b from-white/5 via-transparent to-[#EFE8DC]/95',
    haloClassName: 'border-[#B49463]'
  },
  bespoke: {
    themeLabel: 'Story · Craft',
    sceneClassName: 'bg-[#1C0E16] text-white',
    backgroundImage: 'radial-gradient(circle at 68% 34%, #B5827C 0%, #722B3D 27%, #371925 65%, #1C0E16 100%)',
    overlayClassName: 'bg-gradient-to-b from-transparent via-transparent to-[#1C0E16]/90',
    haloClassName: 'rounded-[12px_50%_50%_12px] border-[#D2B895]'
  }
};

function getMobileCollectionActDirection(categoryId: string): MobileCollectionActDirection {
  return mobileCollectionActDirections[categoryId] ?? mobileCollectionActDirections.champion;
}

function MobileCollectionActs({
  categories,
  locale,
  viewLabel
}: {
  categories: Array<
    SpecialtyCollectionFilter & {
      item?: CollectionImageSource;
      description: string;
    }
  >;
  locale: Locale;
  viewLabel: string;
}) {
  return (
    <div className="mobile-creations-acts lg:hidden">
      {categories.map((category, index) => (
        <MobileCollectionAct
          key={category.id}
          category={category}
          index={index}
          locale={locale}
          viewLabel={viewLabel}
        />
      ))}
      <div className="grid min-h-40 place-items-center bg-primary px-[var(--mobile-page-gutter)] py-10 text-center text-white">
        <div>
          <p className="[font-family:'Cormorant_Garamond',serif] text-[24px] italic text-[#C4A474]">
            Made to be remembered.
          </p>
          <p className="mt-3 font-body text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
            DAEHO · Seoul
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileCollectionAct({
  category,
  index,
  locale,
  viewLabel
}: {
  category: SpecialtyCollectionFilter & {
    item?: CollectionImageSource;
    description: string;
  };
  index: number;
  locale: Locale;
  viewLabel: string;
}) {
  const direction = getMobileCollectionActDirection(category.id);
  const href = category.href ?? `/${locale}/mastery/creations/${category.id}`;
  const [failedMobileImage, setFailedMobileImage] = useState<string | null>(null);

  return (
    <article className={`relative overflow-hidden ${direction.sceneClassName}`}>
      <Link
        href={href}
        aria-label={`${category.label} · ${viewLabel}`}
        className="group relative flex min-h-[max(84dvh,560px)] touch-manipulation items-end overflow-hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-[-5px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{backgroundImage: direction.backgroundImage}}
        />
        <div
          aria-hidden="true"
          className={`absolute left-1/2 top-[34%] aspect-[1.8/1] w-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] rounded-[50%] border-[clamp(12px,4vw,22px)] opacity-90 shadow-[0_24px_42px_rgba(0,0,0,.32)] ${direction.haloClassName}`}
        />
        {category.mobileImage &&
        category.hasMobileImage &&
        failedMobileImage !== category.mobileImage ? (
          <Image
            src={imageSrc(category.mobileImage)}
            alt=""
            fill
            sizes="100vw"
            priority={index === 0}
            className="object-cover object-center"
            onError={() => setFailedMobileImage(category.mobileImage ?? null)}
          />
        ) : null}
        <div aria-hidden="true" className={`absolute inset-0 ${direction.overlayClassName}`} />

        <div className="relative z-10 w-full px-[var(--mobile-page-gutter)] pb-[max(32px,env(safe-area-inset-bottom))] pt-28">
          <div aria-hidden="true" className="flex items-center justify-between border-b border-current/45 pb-3 font-body text-[9px] font-semibold uppercase tracking-[0.2em] opacity-70">
            <span>Act {String(index + 1).padStart(2, '0')}</span>
            <span>{direction.themeLabel}</span>
          </div>
          <div className="relative mt-4 pr-14">
            <h2 className="break-words [font-family:'Cormorant_Garamond',serif] text-[clamp(40px,12vw,56px)] font-semibold leading-[0.95] tracking-[-0.03em]">
              {category.label}
            </h2>
            <p className="mt-4 max-w-[19rem] whitespace-pre-line font-body text-[16px] font-medium leading-[1.65] opacity-[.78]">
              {category.description}
            </p>
            <span aria-hidden="true" className="mobile-tap-target absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-full border border-current/55 transition duration-200 ease-brand group-hover:border-[#C4A474] group-hover:text-[#C4A474] group-focus-visible:border-[#C4A474] group-focus-visible:text-[#C4A474] motion-reduce:transition-none">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                <path d="M5 15 15 5M8 5h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
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
  appointment,
  bespoke,
  locale,
  backHref
}: SpecialtyCollectionCategoryProps) {
  const [finderOpen, setFinderOpen] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const activeFilter = filters.find((filter) => filter.id === categoryId);
  const visibleItems = items.filter((item) => item.category === categoryId);

  if (!activeFilter) {
    return null;
  }

  if (categoryId === 'appointment') {
    return (
      <AppointmentCollectionView
        activeLabel={activeFilter.label}
        allLabel={allLabel}
        backHref={backHref}
        locale={locale}
        appointment={appointment}
      />
    );
  }

  if (visibleItems.length === 0) {
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

  if (categoryId === 'bespoke') {
    return (
      <BespokeCreationsView
        items={visibleItems}
        empty={empty}
        filterLabel={filterLabel}
        allLabel={allLabel}
        backHref={backHref}
        locale={locale}
        bespoke={bespoke}
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
const BESPOKE_GRID_BATCH_SIZE = 12;
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

type AppointmentTextSection = {
  title: string;
  lines: string[];
};

type AppointmentThumbnail = {
  image: string;
  width?: number;
  height?: number;
};

type AppointmentShowcaseCopy = {
  heroAlt: string;
  heroImage: string;
  intro: AppointmentTextSection;
  honor: AppointmentTextSection & {image: string};
  keepsake: AppointmentTextSection & {image: string};
  inside: AppointmentTextSection;
  thumbnails: AppointmentThumbnail[];
  timelineStart: string;
  timelineEnd: string;
  evolution: AppointmentTextSection;
};

type BespokeViewCopy = {
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
};

const defaultAppointmentShowcaseCopy: Record<Locale, AppointmentShowcaseCopy> = {
  ko: {
    heroAlt: '대호 임관반지 컬렉션',
    heroImage: 'collection_ring1.png',
    intro: {
      title: '세대를 잇는 명예의 반지',
      lines: [
        '대호는 수많은 임관의 순간을 반지에 담아왔습니다.',
        '군의 상징, 기수의 자부심, 개인의 이름까지 하나의 형태로 완성합니다.',
        '한 번의 임관을 넘어, 한 가족의 역사로 남는 반지.',
        '아버지와 자녀가 함께 기억하는 임관의 순간을 제작합니다.'
      ]
    },
    honor: {
      title: '명예를 손에 새기다',
      image: 'collection_ring2.png',
      lines: [
        '임관반지는 대한민국 장교로서의 시작을 기념하는 상징입니다.',
        '소속, 기수, 이름을 담아 책임과 자부심의 순간을 오래 간직합니다.'
      ]
    },
    keepsake: {
      title: '제품의 반지를 넘어, 함께 간직하는 기념',
      image: 'collection_ring3.png',
      lines: [
        '임관의 의미는 착용자 한 사람에게만 머물지 않습니다.',
        '대호는 가족과 소중한 사람들도 함께 간직할 수 있도록 펜던트,',
        '기념 주얼리 등 다양한 제품을 디자인해왔습니다.'
      ]
    },
    inside: {
      title: '안쪽까지 이어지는 상징성',
      lines: [
        '반지의 외형뿐 아니라, 착용자만이 볼 수 있는 내부 공간까지 설계합니다.',
        '대호는 임관반지 안쪽에 의미를 새기는 디자인을 통해 새로운 기준을',
        '만들어가고 있습니다.'
      ]
    },
    thumbnails: [
      {image: 'cl1.png', width: 114, height: 129},
      {image: 'cl2.png', width: 98, height: 124},
      {image: 'cl3.png', width: 102, height: 119},
      {image: 'cl4.png', width: 110, height: 116}
    ],
    evolution: {
      title: '임관반지 디자인의 변화',
      lines: [
        '전통적인 상징에서 현대적인 세공과 맞춤 설계까지.',
        '대호는 시대에 맞춰 임관반지의 형태를 꾸준히 발전시켜왔습니다.'
      ]
    },
    timelineStart: 'past',
    timelineEnd: 'today'
  },
  en: {
    heroAlt: 'DAEHO appointment ring collection',
    heroImage: 'collection_ring1.png',
    intro: {
      title: 'A ring of honor across generations',
      lines: [
        'DAEHO has shaped countless appointment moments into rings.',
        'Military symbols, class pride, and personal names are completed as one form.',
        'Beyond one appointment, the ring remains as family history.',
        'We create appointment moments remembered by parents and children together.'
      ]
    },
    honor: {
      title: 'Engraving honor in hand',
      image: 'collection_ring2.png',
      lines: [
        'An appointment ring commemorates the beginning of service as an officer.',
        'Affiliation, class, and name preserve a moment of responsibility and pride.'
      ]
    },
    keepsake: {
      title: 'Beyond the ring, a keepsake to share',
      image: 'collection_ring3.png',
      lines: [
        'The meaning of appointment does not stay with the wearer alone.',
        'DAEHO has designed pendants, commemorative jewelry, and related pieces',
        'so family and loved ones can keep the moment together.'
      ]
    },
    inside: {
      title: 'Symbolism carried inside',
      lines: [
        'We design not only the exterior, but also the private interior space only the wearer can see.',
        'Through designs that engrave meaning inside appointment rings,',
        'DAEHO continues to build a new standard.'
      ]
    },
    thumbnails: [
      {image: 'cl1.png', width: 114, height: 129},
      {image: 'cl2.png', width: 98, height: 124},
      {image: 'cl3.png', width: 102, height: 119},
      {image: 'cl4.png', width: 110, height: 116}
    ],
    evolution: {
      title: 'The evolution of appointment ring design',
      lines: [
        'From traditional symbols to modern craftsmanship and custom planning.',
        'DAEHO has steadily evolved appointment ring forms for each era.'
      ]
    },
    timelineStart: 'past',
    timelineEnd: 'today'
  }
};

const defaultBespokeViewCopy: Record<Locale, BespokeViewCopy> = {
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

function resolveAppointmentShowcaseCopy(
  locale: Locale,
  customCopy?: Partial<AppointmentShowcaseCopy>
): AppointmentShowcaseCopy {
  const fallback = defaultAppointmentShowcaseCopy[locale] ?? defaultAppointmentShowcaseCopy.ko;

  return {
    ...fallback,
    ...customCopy,
    intro: mergeAppointmentSection(fallback.intro, customCopy?.intro),
    honor: {
      ...fallback.honor,
      ...customCopy?.honor,
      lines: customCopy?.honor?.lines?.length ? customCopy.honor.lines : fallback.honor.lines
    },
    keepsake: {
      ...fallback.keepsake,
      ...customCopy?.keepsake,
      lines: customCopy?.keepsake?.lines?.length ? customCopy.keepsake.lines : fallback.keepsake.lines
    },
    inside: mergeAppointmentSection(fallback.inside, customCopy?.inside),
    thumbnails: customCopy?.thumbnails?.length ? customCopy.thumbnails : fallback.thumbnails,
    evolution: mergeAppointmentSection(fallback.evolution, customCopy?.evolution)
  };
}

function mergeAppointmentSection(
  fallback: AppointmentTextSection,
  customSection?: Partial<AppointmentTextSection>
): AppointmentTextSection {
  return {
    ...fallback,
    ...customSection,
    lines: customSection?.lines?.length ? customSection.lines : fallback.lines
  };
}

function resolveBespokeViewCopy(locale: Locale, customCopy?: Partial<BespokeViewCopy>): BespokeViewCopy {
  const fallback = defaultBespokeViewCopy[locale] ?? defaultBespokeViewCopy.ko;

  return {
    ...fallback,
    ...customCopy,
    filterSections: {
      ...fallback.filterSections,
      ...customCopy?.filterSections
    },
    filterOptions: {
      notice: {...fallback.filterOptions.notice, ...customCopy?.filterOptions?.notice},
      year: {...fallback.filterOptions.year, ...customCopy?.filterOptions?.year},
      period: {...fallback.filterOptions.period, ...customCopy?.filterOptions?.period},
      materials: {...fallback.filterOptions.materials, ...customCopy?.filterOptions?.materials},
      stones: {...fallback.filterOptions.stones, ...customCopy?.filterOptions?.stones},
      functions: {...fallback.filterOptions.functions, ...customCopy?.filterOptions?.functions}
    },
    process: customCopy?.process?.length ? customCopy.process : fallback.process
  };
}

function BespokeCreationsView({
  items,
  empty,
  filterLabel,
  allLabel,
  backHref,
  locale,
  bespoke
}: {
  items: SpecialtyCollectionItem[];
  empty: {
    title: string;
    body: string;
  };
  filterLabel: string;
  allLabel: string;
  backHref: string;
  locale: Locale;
  bespoke?: Partial<BespokeViewCopy>;
}) {
  const [displayMode, setDisplayMode] = useState<BespokeDisplayMode>('archive');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleGridCount, setVisibleGridCount] = useState(BESPOKE_GRID_BATCH_SIZE);
  const gridLoadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedFilters, setSelectedFilters] = useState<BespokeSelectedFilters>({
    notice: [],
    year: [],
    period: [],
    materials: [],
    stones: [],
    functions: []
  });
  const changeDisplayMode = (mode: BespokeDisplayMode) => {
    setDisplayMode(mode);
    setVisibleGridCount(BESPOKE_GRID_BATCH_SIZE);
  };
  const changeSelectedFilters = (values: BespokeSelectedFilters) => {
    setSelectedFilters(values);
    setVisibleGridCount(BESPOKE_GRID_BATCH_SIZE);
  };
  const copy = resolveBespokeViewCopy(locale, bespoke);
  const displayItems = useMemo(() => items, [items]);
  const filterSections = useMemo(() => buildBespokeFilterSections(displayItems, copy), [displayItems, copy]);
  const activeFilterCount = Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0);
  const filteredItems = useMemo(
    () => displayItems.filter((item, index) => bespokeItemMatchesFilters(item, index, selectedFilters)),
    [displayItems, selectedFilters]
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
  const displayedItems =
    displayMode === 'archive' ? orderedItems : orderedItems.slice(0, visibleGridCount);

  useEffect(() => {
    const sentinel = gridLoadMoreRef.current;
    if (
      displayMode !== 'grid' ||
      !sentinel ||
      visibleGridCount >= orderedItems.length
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleGridCount((current) =>
          Math.min(current + BESPOKE_GRID_BATCH_SIZE, orderedItems.length)
        );
      },
      {rootMargin: '600px 0px'}
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayMode, orderedItems.length, visibleGridCount]);

  const clearBespokeFilters = () => {
    changeSelectedFilters({
      notice: [],
      year: [],
      period: [],
      materials: [],
      stones: [],
      functions: []
    });
  };

  return (
    <div className="bg-white text-primary">
      <section className="mx-auto max-w-[1580px] px-container">
        <div className="relative border-b border-primary/15 py-[clamp(74px,8vw,128px)] text-center">
          <Link
            href={backHref}
            aria-label={allLabel}
            className="link-sweep no-underline !absolute left-0 top-[clamp(28px,3.5vw,48px)] font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <h1 className="font-heading text-[clamp(42px,4vw,68px)] font-semibold leading-[1.08] text-primary">
            {locale === 'ko' ? '주문제작' : 'Bespoke'}
          </h1>
        </div>

        <div className="grid border-b border-primary/15 font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-primary md:grid-cols-[180px_1fr]">
          <div className="border-primary/15 py-5 md:border-r">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex min-h-11 items-center gap-3 transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              aria-expanded={filterOpen}
            >
              <SlidersIcon />
              {copy.filter}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-5 pl-0 text-primary/45 md:pl-8">
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
              setSelectedFilters={changeSelectedFilters}
              clearFilters={clearBespokeFilters}
              close={() => setFilterOpen(false)}
            />
          ) : null}
        </AnimatePresence>

        <div className="flex justify-center border-b border-primary/15 py-5 lg:hidden">
          <BespokeFloatingNav
            displayMode={displayMode}
            setDisplayMode={changeDisplayMode}
            floating={false}
          />
        </div>
      </section>

      {displayItems.length === 0 || filteredItems.length === 0 ? (
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
              setDisplayMode={changeDisplayMode}
              displayMode={displayMode}
            />
          ) : (
            <div className="bg-white px-container py-[clamp(54px,7vw,96px)]">
              <BespokeCreationGrid
                items={displayedItems}
                locale={locale}
                mode={displayMode}
              />
              {visibleGridCount < orderedItems.length ? (
                <div
                  ref={gridLoadMoreRef}
                  className="h-px"
                  aria-hidden="true"
                />
              ) : null}
              <p className="sr-only" aria-live="polite">
                {displayedItems.length} / {orderedItems.length}
              </p>
              <BespokeFloatingNav
                displayMode={displayMode}
                setDisplayMode={changeDisplayMode}
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
    <div className="relative overflow-hidden bg-white">
      <div className="sticky top-[96px] z-20 flex justify-center pt-4">
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex min-h-11 items-center gap-2 bg-white/92 px-4 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[0_10px_24px_rgba(16,29,48,.12)] transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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
        href={item.href ?? `/${locale}/mastery/creations/${item.id}`}
        className="group relative block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        aria-label={`${item.title}: ${item.caption}`}
      >
        {item.hasImage ? (
          <Image
            src={imageSrc(item.image)}
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
        <p className="font-numeric text-[15px] font-semibold uppercase tracking-[0.16em] text-primary">
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
  setDisplayMode,
  floating = true
}: {
  displayMode: BespokeDisplayMode;
  setDisplayMode: (mode: BespokeDisplayMode) => void;
  floating?: boolean;
}) {
  const shellClassName = floating
    ? 'fixed bottom-[calc(1.2rem+env(safe-area-inset-bottom))] left-1/2 z-[55] hidden min-h-[58px] -translate-x-1/2 items-center bg-white/95 px-4 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[0_14px_34px_rgba(16,29,48,.15)] backdrop-blur lg:flex'
    : 'flex min-h-[56px] w-fit items-center bg-white/95 px-3 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_12px_28px_rgba(16,29,48,.12)]';

  return (
    <div className={shellClassName}>
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
      href={item.href ?? `/${locale}/mastery/creations/${item.id}`}
      className="group block min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      aria-label={`${item.title}: ${item.caption}`}
    >
      <div className={`${aspect} hover-zoom relative overflow-hidden bg-white`}>
        {item.hasImage ? (
          <div className="hover-zoom-media absolute inset-0">
            <Image
              src={imageSrc(item.image)}
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
          <p className="whitespace-pre-line font-body text-[15px] leading-6 text-subtext">{item.caption}</p>
        </div>
        <p className="font-numeric text-[12px] font-semibold tracking-[0.12em] text-primary/45">
          {String(index + 1).padStart(2, '0')}
        </p>
      </div>
    </Link>
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
    window.dispatchEvent(new Event('daeho:lenis-stop'));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('daeho:lenis-start'));
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
        className="absolute left-0 top-0 flex h-dvh w-full max-w-[520px] flex-col bg-white shadow-[28px_0_90px_rgba(16,29,48,.2)]"
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
    <div className="relative mx-auto max-w-[1280px] px-[var(--mobile-page-gutter)] md:px-container">
      <Link
        href={backHref}
        aria-label={allLabel}
        className="mobile-tap-target link-sweep no-underline !absolute left-[var(--mobile-page-gutter)] top-0 inline-flex items-center justify-center font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent md:left-container"
      >
        <span aria-hidden="true">←</span>
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-hairline pb-5 pt-[clamp(28px,4vw,56px)]">
        <div className="space-y-2">
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
  activeLabel,
  allLabel,
  backHref,
  locale,
  appointment
}: {
  activeLabel: string;
  allLabel: string;
  backHref: string;
  locale: Locale;
  appointment?: Partial<AppointmentShowcaseCopy>;
}) {
  const copy = resolveAppointmentShowcaseCopy(locale, appointment);

  return (
    <div className="-mb-[clamp(84px,9vw,132px)] mt-0 overflow-x-hidden bg-white pb-24 pt-0 text-primary md:-mt-28 md:pb-[clamp(220px,26vw,340px)] md:pt-28">
      <div className="mx-auto max-w-[1480px] px-[var(--mobile-page-gutter)] md:px-container">
        <div className="relative border-b border-hairline pb-10 pt-6 md:pb-[clamp(63px,7.5vw,114px)] md:pt-[clamp(28px,4vw,56px)]">
          <Link
            href={backHref}
            aria-label={allLabel}
            className="mobile-tap-target link-sweep no-underline !absolute left-0 top-6 inline-flex items-center justify-center font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent md:top-[clamp(28px,4vw,56px)]"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="mx-auto max-w-3xl space-y-7 text-center">
            <div className="space-y-4">
              <h1 className="break-words font-heading text-[32px] font-semibold leading-[1.08] text-primary md:text-[clamp(32px,4.2vw,54px)] md:leading-none">
                {activeLabel}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section
        aria-label={activeLabel}
        className="mx-auto flex w-full flex-col items-center px-[var(--mobile-page-gutter)] pt-16 text-center md:px-[clamp(22px,5vw,42px)] md:pt-[clamp(76px,8vw,118px)] lg:w-[60vw] lg:max-w-[980px]"
      >
        <AppointmentTextBlock title={copy.intro.title} lines={copy.intro.lines} />

        <AppointmentReveal className="mt-[clamp(56px,7.2vw,78px)] flex flex-col items-center">
          <Image
            src={imageSrc(copy.heroImage)}
            alt={copy.heroAlt}
            width={473}
            height={414}
            priority
            className="h-auto w-[82vw] max-w-[760px] max-lg:max-w-[340px] lg:w-[60vw]"
          />
        </AppointmentReveal>

        <AppointmentTextBlock
          title={copy.honor.title}
          lines={copy.honor.lines}
          className="mt-20 md:mt-[clamp(86px,13vw,144px)]"
        />

        <AppointmentReveal className="mt-[clamp(58px,8vw,84px)] flex w-full justify-center">
          <Image
            src={imageSrc(copy.honor.image)}
            alt={copy.honor.title}
            width={413}
            height={593}
            className="h-auto w-[78vw] max-w-[620px] max-lg:max-w-[320px] lg:w-[52vw]"
          />
        </AppointmentReveal>

        <AppointmentTextBlock
          title={copy.keepsake.title}
          lines={copy.keepsake.lines}
          className="mt-20 md:mt-[clamp(104px,15vw,168px)]"
        />

        <AppointmentReveal className="mt-[clamp(62px,9vw,96px)] flex w-full justify-center">
          <Image
            src={imageSrc(copy.keepsake.image)}
            alt={copy.keepsake.title}
            width={288}
            height={300}
            className="h-auto w-[58vw] max-w-[460px] max-lg:max-w-[250px] lg:w-[36vw]"
          />
        </AppointmentReveal>

        <AppointmentTextBlock
          title={copy.inside.title}
          lines={copy.inside.lines}
          className="mt-20 md:mt-[clamp(92px,13vw,150px)]"
        />

        <AppointmentReveal className="mt-[clamp(74px,10vw,112px)] box-border flex w-screen max-w-[1180px] flex-col items-center px-[clamp(24px,3vw,48px)]">
          <div className="flex w-full items-center justify-between gap-[clamp(14px,3vw,60px)]">
            {copy.thumbnails.map((thumb) => (
              <div
                key={thumb.image}
                className="flex h-[clamp(76px,15.6vw,214px)] w-[clamp(76px,15.6vw,214px)] shrink-0 items-center justify-center rounded-full bg-[#E8E8E8]"
              >
                <Image
                  src={imageSrc(thumb.image)}
                  alt=""
                  width={thumb.width ?? 110}
                  height={thumb.height ?? 120}
                  className="h-[78%] w-[78%] object-contain"
                />
              </div>
            ))}
          </div>

          <div className="mx-auto mt-[clamp(20px,2.8vw,34px)] grid w-full max-w-[980px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(10px,1.4vw,18px)] font-body text-[clamp(14px,1.32vw,22px)] font-normal leading-none text-accent">
            <span>{copy.timelineStart}</span>
            <div className="relative h-px bg-accent/60" aria-hidden="true">
              <span className="absolute right-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rotate-45 border-r border-t border-accent/70" />
            </div>
            <span>{copy.timelineEnd}</span>
          </div>
        </AppointmentReveal>

        <AppointmentTextBlock
          title={copy.evolution.title}
          lines={copy.evolution.lines}
          className="mt-20 md:mt-[clamp(118px,15vw,170px)]"
        />
      </section>
    </div>
  );
}

function AppointmentReveal({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 28}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-12% 0px'}}
      transition={{duration: 0.48, ease: [0.16, 1, 0.3, 1]}}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AppointmentTextBlock({
  title,
  lines,
  className
}: {
  title: string;
  lines: readonly string[];
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[720px] ${className ?? ''}`}>
      <h2 className="break-words [font-family:'MaruBuri',serif] text-[24px] font-normal leading-[1.35] tracking-normal text-primary md:text-[clamp(20px,1.95vw,30px)]">
        {title}
      </h2>
      <div className="mobile-copy mt-6 space-y-[2px] [font-family:'Pretendard',sans-serif] font-normal tracking-normal text-[#111111] md:mt-[clamp(28px,3.5vw,42px)] md:text-[clamp(12px,1.08vw,16px)] md:leading-[1.72]">
        {lines.map((line) => (
          <p key={line} className="whitespace-pre-line">{line}</p>
        ))}
      </div>
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
        <div className="relative border-b border-hairline pb-[clamp(63px,7.5vw,114px)] pt-[clamp(28px,4vw,56px)]">
          <Link
            href={backHref}
            aria-label={allLabel}
            className="link-sweep no-underline !absolute left-0 top-[clamp(28px,4vw,56px)] font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="mx-auto max-w-3xl space-y-7 text-center">
            <div className="space-y-4">
              <h1 className="font-heading text-[clamp(32px,4.2vw,54px)] font-semibold leading-none text-primary">
                {activeLabel}
              </h1>
              <p className="mx-auto max-w-[620px] whitespace-pre-line font-body text-[14px] leading-7 text-primary/66 md:text-[15px]">
                {labels.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFinderOpen(true)}
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-accent px-7 font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_rgba(122,34,48,.2)] transition duration-hover ease-brand hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:hidden"
              aria-expanded={finderOpen}
            >
              <SlidersIcon />
              <span>{labels.filterButton}</span>
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="pt-10">
            <EmptyState title={empty.title} body={empty.body} />
          </div>
        ) : (
          // h1 바로 뒤에 카드 h3가 오면서 헤딩 레벨이 건너뛰던 구간이다.
          // 화면에는 보이지 않는 h2를 넣어 h1 → h2 → h3 순서를 복구한다.
          <section aria-labelledby="collection-finder-results">
            <h2 id="collection-finder-results" className="sr-only">
              {filterLabel}
            </h2>
            <CollectionProductGrid
              items={filteredItems}
              filterLabel={filterLabel}
              locale={locale}
              columns="sm:grid-cols-2 lg:grid-cols-4"
              finder
            />
          </section>
        )}
      </div>

      <button
        type="button"
        onClick={() => setFinderOpen(true)}
        className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 z-[70] hidden min-h-12 -translate-x-1/2 items-center gap-3 rounded-full bg-accent px-7 font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_rgba(122,34,48,.24)] transition duration-hover ease-brand hover:bg-primary hover:shadow-[0_20px_52px_rgba(16,29,48,.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:inline-flex"
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
      className={`grid grid-cols-1 gap-x-[clamp(18px,2.4vw,40px)] gap-y-12 pt-8 sm:grid-cols-2 sm:gap-y-[clamp(42px,5vw,76px)] sm:pt-[clamp(32px,4vw,64px)] ${columns}`}
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
            href={item.href ?? `/${locale}/mastery/creations/${item.id}`}
            className="group block min-h-11 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            aria-label={`${item.title}: ${item.caption}`}
          >
            <CollectionImage
              item={item}
              aspect="aspect-[4/5] sm:aspect-square"
              sizes={finder ? '(min-width: 1280px) 280px, (min-width: 768px) 38vw, 100vw' : '(min-width: 1024px) 340px, 100vw'}
            />
            <div className={finder ? 'space-y-1 px-1 pt-4' : 'space-y-1.5 px-1 pt-5'}>
              <h3 className="font-heading text-[clamp(15px,1.3vw,18px)] font-semibold leading-snug text-primary">
                {item.title}
              </h3>
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                {item.categoryLabel}
              </p>
              <p className="mobile-copy whitespace-pre-line font-body text-subtext md:text-[12px] md:leading-6">{item.caption}</p>
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
    window.dispatchEvent(new Event('daeho:lenis-stop'));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('daeho:lenis-start'));
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
      className={`group flex min-h-12 w-full items-center gap-4 text-left font-body text-[15px] transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
  artwork,
  reducedMotion,
  textSide
}: {
  index: number;
  label: string;
  description: string;
  viewLabel: string;
  href: string;
  item?: CollectionImageSource;
  artwork: CollectionStageArtwork;
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
      className="relative min-h-[100svh] overflow-hidden bg-black text-on-navy"
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
          artwork={artwork}
          productSide={textSide === 'left' ? 'right' : 'left'}
          priority={index === 0}
          y={imageY}
          scale={imageScale}
        />
      </motion.div>

      <div
        className={`pointer-events-none absolute inset-y-0 hidden w-[42%] lg:block ${
          textSide === 'left'
            ? 'left-0 bg-gradient-to-r from-black via-black/68 to-transparent'
            : 'right-0 bg-gradient-to-l from-black via-black/68 to-transparent'
        }`}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1440px] items-center px-container py-[clamp(84px,9vw,150px)] max-lg:pb-20 max-lg:pt-[42svh] lg:grid-cols-2">
        <motion.div
          style={{opacity: textOpacity, x: textX, y: textY}}
          className={`max-w-[340px] space-y-5 ${
            textSide === 'left'
              ? 'ml-[clamp(20px,6vw,96px)] justify-self-start text-left lg:col-start-1'
              : 'mr-[clamp(20px,6vw,96px)] justify-self-end text-left lg:col-start-2'
          }`}
        >
          <div className="space-y-3">
            <p className="whitespace-pre-line font-body text-[clamp(16px,1.02vw,21px)] font-normal uppercase leading-[1.3] tracking-[0.08em] text-on-navy/78">
              {description}
            </p>
            <h2 className="font-heading text-[clamp(34px,2.15vw,46px)] font-normal uppercase leading-[1.08] tracking-[0.04em] text-on-navy">
              {label}
            </h2>
          </div>
          <Link
            href={href}
            className="collection-stage-cta link-sweep inline-flex min-h-11 items-center justify-center font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
  artwork,
  productSide,
  priority,
  y,
  scale
}: {
  item?: CollectionImageSource;
  artwork: CollectionStageArtwork;
  productSide: 'left' | 'right';
  priority: boolean;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}) {
  const productAlt = item ? `${item.title} ${item.caption}` : 'collection product image';

  return (
    <motion.div className="absolute inset-x-0 -inset-y-10 will-change-transform" style={{y, scale}}>
      <Image
        src={imageSrc(artwork.background)}
        alt=""
        fill
        sizes="100vw"
        priority={priority}
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      <div
        className={`absolute inset-y-[-6%] flex items-center max-lg:inset-x-4 max-lg:inset-y-auto max-lg:top-[12svh] max-lg:h-[30svh] max-lg:justify-center ${
          productSide === 'left'
            ? 'left-[clamp(32px,4vw,96px)] right-[28%] justify-start'
            : 'left-[24%] right-[clamp(32px,4vw,96px)] justify-end'
        }`}
      >
        <Image
          src={imageSrc(artwork.product)}
          alt={productAlt}
          width={artwork.productWidth}
          height={artwork.productHeight}
          sizes="(min-width: 1024px) 68vw, calc(100vw - 2rem)"
          priority={priority}
          className={`h-auto max-h-[88svh] w-[clamp(980px,82vw,1700px)] max-w-full object-contain drop-shadow-[0_34px_62px_rgba(0,0,0,0.46)] ${artwork.productClassName ?? ''}`}
        />
      </div>
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
          src={imageSrc(item.image)}
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
