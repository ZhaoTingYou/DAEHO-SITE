'use client';

import Image from 'next/image';
import {useState} from 'react';
import {AnimatePresence, motion, type Transition} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {PlaceholderImg} from '@/components/placeholder-img';
import type {Locale} from '@/i18n/routing';

export type LoyaltyFeatureSlide = {
  kicker: string;
  title: string;
  body: string;
  backgroundImage: string;
  previewImage: string;
  accentStart: string;
  accentEnd: string;
};

type LoyaltyFeatureCarouselProps = {
  slides: LoyaltyFeatureSlide[];
  imageAlt: string;
  locale: Locale;
};

export function LoyaltyFeatureCarousel({slides, imageAlt}: LoyaltyFeatureCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [current, setCurrent] = useState<{index: number; direction: 1 | -1}>({index: 0, direction: 1});
  const activeSlide = slides[current.index] ?? slides[0];
  const previousSlide = slides[(current.index - 1 + slides.length) % slides.length];
  const nextSlide = slides[(current.index + 1) % slides.length];
  const visualTrackOffset = slides.length > 0 ? -(current.index * 100) / slides.length : 0;

  const goToSlide = (direction: 1 | -1) => {
    setCurrent((state) => ({
      direction,
      index: (state.index + direction + slides.length) % slides.length
    }));
  };

  const trackTransition: Transition = prefersReducedMotion
    ? {duration: 0.01}
    : {duration: 1.18, ease: [0.16, 1, 0.3, 1]};
  const contentTransition: Transition = prefersReducedMotion
    ? {duration: 0.01}
    : {duration: 0.52, ease: [0.16, 1, 0.3, 1]};
  const previewTransition: Transition = prefersReducedMotion
    ? {duration: 0.01}
    : {duration: 1.05, ease: [0.16, 1, 0.3, 1]};
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const carouselBodyTextClass = "[font-family:Pretendard,sans-serif] font-normal";

  if (!activeSlide) {
    return null;
  }

  return (
    <div className="relative mx-auto min-h-[clamp(520px,62vw,760px)] max-w-[1500px] overflow-hidden bg-[#a95d50]">
      <motion.div
        className="absolute inset-y-0 left-0 flex"
        style={{width: `${slides.length * 100}%`}}
        animate={{x: `${visualTrackOffset}%`}}
        transition={trackTransition}
      >
        {slides.map((slide, index) => {
          const visualImage = slide.previewImage || slide.backgroundImage;

          return (
            <div
              key={`${slide.title}-${visualImage}`}
              className="relative h-full overflow-hidden"
              style={{
                width: `${100 / slides.length}%`,
                background: `linear-gradient(115deg, ${slide.accentStart}, ${slide.accentEnd})`
              }}
            >
              <LoyaltyCarouselImage
                filename={visualImage}
                alt={imageAlt}
                loading={index === current.index ? 'eager' : 'lazy'}
                sizes="100vw"
                className="object-cover opacity-62 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(180,66,54,0.28),rgba(176,82,66,0.12)_42%,rgba(40,72,50,0.26)_100%)]" />
            </div>
          );
        })}
      </motion.div>
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_22%_24%,rgba(255,232,205,0.55),transparent_26%),radial-gradient(circle_at_62%_12%,rgba(255,236,210,0.42),transparent_30%),linear-gradient(150deg,transparent_0%,rgba(77,27,23,0.4)_78%)]" />

      <SidePreview
        direction={current.direction}
        slide={previousSlide}
        side="left"
        transition={previewTransition}
      />
      <SidePreview
        direction={current.direction}
        slide={nextSlide}
        side="right"
        transition={previewTransition}
      />

      <button
        type="button"
        aria-label="Previous loyalty slide"
        onClick={() => goToSlide(-1)}
        className="absolute left-[clamp(18px,19vw,285px)] top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center bg-white/88 text-primary transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:grid"
      >
        <span className="block h-3 w-3 rotate-[135deg] border-b border-r border-primary" />
      </button>
      <button
        type="button"
        aria-label="Next loyalty slide"
        onClick={() => goToSlide(1)}
        className="absolute right-[clamp(18px,19vw,285px)] top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center bg-white/88 text-primary transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:grid"
      >
        <span className="block h-3 w-3 -rotate-45 border-b border-r border-primary" />
      </button>

      <AnimatePresence mode="wait" custom={current.direction}>
        <motion.article
          key={activeSlide.title}
          custom={current.direction}
          initial={prefersReducedMotion ? {opacity: 1} : {opacity: 0, x: current.direction * 28}}
          animate={{opacity: 1, x: 0}}
          exit={prefersReducedMotion ? {opacity: 1} : {opacity: 0, x: current.direction * -28}}
          transition={contentTransition}
          className="absolute left-1/2 top-1/2 z-10 w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-12 text-center shadow-[0_24px_80px_rgba(56,33,28,0.16)] md:px-16 md:py-16"
        >
          {activeSlide.kicker ? (
            <p className={`${englishTextClass} text-[14px] uppercase leading-[19px] tracking-[0.2em] text-subtext`}>
              {activeSlide.kicker}
            </p>
          ) : null}
          <h2 className={`${englishTextClass} text-[32px] leading-tight tracking-normal text-primary ${activeSlide.kicker ? 'mt-7' : ''}`}>
            {activeSlide.title}
          </h2>
          <p className={`${carouselBodyTextClass} mx-auto mt-8 max-w-[600px] whitespace-pre-line text-[15px] leading-[1.72] tracking-normal text-text`}>
            {activeSlide.body}
          </p>
        </motion.article>
      </AnimatePresence>

      <div className="absolute bottom-11 left-1/2 z-20 flex -translate-x-1/2 gap-3 md:hidden">
        <button
          type="button"
          aria-label="Previous loyalty slide"
          onClick={() => goToSlide(-1)}
          className="grid h-11 w-11 place-items-center bg-white/90 text-primary shadow-[0_12px_32px_rgba(28,23,20,0.12)]"
        >
          <span className="block h-3 w-3 rotate-[135deg] border-b border-r border-primary" />
        </button>
        <button
          type="button"
          aria-label="Next loyalty slide"
          onClick={() => goToSlide(1)}
          className="grid h-11 w-11 place-items-center bg-white/90 text-primary shadow-[0_12px_32px_rgba(28,23,20,0.12)]"
        >
          <span className="block h-3 w-3 -rotate-45 border-b border-r border-primary" />
        </button>
      </div>
    </div>
  );
}

