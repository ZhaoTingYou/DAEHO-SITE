'use client';

import {AnimatePresence, motion} from 'framer-motion';
import Image from 'next/image';
import {type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useId, useRef, useState} from 'react';

import {imageSrc} from '@/lib/image-src';

export type HomeNewsPopupCard = {
  id: string;
  category: string;
  categoryLabel: string;
  date: string;
  title: string;
  image: string;
  hasImage: boolean;
  body?: string;
};

type HomeNewsPopupsProps = {
  cards: HomeNewsPopupCard[];
  text: {
    open: string;
    close: string;
    label: string;
    fallback: string;
    body: string;
  };
};

export function HomeNewsPopups({cards, text}: HomeNewsPopupsProps) {
  const [activeCard, setActiveCard] = useState<HomeNewsPopupCard | null>(null);
  const [modalImageRatio, setModalImageRatio] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const closeModal = useCallback(() => {
    setActiveCard(null);
  }, []);

  const handleModalExitComplete = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) {
      opener.focus();
      return;
    }

    const fallback = document.querySelector<HTMLButtonElement>('.mobile-home-news-row');
    if (fallback?.isConnected) {
      fallback.focus();
    }
  }, []);

  const handleModalKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements?.length) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  useEffect(() => {
    if (!activeCard) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCard, closeModal]);

  return (
    <>
      <div className="grid items-stretch gap-[clamp(22px,2vw,32px)] md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={(event) => {
              openerRef.current = event.currentTarget;
              setModalImageRatio(null);
              setActiveCard(card);
            }}
            className="mobile-home-news-row group grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-t border-primary/15 py-5 text-left transition duration-hover ease-brand hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:h-full md:grid-cols-none md:grid-rows-[auto_1fr] md:gap-0 md:border-t-0 md:py-0"
          >
            <div className="hover-zoom">
              <div className="hover-zoom-media">
                <NewsImage card={card} />
              </div>
            </div>
            <div className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-2 py-0 md:min-h-[176px] md:gap-4 md:py-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[12px] font-medium uppercase tracking-[0.08em] text-subtext md:text-[15px]">
                <span className="text-accent">{card.categoryLabel}</span>
                <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                <span>{card.date}</span>
              </p>
              <h3 className="font-heading text-[20px] font-semibold leading-[1.2] text-primary md:text-[clamp(20px,1.55vw,25px)]">
                {card.title}
              </h3>
              <span className="hidden w-fit border-b border-primary/30 pb-1 [font-family:'Pretendard',sans-serif] text-[15px] font-normal leading-none text-primary transition duration-hover ease-brand group-hover:border-accent group-hover:text-accent md:block">
                {text.open}
              </span>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence onExitComplete={handleModalExitComplete}>
        {activeCard ? (
          <motion.div
            className="fixed inset-0 z-[120] grid items-end bg-primary/45 px-2 pb-2 pt-8 backdrop-blur-[2px] md:place-items-center md:px-container md:py-8"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <motion.article
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={text.label}
              aria-labelledby={titleId}
              onKeyDown={handleModalKeyDown}
              className="relative grid max-h-[calc(100dvh-16px)] w-full max-w-[1180px] overflow-y-auto rounded-t-[8px] bg-white p-4 shadow-[0_32px_120px_rgba(16,29,48,0.22)] md:max-h-[calc(100dvh-48px)] md:rounded-none md:p-[clamp(14px,1.6vw,28px)] md:grid-cols-[minmax(320px,0.92fr)_minmax(320px,0.98fr)] md:items-stretch md:gap-[clamp(28px,3.2vw,56px)] md:overflow-hidden"
              initial={{opacity: 0, y: 18, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: 12, scale: 0.98}}
              transition={{duration: 0.32, ease: [0.16, 1, 0.3, 1]}}
            >
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={text.close}
                onClick={closeModal}
                className="absolute right-4 top-4 z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center bg-white/80 font-body text-[22px] font-light leading-none text-primary backdrop-blur transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span aria-hidden="true">×</span>
              </button>

              <NewsImage
                card={activeCard}
                priority
                fillFrame
                fallbackLabel={text.fallback}
                aspectRatio={modalImageRatio}
                onNaturalSize={(width, height) => {
                  if (width > 0 && height > 0) {
                    setModalImageRatio(width / height);
                  }
                }}
              />

              <div className="flex min-h-0 flex-col justify-center gap-[clamp(12px,1.5vw,21px)] overflow-y-auto px-2 py-8 md:h-full md:px-0 md:py-[clamp(34px,4vw,58px)]">
                <div className="space-y-[clamp(14px,1.8vw,22px)]">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[15px] font-medium uppercase tracking-[0.08em] text-subtext">
                    <span className="text-accent">{activeCard.categoryLabel}</span>
                    <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                    <span>{activeCard.date}</span>
                  </p>
                  <h3
                    id={titleId}
                    className="font-heading text-[clamp(24px,3vw,42px)] font-semibold leading-[1.18] text-primary"
                  >
                    {activeCard.title}
                  </h3>
                  {activeCard.body ? (
                    <p className="whitespace-pre-line font-body text-[15px] leading-[1.8] text-[#475467] md:text-base">
                      {activeCard.body}
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.article>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function NewsImage({
  card,
  priority = false,
  fillFrame = false,
  fallbackLabel,
  aspectRatio,
  onNaturalSize
}: {
  card: HomeNewsPopupCard;
  priority?: boolean;
  fillFrame?: boolean;
  fallbackLabel?: string;
  aspectRatio?: number | null;
  onNaturalSize?: (width: number, height: number) => void;
}) {
  const frameStyle = fillFrame && aspectRatio ? {aspectRatio} : undefined;

  if (!card.hasImage) {
    return (
      <div
        style={frameStyle}
        className={`flex w-full items-center justify-center break-all border border-hairline bg-white p-5 text-center font-body text-[15px] font-semibold leading-5 tracking-[0.08em] text-subtext ${
          fillFrame ? 'aspect-[4/3] max-h-[calc(100dvh-136px)] md:aspect-square' : 'aspect-[3/4]'
        }`}
        role="img"
        aria-label={card.image}
      >
        {fallbackLabel ?? card.image}
      </div>
    );
  }

  return (
    <div
      style={frameStyle}
        className={`home-news-image relative w-full overflow-hidden bg-bg ${
        fillFrame ? 'aspect-[4/3] max-h-[calc(100dvh-136px)] md:aspect-square' : 'aspect-[3/4]'
      }`}
    >
      <Image
        src={imageSrc(card.image)}
        alt={`${card.categoryLabel} ${card.title}`}
        fill
        priority={priority}
        sizes="(min-width: 1280px) 290px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
        onLoad={(event) => {
          onNaturalSize?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
        }}
      />
    </div>
  );
}
