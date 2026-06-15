'use client';

import Image from 'next/image';
import {useState} from 'react';
import {AnimatePresence, motion, type Transition} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

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
};

export function LoyaltyFeatureCarousel({slides, imageAlt}: LoyaltyFeatureCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [current, setCurrent] = useState({index: 0, direction: 1});
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
    : {duration: 0.9, ease: [0.16, 1, 0.3, 1]};

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
        {slides.map((slide, index) => (
          <div
            key={slide.backgroundImage}
            className="relative h-full overflow-hidden"
            style={{
              width: `${100 / slides.length}%`,
              background: `linear-gradient(115deg, ${slide.accentStart}, ${slide.accentEnd})`
            }}
          >
            <Image
              src={`/images/${slide.backgroundImage}`}
              alt={imageAlt}
              fill
              loading={index === current.index ? 'eager' : 'lazy'}
              sizes="100vw"
              className="object-cover opacity-62 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(180,66,54,0.28),rgba(176,82,66,0.12)_42%,rgba(40,72,50,0.26)_100%)]" />
          </div>
        ))}
      </motion.div>
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_22%_24%,rgba(255,232,205,0.55),transparent_26%),radial-gradient(circle_at_62%_12%,rgba(255,236,210,0.42),transparent_30%),linear-gradient(150deg,transparent_0%,rgba(77,27,23,0.4)_78%)]" />

      <SidePreview
        keyName={`left-${previousSlide.previewImage}`}
        slide={previousSlide}
        side="left"
        transition={previewTransition}
      />
      <SidePreview
        keyName={`right-${nextSlide.previewImage}`}
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
          className="absolute left-1/2 top-1/2 z-10 w-[min(78vw,690px)] -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-14 text-center shadow-[0_24px_80px_rgba(56,33,28,0.16)] md:px-20 md:py-20"
        >
          <p className="omega-kicker text-subtext">
            {activeSlide.kicker}
          </p>
          <h2 className="omega-display mt-7 text-primary">
            {activeSlide.title}
          </h2>
          <p className="omega-copy mx-auto mt-8 max-w-[520px] text-text">
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

      <div className="absolute inset-x-0 bottom-0 h-7 bg-primary" />
    </div>
  );
}

function SidePreview({
  keyName,
  slide,
  side,
  transition
}: {
  keyName: string;
  slide: LoyaltyFeatureSlide;
  side: 'left' | 'right';
  transition: Transition;
}) {
  return (
    <div className={`absolute top-[18%] hidden w-[21%] min-w-[190px] bg-white/10 p-0 md:block ${side === 'left' ? 'left-0' : 'right-0'}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={keyName}
          initial={{opacity: 0, x: side === 'left' ? -28 : 28}}
          animate={{opacity: 1, x: 0}}
          exit={{opacity: 0, x: side === 'left' ? -18 : 18}}
          transition={transition}
        >
          <Image
            src={`/images/${slide.previewImage}`}
            alt={slide.title}
            width={520}
            height={680}
            className="aspect-[3/4] w-full object-cover opacity-[0.88] saturate-[0.92] contrast-[0.98]"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
