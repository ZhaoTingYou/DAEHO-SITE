'use client';

import Image from 'next/image';
import {useMemo, useState} from 'react';

import type {Locale} from '@/i18n/routing';

export type AchievementFirstRecord = {
  frontTitle: string;
  backTitle: string;
  hoverText: string;
  image: string;
};

type AchievementRecordCardProps = {
  record: AchievementFirstRecord;
  locale: Locale;
  firstTitle: string;
  bodyTextClass: string;
  englishTextClass: string;
};

const pageCharacterLimit = 92;

export function AchievementRecordCard({
  record,
  locale,
  firstTitle,
  bodyTextClass,
  englishTextClass
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

  return (
    <article
      tabIndex={0}
      aria-label={`${record.frontTitle}: ${record.hoverText || record.backTitle}`}
      className="achievement-record-card group flex w-[min(72vw,330px)] shrink-0 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div className="mb-5 flex min-h-[34px] flex-col justify-end text-center">
        <p className={`${bodyTextClass} text-[15px] leading-tight text-primary`}>
          {record.frontTitle}
        </p>
      </div>
      <div className="achievement-record-card__stage relative aspect-[3/4] [perspective:1200px]">
        <div className="achievement-record-card__inner relative h-full w-full transition-transform duration-700 ease-[var(--ease-expo)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus:[transform:rotateY(180deg)] motion-reduce:transition-none">
          <div className="achievement-record-card__front absolute inset-0 overflow-hidden bg-[#d8d8d8] [backface-visibility:hidden]">
            <Image
              src={`/images/${record.image}`}
              alt={record.frontTitle}
              fill
              sizes="(min-width: 1024px) 330px, 72vw"
              className="pointer-events-none object-cover"
            />
          </div>
          <div className="achievement-record-card__back absolute inset-0 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#62302F] p-8 text-[#F4E6E1] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className={`${englishTextClass} text-[13px] uppercase leading-none tracking-[0.12em] text-[#D7A6A0]`}>
              {firstTitle}
            </p>
            <div className="flex min-h-0 items-center justify-center px-[clamp(44px,14%,58px)] py-4 text-center">
              <div className="grid w-full max-w-[230px] gap-4">
                <h3 className={`${englishTextClass} whitespace-pre-line text-[clamp(22px,2.1vw,31px)] uppercase leading-[1.04] tracking-[0.04em] text-white`}>
                  {record.backTitle}
                </h3>
                <p className={`${bodyTextClass} whitespace-pre-line text-[clamp(15px,1.15vw,17px)] leading-[1.72] text-[#F4E6E1]`}>
                  {currentPage}
                </p>
              </div>
            </div>
            <span className="mx-auto h-px w-14 bg-[#D7A6A0]/70" aria-hidden="true" />
            {hasMultiplePages ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
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