function SidePreview({
  direction,
  slide,
  side,
  transition
}: {
  direction: 1 | -1;
  slide: LoyaltyFeatureSlide;
  side: 'left' | 'right';
  transition: Transition;
}) {
  const enterX = direction === 1 ? 28 : -28;

  return (
    <div className={`absolute top-[24%] hidden aspect-[3/4] w-[21%] min-w-[190px] overflow-hidden md:block ${side === 'left' ? 'left-0' : 'right-0'}`}>
      <motion.div
        key={`${side}-${slide.previewImage}`}
        initial={{x: enterX}}
        animate={{x: 0}}
        transition={transition}
        className="absolute -left-7 inset-y-0 w-[calc(100%+56px)]"
      >
        <LoyaltyCarouselImage
          filename={slide.previewImage}
          alt={slide.title}
          sizes="(min-width: 768px) 24vw, 0px"
          className="object-cover opacity-[0.88] saturate-[0.92] contrast-[0.98]"
        />
      </motion.div>
    </div>
  );
}

function LoyaltyCarouselImage({
  alt,
  className,
  filename,
  loading = 'lazy',
  sizes
}: {
  alt: string;
  className: string;
  filename: string;
  loading?: 'eager' | 'lazy';
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <PlaceholderImg filename={filename} aspect="h-full" />;
  }

  return (
    <Image
      src={`/images/${filename}`}
      alt={alt}
      fill
      loading={loading}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
