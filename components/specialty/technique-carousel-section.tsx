'use client';

import Image from 'next/image';
import {type KeyboardEvent, useCallback, useEffect, useState} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {AnimatePresence, motion} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {PlaceholderImg} from '@/components/placeholder-img';
import {imageSrc} from '@/lib/image-src';

export type TechniqueCarouselItem = {
  id: string;
  image: string;
  title: string;
  body: string;
};

type TechniqueCarouselSectionProps = {
  items: TechniqueCarouselItem[];
  carouselLabel: string;
  previousLabel: string;
  nextLabel: string;
  goToSlideLabel: string;
};

export function TechniqueCarouselSection({
  items,
  carouselLabel,
  previousLabel,
  nextLabel,
  goToSlideLabel
}: TechniqueCarouselSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    duration: prefersReducedMotion ? 0 : 24,
    loop: true,
    skipSnaps: false
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const syncCarousel = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.on('select', syncCarousel);
    emblaApi.on('reInit', syncCarousel);

    return () => {
      emblaApi.off('select', syncCarousel);
      emblaApi.off('reInit', syncCarousel);
    };
  }, [emblaApi, syncCarousel]);

  const activeItem = items[selectedIndex] ?? items[0];

  if (!activeItem) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      emblaApi?.scrollPrev();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      emblaApi?.scrollNext();
    }
  };

  return (
    <section
      aria-label={carouselLabel}
      aria-roledescription="carousel"
      className="relative z-10 overflow-hidden bg-white pb-[clamp(84px,9vw,138px)] pt-[clamp(24px,4vw,64px)]"
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex touch-pan-y gap-3 md:gap-4 lg:gap-6">
            {items.map((item, index) => (
              <div
                key={item.id}
                aria-label={`${item.title} · ${index + 1} / ${items.length}`}
                aria-roledescription="slide"
                className="min-w-0 flex-[0_0_84vw] basis-[84vw] md:basis-[84vw] lg:basis-[min(74vw,1920px)]"
                role="group"
              >
                <TechniqueCarouselImage
                  filename={item.image}
                  alt={item.title}
                  sizes="(min-width: 1024px) 74vw, 84vw"
                />
              </div>
            ))}
          </div>
        </div>

        <CarouselArrow label={previousLabel} side="left" onClick={() => emblaApi?.scrollPrev()} />
        <CarouselArrow label={nextLabel} side="right" onClick={() => emblaApi?.scrollNext()} />
      </div>

      <div className="mx-auto mt-5 flex max-w-full justify-center overflow-x-auto px-container">
        <div className="flex min-h-11 items-center justify-center">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-current={index === selectedIndex ? 'true' : undefined}
              aria-label={`${goToSlideLabel} ${index + 1}`}
              onClick={() => emblaApi?.scrollTo(index)}
              className="group grid min-h-11 min-w-11 place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className={`block rounded-full transition-[width,background-color] duration-300 ${
                  index === selectedIndex ? 'h-1.5 w-5 bg-accent' : 'h-1.5 w-1.5 bg-primary/36 group-hover:bg-accent/70'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mx-auto min-h-[210px] max-w-[860px] px-container pt-7 text-center md:pt-9">
        <AnimatePresence mode="wait">
          <motion.article
            key={activeItem.id}
            initial={prefersReducedMotion ? false : {opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={prefersReducedMotion ? {opacity: 1} : {opacity: 0, y: -8}}
            transition={{duration: prefersReducedMotion ? 0 : 0.38, ease: [0.16, 1, 0.3, 1]}}
          >
            <h2 className="break-words font-heading text-[clamp(26px,3vw,42px)] font-semibold leading-[1.22] text-primary">
              {activeItem.title}
            </h2>
            <p className="mobile-copy mx-auto mt-5 max-w-[760px] break-words whitespace-pre-line font-body text-[16px] leading-8 text-text md:mt-6 md:text-[15px]">
              {activeItem.body}
            </p>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}

function CarouselArrow({
  label,
  onClick,
  side
}: {
  label: string;
  onClick: () => void;
  side: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-20 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center text-primary transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        side === 'left' ? 'left-[3vw]' : 'right-[3vw]'
      }`}
    >
      <span
        className={`block h-3 w-3 border-b border-r border-current ${side === 'left' ? 'rotate-[135deg]' : '-rotate-45'}`}
        aria-hidden="true"
      />
    </button>
  );
}

function TechniqueCarouselImage({alt, filename, sizes}: {alt: string; filename: string; sizes: string}) {
  const [failed, setFailed] = useState(false);

  if (!filename || failed) {
    return <PlaceholderImg filename={filename || alt} aspect="aspect-[2/1]" />;
  }

  return (
    <div className="relative w-full overflow-hidden bg-white aspect-[2/1]">
      <Image
        src={imageSrc(filename)}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
