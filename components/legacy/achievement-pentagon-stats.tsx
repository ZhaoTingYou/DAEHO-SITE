'use client';

import {useState, type KeyboardEvent, type PointerEvent} from 'react';

import type {HomeStatBandItem} from '@/components/home/home-stat-band';
import {AnimatedStatScope, AnimatedStatValue} from '@/components/legacy/animated-stat-value';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';

type PentagonPoint = {
  x: number;
  y: number;
};

const pentagonPoints: PentagonPoint[] = [
  {x: 500, y: 118},
  {x: 270, y: 285},
  {x: 730, y: 285},
  {x: 358, y: 540},
  {x: 642, y: 540}
];

const baseSectors = [
  'M500 118 L730 285 L500 354 Z',
  'M730 285 L642 540 L500 354 Z',
  'M642 540 L358 540 L500 354 Z',
  'M358 540 L270 285 L500 354 Z',
  'M270 285 L500 118 L500 354 Z'
];

const activeSectors = [
  'M270 285 L500 118 L730 285 L500 354 Z',
  'M500 118 L270 285 L358 540 L500 354 Z',
  'M500 118 L730 285 L642 540 L500 354 Z',
  'M270 285 L358 540 L642 540 L500 354 Z',
  'M730 285 L642 540 L358 540 L500 354 Z'
];

export function AchievementPentagonStats({
  items,
  locale
}: {
  items: HomeStatBandItem[];
  locale: Locale;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [years, championship, commission, delivery, endToEnd] = items;
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const koreanTextClass = "[font-family:'MaruBuri',serif] font-semibold";
  const bodyTextClass = locale === 'ko' ? koreanTextClass : englishTextClass;
  const centerCaption =
    locale === 'ko'
      ? '장인정신으로 완성한\n신뢰 구조'
      : 'A trust structure\ncompleted by craft';

  const activate = (index: number) => setActiveIndex(index);
  const clear = () => setActiveIndex(null);
  const toggle = (index: number) => {
    setActiveIndex((currentIndex) => (currentIndex === index ? null : index));
  };

  return (
    <div className="mx-auto max-w-[1240px] px-container">
      <Reveal className="hidden md:block">
        <AnimatedStatScope className="relative min-h-[650px]">
          <PentagonDiagram
            activeIndex={activeIndex}
            centerCaption={centerCaption}
            items={items}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
          <AchievementPentagonStat
            activeIndex={activeIndex}
            bodyTextClass={bodyTextClass}
            className="left-1/2 top-0 w-[220px] -translate-x-1/2"
            englishTextClass={englishTextClass}
            index={0}
            item={years}
            locale={locale}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
          <AchievementPentagonStat
            activeIndex={activeIndex}
            bodyTextClass={bodyTextClass}
            className="left-[5%] top-[36%] w-[300px]"
            englishTextClass={englishTextClass}
            index={1}
            item={championship}
            locale={locale}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
          <AchievementPentagonStat
            activeIndex={activeIndex}
            bodyTextClass={bodyTextClass}
            className="right-[5%] top-[36%] w-[300px]"
            englishTextClass={englishTextClass}
            index={2}
            item={commission}
            locale={locale}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
          <AchievementPentagonStat
            activeIndex={activeIndex}
            bodyTextClass={bodyTextClass}
            className="bottom-[4%] left-[14%] w-[280px]"
            englishTextClass={englishTextClass}
            index={3}
            item={delivery}
            locale={locale}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
          <AchievementPentagonStat
            activeIndex={activeIndex}
            bodyTextClass={bodyTextClass}
            className="bottom-[6.6%] right-[14%] w-[280px]"
            englishTextClass={englishTextClass}
            index={4}
            item={endToEnd}
            locale={locale}
            onActivate={activate}
            onClear={clear}
            onToggle={toggle}
          />
        </AnimatedStatScope>
      </Reveal>

      <Reveal className="md:hidden">
        <AnimatedStatScope className="grid gap-6 text-center">
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map((item, index) => (
              <AchievementPentagonStat
                key={`${item.value}-${item.label}`}
                activeIndex={activeIndex}
                bodyTextClass={bodyTextClass}
                className="relative rounded-[2px] border border-[#F4E6E1]/18 px-5 py-6"
                englishTextClass={englishTextClass}
                index={index}
                item={item}
                locale={locale}
                onActivate={activate}
                onClear={clear}
                onToggle={toggle}
              />
            ))}
          </div>
        </AnimatedStatScope>
      </Reveal>
    </div>
  );
}

