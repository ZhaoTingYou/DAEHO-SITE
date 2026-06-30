'use client';

import Image from 'next/image';
import type {CSSProperties, Dispatch, PointerEvent as ReactPointerEvent, SetStateAction} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';

export type AchievementFirstRecord = {
  frontTitle: string;
  backTitle: string;
  hoverText: string;
  image: string;
};

type AchievementRecordCardProps = {
  record: AchievementFirstRecord;
  locale: Locale;
  index: number;
  recordCount: number;
  bodyTextClass: string;
};

const pageCharacterLimit = 92;
const achievementRecordPanelExitMs = 680;

type AchievementRecordDeckProps = {
  records: AchievementFirstRecord[];
  locale: Locale;
  bodyTextClass: string;
};

export function AchievementRecordDeck({
  records,
  locale,
  bodyTextClass
}: AchievementRecordDeckProps) {
  const [activeRecordIndex, setActiveRecordIndex] = useState<number | null>(null);
  const [renderedRecordIndex, setRenderedRecordIndex] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const closePanelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderedRecord = renderedRecordIndex === null ? null : records[renderedRecordIndex] ?? null;
  const pages = useMemo(
    () => splitAchievementRecordPages(renderedRecord?.hoverText ?? ''),
    [renderedRecord?.hoverText]
  );
  const pageCount = pages.length;
  const currentPage = pages[pageIndex] ?? pages[0] ?? '';
  const hasMultiplePages = pageCount > 1;
  const isPanelOpen = activeRecordIndex !== null && renderedRecord !== null;
  const previousPageLabel = locale === 'ko' ? '이전 내용 보기' : 'View previous page';
  const nextPageLabel = locale === 'ko' ? '다음 내용 보기' : 'View next page';
  const arrowButtonClass =
    'absolute top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full border border-[#D7A6A0]/45 bg-[#62302F]/80 text-[22px] leading-none text-[#F4E6E1] transition hover:border-[#F4E6E1]/80 hover:bg-[#6f3937] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4E6E1]';
  const panelStyle = renderedRecordIndex === null ? undefined : deckPanelStyle(renderedRecordIndex, records.length);

  useEffect(() => {
    return () => clearClosePanelTimer();
  }, []);

  function clearClosePanelTimer() {
    if (closePanelTimerRef.current) {
      clearTimeout(closePanelTimerRef.current);
      closePanelTimerRef.current = null;
    }
  }

  function activateRecord(index: number) {
    clearClosePanelTimer();

    if (renderedRecordIndex !== index) {
      setPageIndex(0);
    }

    setRenderedRecordIndex(index);
    setActiveRecordIndex(index);
  }

  function closeRecordPanel() {
    if (activeRecordIndex === null && renderedRecordIndex === null) {
      return;
    }

    setActiveRecordIndex(null);
    clearClosePanelTimer();
    closePanelTimerRef.current = setTimeout(() => {
      setRenderedRecordIndex(null);
      setPageIndex(0);
      closePanelTimerRef.current = null;
    }, achievementRecordPanelExitMs);
  }

  function handleDeckPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.achievement-record-card, .achievement-record-card__panel')) {
      closeRecordPanel();
    }
  }

  return (
    <div
      className="achievement-record-deck hidden md:block"
      onMouseLeave={closeRecordPanel}
      onPointerMove={handleDeckPointerMove}
    >
      <div className="grid grid-cols-3 gap-6 text-center">
        {records.map((record) => (
          <div
            key={`${record.frontTitle}-${record.image}-title`}
            className="mb-5 flex min-h-[34px] flex-col justify-end"
          >
            <p className={`${bodyTextClass} text-[15px] leading-tight text-primary`}>
              {record.frontTitle}
            </p>
          </div>
        ))}
      </div>
      <div className="achievement-record-deck__stage relative grid grid-cols-3 gap-6 text-center">
        {records.map((record, index) => (
          <article
            key={`${record.frontTitle}-${record.image}`}
            tabIndex={0}
            aria-label={`${record.frontTitle}: ${record.hoverText || record.backTitle}`}
            data-record-index={index}
            className="achievement-record-card relative z-0 flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onFocus={() => activateRecord(index)}
            onMouseEnter={() => activateRecord(index)}
          >
            <div className="achievement-record-card__stage relative aspect-[3/4] overflow-hidden">
              <div className="achievement-record-card__front relative h-full overflow-hidden bg-[#d8d8d8]">
                <Image
                  src={imageSrc(record.image)}
                  alt={record.frontTitle}
                  fill
                  sizes="(min-width: 1024px) 330px, 30vw"
                  className="pointer-events-none object-cover"
                />
              </div>
            </div>
          </article>
        ))}

        <div
          aria-hidden={isPanelOpen ? undefined : true}
          className={`achievement-record-card__panel absolute inset-y-0 z-40 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#62302F] p-8 text-[#F4E6E1] shadow-[0_26px_90px_rgba(24,17,17,0.22)] transition-[opacity,transform] ease-[var(--ease-expo)] motion-reduce:transition-none motion-reduce:transform-none ${
            isPanelOpen
              ? 'pointer-events-auto translate-y-0 scale-x-100 opacity-100 duration-[420ms]'
              : 'pointer-events-none translate-y-0 scale-x-100 opacity-0 duration-[680ms]'
          }`}
          style={panelStyle}
        >
          {renderedRecord ? (
            <>
              <AchievementRecordPanelContent
                currentPage={currentPage}
                bodyTextClass={bodyTextClass}
              />
              {hasMultiplePages ? (
                <AchievementRecordPagination
                  arrowButtonClass={arrowButtonClass}
                  previousPageLabel={previousPageLabel}
                  nextPageLabel={nextPageLabel}
                  pageCount={pageCount}
                  setPageIndex={setPageIndex}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AchievementRecordCard({
  record,
  locale,
  index,
  recordCount,
  bodyTextClass
}: AchievementRecordCardProps) {
  const pages = useMemo(() => splitAchievementRecordPages(record.hoverText), [record.hoverText]);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = pages.length;
  const currentPage = pages[pageIndex] ?? pages[0] ?? '';
  const hasMultiplePages = pageCount > 1;
  const previousPageLabel = locale === 'ko' ? '이전 내용 보기' : 'View previous page';
  const nextPageLabel = locale === 'ko' ? '다음 내용 보기' : 'View next page';
  const arrowButtonClass =
    'absolute top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full border border-[#D7A6A0]/45 bg-[#62302F]/80 text-[22px] leading-none text-[#F4E6E1] transition hover:border-[#F4E6E1]/80 hover:bg-[#6f3937] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4E6E1]';
  const panelStyle = expandedPanelStyle(index, recordCount);

  return (
    <article
      tabIndex={0}
      aria-label={`${record.frontTitle}: ${record.hoverText || record.backTitle}`}
      data-record-index={index}
      className="achievement-record-card group relative z-0 flex w-[min(72vw,330px)] shrink-0 flex-col focus-within:z-30 hover:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div className="mb-5 flex min-h-[34px] flex-col justify-end text-center">
        <p className={`${bodyTextClass} text-[15px] leading-tight text-primary`}>
          {record.frontTitle}
        </p>
      </div>
      <div className="achievement-record-card__stage relative aspect-[3/4] overflow-visible">
        <div className="achievement-record-card__front relative h-full overflow-hidden bg-[#d8d8d8]">
          <Image
            src={imageSrc(record.image)}
            alt={record.frontTitle}
            fill
            sizes="(min-width: 1024px) 330px, 72vw"
            className="pointer-events-none object-cover"
          />
        </div>
        <div
          className="achievement-record-card__panel pointer-events-none absolute top-0 z-20 hidden h-full translate-y-0 scale-x-100 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#62302F] p-8 text-[#F4E6E1] opacity-0 shadow-[0_26px_90px_rgba(24,17,17,0.22)] transition-[opacity,transform] duration-[680ms] ease-[var(--ease-expo)] group-hover:pointer-events-auto group-hover:opacity-100 group-hover:duration-[420ms] group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:duration-[420ms] motion-reduce:transition-none md:grid"
          style={panelStyle}
        >
          <AchievementRecordPanelContent
            currentPage={currentPage}
            bodyTextClass={bodyTextClass}
          />
          {hasMultiplePages ? (
            <AchievementRecordPagination
              arrowButtonClass={arrowButtonClass}
              previousPageLabel={previousPageLabel}
              nextPageLabel={nextPageLabel}
              pageCount={pageCount}
              setPageIndex={setPageIndex}
            />
          ) : null}
        </div>
      </div>
      <div className="relative mt-0 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#62302F] p-8 text-[#F4E6E1] md:hidden">
        <AchievementRecordPanelContent
          currentPage={currentPage}
          bodyTextClass={bodyTextClass}
        />
        {hasMultiplePages ? (
          <AchievementRecordPagination
            arrowButtonClass={arrowButtonClass}
            previousPageLabel={previousPageLabel}
            nextPageLabel={nextPageLabel}
            pageCount={pageCount}
            setPageIndex={setPageIndex}
          />
        ) : null}
      </div>
    </article>
  );
}

function AchievementRecordPanelContent({
  currentPage,
  bodyTextClass
}: {
  currentPage: string;
  bodyTextClass: string;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center px-[clamp(44px,14%,58px)] py-4 text-center">
        <div className="grid w-full max-w-[430px]">
          <p className={`${bodyTextClass} whitespace-pre-line text-[clamp(15px,1.15vw,17px)] leading-[1.72] text-[#F4E6E1]`}>
            {currentPage}
          </p>
        </div>
      </div>
      <span className="mx-auto h-px w-14 bg-[#D7A6A0]/70" aria-hidden="true" />
    </>
  );
}

function AchievementRecordPagination({
  arrowButtonClass,
  previousPageLabel,
  nextPageLabel,
  pageCount,
  setPageIndex
}: {
  arrowButtonClass: string;
  previousPageLabel: string;
  nextPageLabel: string;
  pageCount: number;
  setPageIndex: Dispatch<SetStateAction<number>>;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={previousPageLabel}
        className={`${arrowButtonClass} left-3`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPageIndex((current) => (current - 1 + pageCount) % pageCount);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        aria-label={nextPageLabel}
        className={`${arrowButtonClass} right-3`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPageIndex((current) => (current + 1) % pageCount);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">›</span>
      </button>
    </>
  );
}

function expandedPanelStyle(index: number, recordCount: number): CSSProperties {
  const safeCount = Math.max(1, recordCount);
  const safeIndex = Math.min(Math.max(0, index), safeCount - 1);
  const gapRem = 1.5;

  return {
    left: safeIndex === 0 ? 0 : `calc(-${safeIndex * 100}% - ${safeIndex * gapRem}rem)`,
    width: `calc(${safeCount * 100}% + ${(safeCount - 1) * gapRem}rem)`,
    transformOrigin: safeIndex === 0 ? 'left center' : safeIndex === safeCount - 1 ? 'right center' : 'center center'
  };
}

function deckPanelStyle(index: number, recordCount: number): CSSProperties {
  const safeCount = Math.max(1, recordCount);
  const safeIndex = Math.min(Math.max(0, index), safeCount - 1);

  return {
    left: 0,
    width: '100%',
    transformOrigin: safeIndex === 0 ? 'left center' : safeIndex === safeCount - 1 ? 'right center' : 'center center'
  };
}

function splitAchievementRecordPages(value: string) {
  const text = value.trim();

  if (!text) {
    return [''];
  }

  const explicitPages = text
    .split(/\n\s*(?:---|\[page\])\s*\n/i)
    .map((page) => page.trim())
    .filter(Boolean);

  if (explicitPages.length > 1) {
    return explicitPages;
  }

  if (text.length <= pageCharacterLimit) {
    return [text];
  }

  const words = text.split(/\s+/);
  const pages: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > pageCharacterLimit && current) {
      pages.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [text];
}
