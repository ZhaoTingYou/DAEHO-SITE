'use client';

import {animate, useInView} from 'framer-motion';
import {useEffect, useMemo, useRef} from 'react';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

export type HomeStatBandItem = {
  value: string;
  label: string;
  body: string;
};

type HomeStatBandProps = {
  items: HomeStatBandItem[];
  locale: string;
};

export function HomeStatBand({items, locale}: HomeStatBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {once: true, amount: 0.35});

  return (
    <div ref={ref} className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-container sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
      {items.map((item, index) => (
        <HomeStatBandCell
          key={`${item.value}-${item.label}`}
          item={item}
          index={index}
          isActive={inView}
          locale={locale}
        />
      ))}
    </div>
  );
}

function HomeStatBandCell({
  item,
  index,
  isActive,
  locale
}: {
  item: HomeStatBandItem;
  index: number;
  isActive: boolean;
  locale: string;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const parsedValue = useMemo(() => parseDisplayValue(item.value), [item.value]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isActive || !valueRef.current) {
      return;
    }

    const valueNode = valueRef.current;

    if (!parsedValue) {
      valueNode.textContent = item.value;
      return;
    }

    const formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: parsedValue.decimals
    });
    const formatValue = (value: number) => formatter.format(Number(value.toFixed(parsedValue.decimals)));

    if (prefersReducedMotion) {
      valueNode.textContent = formatValue(parsedValue.number);
      return;
    }

    const controls = animate(0, parsedValue.number, {
      delay: index * 0.08,
      duration: 2.1,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (latest) => {
        valueNode.textContent = formatValue(latest);
      }
    });

    return () => {
      controls.stop();
    };
  }, [index, isActive, item.value, locale, parsedValue, prefersReducedMotion]);

  return (
    <div
      className={`grid justify-items-center gap-[18px] text-center lg:min-h-[184px] lg:px-9 ${
        index > 0 ? 'lg:border-l lg:border-[#F4E6E1]/70' : ''
      }`}
    >
      <p className="home-stat-band__value text-[clamp(42px,4vw,68px)] leading-none tracking-normal">
        <span ref={valueRef}>{parsedValue ? '0' : item.value}</span>
        {parsedValue?.suffix ? <span>{parsedValue.suffix}</span> : null}
      </p>
      <p className="home-stat-band__label whitespace-pre-line text-[15px] uppercase leading-[1.08] tracking-[0.03em]">
        {item.label}
      </p>
      <p className="home-stat-band__body max-w-[210px] whitespace-pre-line text-[15px] leading-[1.36]">
        {item.body}
      </p>
    </div>
  );
}

function parseDisplayValue(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (!Number.isFinite(number)) {
    return null;
  }

  return {
    number,
    suffix: match[2] ?? '',
    decimals: match[1].includes('.') ? match[1].split('.')[1]?.length ?? 0 : 0
  };
}
