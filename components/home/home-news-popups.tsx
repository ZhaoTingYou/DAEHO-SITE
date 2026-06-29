'use client';

import {AnimatePresence, motion} from 'framer-motion';
import Image from 'next/image';
import {useEffect, useId, useRef, useState} from 'react';

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
  const [bodyPage, setBodyPage] = useState(0);
  const [modalImageRatio, setModalImageRatio] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyPages = splitModalBody(activeCard?.body ?? text.body);
  const activeBodyPage = bodyPages[bodyPage] ?? bodyPages[0] ?? '';

  useEffect(() => {
    if (!activeCard) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCard(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCard]);

  return (
    <>
      <div className="grid items-stretch gap-[clamp(22px,2vw,32px)] md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              setBodyPage(0);
              setModalImageRatio(null);
              setActiveCard(card);
            }}
            className="group grid h-full cursor-pointer grid-rows-[auto_1fr] bg-transparent text-left transition duration-hover ease-brand hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <div className="hover-zoom">
              <div className="hover-zoom-media">
                <NewsImage card={card} />
              </div>
            </div>
            <div className="grid min-h-[176px] grid-rows-[auto_1fr_auto] gap-4 py-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[15px] font-medium uppercase tracking-[0.08em] text-subtext">
                <span className="text-accent">{card.categoryLabel}</span>
                <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                <span>{card.date}</span>
              </p>
              <h3 className="font-heading text-[clamp(20px,1.55vw,25px)] font-semibold leading-[1.2] text-primary">
                {card.title}
              </h3>
              <span className="w-fit border-b border-primary/30 pb-1 [font-family:'Pretendard',sans-serif] text-[15px] font-normal leading-none text-primary transition duration-hover ease-brand group-hover:border-accent group-hover:text-accent">
                {text.open}
              </span>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeCard ? (
          <motion.div
            className="fixed inset-0 z-[120] grid place-items-center bg-primary/45 px-container py-8 backdrop-blur-[2px]"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setActiveCard(null);
              }
            }}
          >
            <motion.article
              role="dialog"
              aria-modal="true"
              aria-label={text.label}
              aria-labelledby={titleId}
              className="relative grid max-h-[calc(100dvh-48px)] w-full max-w-[1180px] overflow-y-auto bg-white p-[clamp(14px,1.6vw,28px)] shadow-[0_32px_120px_rgba(16,29,48,0.22)] md:grid-cols-[minmax(320px,0.92fr)_minmax(320px,0.98fr)] md:items-stretch md:gap-[clamp(28px,3.2vw,56px)] md:overflow-hidden"
              initial={{opacity: 0, y: 18, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: 12, scale: 0.98}}
              transition={{duration: 0.32, ease: [0.16, 1, 0.3, 1]}}
            >
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={text.close}
                onClick={() => setActiveCard(null)}
                className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center bg-white/80 font-body text-[22px] font-light leading-none text-primary backdrop-blur transition duration-hover ease-brand hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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

              <div className="flex min-h-0 flex-col justify-center gap-[clamp(24px,3vw,42px)] px-2 py-8 md:h-full md:px-0 md:py-[clamp(34px,4vw,58px)]">
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
                </div>
                <div className="space-y-[clamp(18px,2.4vw,28px)]">
                  <p className="whitespace-pre-line font-body text-[15px] leading-[1.85] text-text">
                    {activeBodyPage}
                  </p>
                  {bodyPages.length > 1 ? (
                    <div className="flex items-center gap-3 font-body text-[13px] font-semibold leading-none text-primary">
                      <button
                        type="button"
                        onClick={() => setBodyPage((current) => Math.max(current - 1, 0))}
                        disabled={bodyPage === 0}
                        aria-label="Previous page"
                        className="grid h-11 w-11 place-items-center border border-primary/25 text-[18px] transition duration-hover ease-brand hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                      >
                        <span aria-hidden="true">‹</span>
                      </button>
                      <span>{bodyPage + 1} / {bodyPages.length}</span>
                      <button
                        type="button"
                        onClick={() => setBodyPage((current) => Math.min(current + 1, bodyPages.length - 1))}
                        disabled={bodyPage >= bodyPages.length - 1}
                        aria-label="Next page"
                        className="grid h-11 w-11 place-items-center border border-primary/25 text-[18px] transition duration-hover ease-brand hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                      >
                        <span aria-hidden="true">›</span>
                      </button>
                    </div>
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
          fillFrame ? 'aspect-square max-h-[calc(100dvh-136px)]' : 'aspect-[3/4]'
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
      className={`relative w-full overflow-hidden bg-bg ${
        fillFrame ? 'aspect-square max-h-[calc(100dvh-136px)]' : 'aspect-[3/4]'
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

function splitModalBody(body: string) {
  const normalized = body.trim();
  const maxLength = 185;

  if (!normalized || normalized.length <= maxLength) {
    return normalized ? [normalized] : [];
  }

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [normalized];
  const pages: string[] = [];
  let current = '';

  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length > maxLength) {
      pages.push(current);
      current = sentence;
      continue;
    }

    current = `${current} ${sentence}`;
  }

  if (current) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [normalized];
}