function PentagonDiagram({
  activeIndex,
  centerCaption,
  compact = false,
  items,
  onActivate,
  onClear,
  onToggle
}: {
  activeIndex: number | null;
  centerCaption: string;
  compact?: boolean;
  items: HomeStatBandItem[];
  onActivate: (index: number) => void;
  onClear: () => void;
  onToggle: (index: number) => void;
}) {
  const activePoint = activeIndex === null ? null : pentagonPoints[activeIndex];

  return (
    <svg
      className={compact ? 'h-full w-full' : 'absolute left-1/2 top-[112px] h-[490px] w-[760px] -translate-x-1/2'}
      viewBox="0 0 1000 620"
      role="img"
      aria-label="DAEHO trust pentagon"
    >
      <g fill="#F4E6E1">
        <path
          className="achievement-pentagon__layer"
          d="M500 118 L730 285 L642 540 L358 540 L270 285 Z"
          opacity={activeIndex === null ? 0.065 : 0.038}
        />
        {baseSectors.map((path, index) => (
          <path
            key={path}
            className="achievement-pentagon__layer"
            d={path}
            opacity={activeIndex === null || activeIndex === index ? [0.045, 0.028, 0.052, 0.032, 0.04][index] : 0.012}
          />
        ))}
        {activeIndex !== null ? (
          <path
            className="achievement-pentagon__active-sector"
            d={activeSectors[activeIndex]}
            opacity="0.12"
          />
        ) : null}
      </g>
      <g fill="none" stroke="#F4E6E1" strokeLinecap="round" strokeLinejoin="round">
        <path
          className="achievement-pentagon__layer"
          d="M500 118 L730 285 L642 540 L358 540 L270 285 Z"
          opacity={activeIndex === null ? 0.46 : 0.72}
          strokeWidth={activeIndex === null ? 1.6 : 2.1}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="achievement-pentagon__layer"
          d="M500 168 L675 296 L608 490 L392 490 L325 296 Z"
          opacity={activeIndex === null ? 0.18 : 0.28}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="achievement-pentagon__layer"
          d="M500 168 L500 354 M325 296 L500 354 M675 296 L500 354 M392 490 L500 354 M608 490 L500 354"
          opacity={activeIndex === null ? 0.12 : 0.08}
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {activePoint ? (
          <path
            className="achievement-pentagon__active-line"
            d={`M500 354 L${activePoint.x} ${activePoint.y}`}
            opacity="0.42"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </g>
      <g fill="#F4E6E1">
        {pentagonPoints.map(({x, y}, index) => {
          const isActive = activeIndex === index;
          const isMuted = activeIndex !== null && !isActive;

          return (
            <g
              key={`${x}-${y}`}
              onMouseEnter={() => onActivate(index)}
              onMouseLeave={onClear}
              onPointerEnter={(event) => handlePointerActivate(event, index, onActivate)}
              onPointerLeave={(event) => handlePointerClear(event, onClear)}
              onPointerDown={(event) => handlePointerToggle(event, index, onToggle)}
            >
              <circle
                className={`achievement-pentagon__point${isActive ? ' is-active' : ''}`}
                cx={x}
                cy={y}
                r={isActive ? 7 : 4}
                opacity={isMuted ? 0.32 : isActive ? 1 : 0.68}
              />
              <circle
                aria-label={makeStatLabel(items[index])}
                className="cursor-pointer"
                cx={x}
                cy={y}
                fill="transparent"
                r="34"
              />
            </g>
          );
        })}
        <text
          x="500"
          y="344"
          textAnchor="middle"
          fontFamily="Cormorant Garamond, serif"
          fontSize="44"
          fontWeight="700"
          letterSpacing="4"
        >
          DAEHO
        </text>
        <text
          x="500"
          y="383"
          textAnchor="middle"
          fontFamily="Cormorant Garamond, serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="2.5"
        >
          TRUST PENTAGON
        </text>
        {centerCaption.split('\n').map((line, index) => (
          <text
            key={line}
            x="500"
            y={420 + index * 26}
            textAnchor="middle"
            fontFamily="MaruBuri, serif"
            fontSize="18"
            fontWeight="600"
            opacity="0.86"
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

function AchievementPentagonStat({
  activeIndex,
  item,
  index,
  className,
  locale,
  bodyTextClass,
  englishTextClass,
  onActivate,
  onClear,
  onToggle
}: {
  activeIndex: number | null;
  item: HomeStatBandItem;
  index: number;
  className: string;
  locale: Locale;
  bodyTextClass: string;
  englishTextClass: string;
  onActivate: (index: number) => void;
  onClear: () => void;
  onToggle: (index: number) => void;
}) {
  const isActive = activeIndex === index;
  const isMuted = activeIndex !== null && !isActive;

  return (
    <div
      aria-label={makeStatLabel(item)}
      aria-pressed={isActive}
      className={`${className} achievement-pentagon-stat ${isActive ? 'is-active' : ''} ${isMuted ? 'is-muted' : ''} text-center md:absolute`}
      onBlur={onClear}
      onFocus={() => onActivate(index)}
      onKeyDown={(event) => handleStatKeyDown(event, index, onToggle, onClear)}
      onMouseEnter={() => onActivate(index)}
      onMouseLeave={onClear}
      onPointerEnter={(event) => handlePointerActivate(event, index, onActivate)}
      onPointerLeave={(event) => handlePointerClear(event, onClear)}
      onPointerDown={(event) => handlePointerToggle(event, index, onToggle)}
      role="button"
      tabIndex={0}
    >
      <div className="achievement-pentagon-stat__content">
        <AnimatedStatValue
          className={`${englishTextClass} text-[clamp(44px,5.3vw,74px)] leading-none text-[#F4E6E1]`}
          index={index}
          locale={locale}
          value={item.value}
        />
        <p className={`${englishTextClass} mt-2 whitespace-pre-line text-[16px] uppercase leading-[1.05] tracking-[0.05em] text-[#F4E6E1]`}>
          {item.label}
        </p>
        <p className={`${bodyTextClass} mx-auto mt-5 max-w-[250px] whitespace-pre-line text-[14px] leading-[1.45] text-[#F4E6E1]/90`}>
          {item.body}
        </p>
      </div>
    </div>
  );
}

function handlePointerToggle(
  event: PointerEvent<Element>,
  index: number,
  onToggle: (index: number) => void
) {
  if (event.pointerType === 'mouse') {
    return;
  }

  onToggle(index);
}

function handlePointerActivate(
  event: PointerEvent<Element>,
  index: number,
  onActivate: (index: number) => void
) {
  if (event.pointerType === 'mouse') {
    onActivate(index);
  }
}

function handlePointerClear(event: PointerEvent<Element>, onClear: () => void) {
  if (event.pointerType === 'mouse') {
    onClear();
  }
}

function handleStatKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  index: number,
  onToggle: (index: number) => void,
  onClear: () => void
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onToggle(index);
  }

  if (event.key === 'Escape') {
    onClear();
  }
}

function makeStatLabel(item: HomeStatBandItem) {
  return `${item.value} ${item.label} ${item.body}`.replace(/\s+/g, ' ').trim();
}
