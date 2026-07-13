'use client';

import Image from 'next/image';
import Link from 'next/link';
import {type CSSProperties, useEffect, useMemo, useRef, useState} from 'react';

export type ChronicleHorizontalSlide = {
  year: string;
  label: string;
  title: string;
  desc: string;
  image: string;
  fallbackImage: string;
};

type ChronicleHorizontalProps = {
  ariaLabel: string;
  yearNavAriaLabel: string;
  endNav: {
    label: string;
    title: string;
    href: string;
  };
  introLabel: string;
  slides: ChronicleHorizontalSlide[];
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const scrollLockKeys = new Set([
  ' ',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp'
]);

const isCompactChronicleViewport = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth <= 960 || window.matchMedia('(max-aspect-ratio: 3 / 4)').matches);

export function ChronicleHorizontal({
  ariaLabel,
  yearNavAriaLabel,
  endNav,
  introLabel,
  slides
}: ChronicleHorizontalProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const lineProgressRef = useRef(0);
  const controlsVisibleRef = useRef(false);
  const yearResetRef = useRef<number | null>(null);
  const firstYear = slides[0]?.year ?? '';
  const slideCount = Math.max(1, slides.length);
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayYear, setDisplayYear] = useState(firstYear);
  const [yearSwitching, setYearSwitching] = useState(false);
  const [stageVisible, setStageVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [introExiting, setIntroExiting] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [compactViewport, setCompactViewport] = useState(() => isCompactChronicleViewport());

  const yearStops = useMemo(
    () => slides.map((slide, index) => ({index, year: slide.year})),
    [slides]
  );

  useEffect(() => {
    const updateCompactViewport = () => setCompactViewport(isCompactChronicleViewport());
    const aspectQuery = window.matchMedia('(max-aspect-ratio: 3 / 4)');

    updateCompactViewport();
    window.addEventListener('resize', updateCompactViewport);
    aspectQuery.addEventListener('change', updateCompactViewport);

    return () => {
      window.removeEventListener('resize', updateCompactViewport);
      aspectQuery.removeEventListener('change', updateCompactViewport);
    };
  }, []);

  useEffect(() => {
    if (compactViewport) {
      document.documentElement.classList.remove('is-chronicle-intro-locked');
      document.body.classList.remove('is-chronicle-intro-locked');
      return;
    }

    document.documentElement.classList.add('is-chronicle-intro-locked');
    document.body.classList.add('is-chronicle-intro-locked');
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('is-chronicle-intro-locked');
      document.body.classList.remove('is-chronicle-intro-locked');
    };
  }, [compactViewport]);

  useEffect(() => {
    if (!introComplete) {
      return;
    }

    document.documentElement.classList.remove('is-chronicle-intro-locked');
    document.body.classList.remove('is-chronicle-intro-locked');
  }, [introComplete]);

  useEffect(() => {
    if (introComplete || compactViewport) {
      return;
    }

    let frame = 0;

    const forceTop = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        targetProgressRef.current = 0;
        smoothProgressRef.current = 0;
        lineProgressRef.current = 0;
        controlsVisibleRef.current = false;
        setLineProgress(0);
        setControlsVisible(false);
        window.scrollTo(0, 0);
      });
    };

    const preventScroll = (event: Event) => {
      event.preventDefault();
      forceTop();
    };

    const preventKeyScroll = (event: KeyboardEvent) => {
      if (!scrollLockKeys.has(event.key)) {
        return;
      }

      event.preventDefault();
      forceTop();
    };

    forceTop();
    document.addEventListener('wheel', preventScroll, {capture: true, passive: false});
    document.addEventListener('touchmove', preventScroll, {capture: true, passive: false});
    window.addEventListener('keydown', preventKeyScroll, {capture: true});
    window.addEventListener('scroll', forceTop, {passive: true});

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      document.removeEventListener('wheel', preventScroll, {capture: true});
      document.removeEventListener('touchmove', preventScroll, {capture: true});
      window.removeEventListener('keydown', preventKeyScroll, {capture: true});
      window.removeEventListener('scroll', forceTop);
    };
  }, [compactViewport, introComplete]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || compactViewport) {
      const reducedTimer = window.setTimeout(() => {
        setStageVisible(true);
        setIntroExiting(true);
        setIntroComplete(true);
      }, 0);

      return () => window.clearTimeout(reducedTimer);
    }

    const stageTimer = window.setTimeout(() => setStageVisible(true), 2250);
    const exitTimer = window.setTimeout(() => setIntroExiting(true), 2750);
    const completeTimer = window.setTimeout(() => setIntroComplete(true), 5100);

    return () => {
      window.clearTimeout(stageTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [compactViewport]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    let frame = 0;

    const syncProgressFromStage = () => {
      const rect = stage.getBoundingClientRect();
      const stageTop = window.scrollY + rect.top;
      const travel = Math.max(1, rect.height - window.innerHeight);
      const stageEnd = stageTop + travel;
      const effectiveScrollY = Math.min(window.scrollY, stageEnd);
      const effectiveTop = stageTop - effectiveScrollY;
      const nextProgress = clamp((effectiveScrollY - stageTop) / travel);
      const nextControlsVisible =
        effectiveTop <= 1 && effectiveScrollY <= stageEnd + 1 && effectiveScrollY >= stageTop - 1;
      targetProgressRef.current = nextProgress;

      if (introComplete && window.scrollY > stageEnd) {
        window.scrollTo({top: stageEnd, behavior: 'auto'});
      }

      if (controlsVisibleRef.current !== nextControlsVisible) {
        controlsVisibleRef.current = nextControlsVisible;
        setControlsVisible(nextControlsVisible);
      }

      if (Math.abs(lineProgressRef.current - nextProgress) > 0.0005) {
        lineProgressRef.current = nextProgress;
        setLineProgress(nextProgress);
      }
    };

    const update = () => {
      frame = 0;
      syncProgressFromStage();
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    const animateProgress = () => {
      syncProgressFromStage();
      const target = targetProgressRef.current;
      const current = smoothProgressRef.current;
      const isMobile =
        window.innerWidth <= 960 || window.matchMedia('(max-aspect-ratio: 3 / 4)').matches;
      const next = isMobile ? target : current + (target - current) * 0.07;
      const settled = Math.abs(target - next) < 0.0005;
      const resolved = settled ? target : next;
      const nextIndex = Math.min(slides.length - 1, Math.round(resolved * (slides.length - 1)));

      smoothProgressRef.current = resolved;
      setProgress(resolved);
      setActiveIndex(Math.max(0, nextIndex));
      frameRef.current = window.requestAnimationFrame(animateProgress);
    };

    update();
    frameRef.current = window.requestAnimationFrame(animateProgress);
    window.addEventListener('scroll', requestUpdate, {passive: true});
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [introComplete, slides.length]);

  useEffect(() => {
    const nextYear = slides[activeIndex]?.year ?? firstYear;

    if (nextYear === displayYear) {
      return;
    }

    if (yearResetRef.current) {
      window.clearTimeout(yearResetRef.current);
    }

    const switchTimer = window.setTimeout(() => {
      setYearSwitching(true);
      yearResetRef.current = window.setTimeout(() => {
        setDisplayYear(nextYear);
        setYearSwitching(false);
        yearResetRef.current = null;
      }, 600);
    }, 0);

    return () => {
      window.clearTimeout(switchTimer);

      if (yearResetRef.current) {
        window.clearTimeout(yearResetRef.current);
        yearResetRef.current = null;
      }
    };
  }, [activeIndex, displayYear, firstYear, slides]);

  useEffect(() => {
    if (!introComplete || compactViewport) {
      return;
    }

    let touchStartY = 0;

    const getStageEndY = () => {
      const stage = stageRef.current;

      if (!stage) {
        return null;
      }

      const rect = stage.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      return window.scrollY + rect.top + travel;
    };

    const lockAtChronicleEnd = () => {
      const stageEndY = getStageEndY();

      if (stageEndY === null || window.scrollY < stageEndY - 1) {
        return false;
      }

      window.scrollTo({top: stageEndY, behavior: 'auto'});
      return true;
    };

    const preventForwardWheel = (event: WheelEvent) => {
      if (event.deltaY > 0 && lockAtChronicleEnd()) {
        event.preventDefault();
      }
    };

    const preventForwardKey = (event: KeyboardEvent) => {
      if (![' ', 'ArrowDown', 'End', 'PageDown'].includes(event.key)) {
        return;
      }

      if (lockAtChronicleEnd()) {
        event.preventDefault();
      }
    };

    const rememberTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const preventForwardTouch = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;

      if (touchStartY - currentY > 0 && lockAtChronicleEnd()) {
        event.preventDefault();
      }
    };

    document.addEventListener('wheel', preventForwardWheel, {capture: true, passive: false});
    window.addEventListener('keydown', preventForwardKey, {capture: true});
    document.addEventListener('touchstart', rememberTouchStart, {capture: true, passive: true});
    document.addEventListener('touchmove', preventForwardTouch, {capture: true, passive: false});

    return () => {
      document.removeEventListener('wheel', preventForwardWheel, {capture: true});
      window.removeEventListener('keydown', preventForwardKey, {capture: true});
      document.removeEventListener('touchstart', rememberTouchStart, {capture: true});
      document.removeEventListener('touchmove', preventForwardTouch, {capture: true});
    };
  }, [compactViewport, introComplete]);

  const trackStyle = useMemo(
    () =>
      ({
        '--chronicle-shift': `${-progress * (slideCount - 1) * 100}vw`
      }) as CSSProperties,
    [progress, slideCount]
  );
  const endNavVisible = controlsVisible && lineProgress > 0.92;

  const scrollToChronicleYear = (index: number) => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const targetProgress = clamp(index / Math.max(1, slideCount - 1));
    const isMobile =
      window.innerWidth <= 960 || window.matchMedia('(max-aspect-ratio: 3 / 4)').matches;

    if (isMobile) {
      stage
        .querySelectorAll<HTMLElement>('.chronicle-slide')
        [index]?.scrollIntoView({behavior: 'smooth', block: 'start'});
      return;
    }

    const rect = stage.getBoundingClientRect();
    const stageTop = window.scrollY + rect.top;
    const travel = Math.max(1, rect.height - window.innerHeight);
    window.scrollTo({top: stageTop + targetProgress * travel, behavior: 'smooth'});
  };

  return (
    <main
      className={`chronicle-page is-day-theme ${stageVisible ? 'is-stage-visible' : ''} ${
        controlsVisible ? 'is-controls-visible' : ''
      } ${endNavVisible ? 'is-end-nav-visible' : ''}`}
    >
      <nav className="chronicle-year-nav" aria-label={yearNavAriaLabel}>
        {yearStops.map((stop) => (
          <button
            className={activeIndex === stop.index ? 'is-active' : ''}
            type="button"
            aria-current={activeIndex === stop.index ? 'step' : undefined}
            onClick={() => scrollToChronicleYear(stop.index)}
            key={`${stop.year}-${stop.index}`}
          >
            {stop.year}
          </button>
        ))}
      </nav>

      <Link className="chronicle-end-nav" href={endNav.href} aria-label={endNav.label}>
        <h2>{endNav.title}</h2>
      </Link>

      <section
        className="chronicle-stage"
        ref={stageRef}
        style={{'--chronicle-slides': slideCount} as CSSProperties}
        aria-label={ariaLabel}
      >
        <div className="chronicle-viewport">
          <div className="chronicle-bg-year" aria-hidden="true">
            <span className={yearSwitching ? 'is-switching' : ''}>{displayYear}</span>
          </div>

          <div className="chronicle-track" style={trackStyle}>
            {slides.map((slide, index) => {
              const textThreshold = Math.max(0, (index - 0.75) / Math.max(1, slideCount - 1));
              const imageThreshold = Math.max(0, (index - 0.65) / Math.max(1, slideCount - 1));
              const isTextVisible = progress >= textThreshold;
              const isImageVisible = progress >= imageThreshold;

              return (
                <section
                  className={[
                    'chronicle-slide',
                    index === activeIndex ? 'is-active' : '',
                    isTextVisible ? 'is-text-visible' : '',
                    isImageVisible ? 'is-image-visible' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-year={slide.year}
                  key={`${slide.year}-${slide.title}`}
                >
                  <div className="chronicle-content">
                    <div className="chronicle-copy">
                      <span className="chronicle-copy-kicker">{slide.label}</span>
                      <span className="chronicle-copy-year" aria-hidden="true">{slide.year}</span>
                      <h1>{slide.title}</h1>
                      <p className="whitespace-pre-line">{slide.desc}</p>
                    </div>
                    <div className="chronicle-image-frame">
                      <ChronicleSlideImage
                        key={`${slide.image}-${slide.fallbackImage}`}
                        image={slide.image}
                        fallbackImage={slide.fallbackImage}
                        alt={slide.title}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <div className="chronicle-progress" aria-hidden="true">
        <i style={{width: `${lineProgress * 100}%`}} />
      </div>

      <div
        className={`chronicle-intro ${introExiting ? 'is-exiting' : ''} ${
          introComplete ? 'is-complete' : ''
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="135" />
        </svg>
        <span>{introLabel}</span>
      </div>
    </main>
  );
}

function ChronicleSlideImage({
  image,
  fallbackImage,
  alt
}: {
  image: string;
  fallbackImage: string;
  alt: string;
}) {
  const initialSource = image || fallbackImage;
  const [source, setSource] = useState(initialSource);
  const [failed, setFailed] = useState(false);

  if (!source || failed) {
    return null;
  }

  return (
    <Image
      key={source}
      src={source}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 58vw, 100vw"
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';

        if (source !== fallbackImage) {
          setSource(fallbackImage);
          return;
        }

        setFailed(true);
      }}
    />
  );
}
