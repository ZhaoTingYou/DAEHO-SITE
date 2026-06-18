'use client';

import {animate, useInView} from 'framer-motion';
import {createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

type AnimatedStatValueProps = {
  className: string;
  index: number;
  locale: string;
  value: string;
};

const AnimatedStatScopeContext = createContext<boolean | null>(null);

export function AnimatedStatScope({
  children,
  className
}: {
  children: ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || inView) {
      return;
    }

    const activateIfVisible = () => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleRatio = visibleHeight / Math.min(rect.height, viewportHeight);

      if (visibleRatio >= 0.35) {
        setInView(true);
        return true;
      }

      return false;
    };

    if (activateIfVisible()) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      {threshold: 0.35}
    );

    observer.observe(node);
    window.addEventListener('scroll', activateIfVisible, {passive: true});
    window.addEventListener('resize', activateIfVisible);
    window.requestAnimationFrame(activateIfVisible);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', activateIfVisible);
      window.removeEventListener('resize', activateIfVisible);
    };
  }, [inView]);

  return (
    <div ref={ref} className={className}>
      <AnimatedStatScopeContext.Provider value={inView}>
        {children}
      </AnimatedStatScopeContext.Provider>
    </div>
  );
}

export function AnimatedStatValue({className, index, locale, value}: AnimatedStatValueProps) {
  const wrapperRef = useRef<HTMLParagraphElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const scopedInView = useContext(AnimatedStatScopeContext);
  const ownInView = useInView(wrapperRef, {once: true, amount: 0.35});
  const inView = scopedInView ?? ownInView;
  const parsedValue = useMemo(() => parseDisplayValue(value), [value]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView || !valueRef.current) {
      return;
    }

    const valueNode = valueRef.current;

    if (!parsedValue) {
      valueNode.textContent = value;
      return;
    }

    const formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: parsedValue.decimals
    });
    const formatValue = (latest: number) => formatter.format(Number(latest.toFixed(parsedValue.decimals)));

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
  }, [index, inView, locale, parsedValue, prefersReducedMotion, value]);

  return (
    <p
      ref={wrapperRef}
      className={className}
      data-achievement-stat-index={index}
      data-achievement-stat-locale={locale}
      data-achievement-stat-value={value}
    >
      <span ref={valueRef} data-achievement-stat-number>
        {parsedValue ? '0' : value}
      </span>
      {parsedValue?.suffix ? <span data-achievement-stat-suffix>{parsedValue.suffix}</span> : null}
    </p>
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
