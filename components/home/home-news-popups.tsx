'use client';

import {AnimatePresence, motion} from 'framer-motion';
import Image from 'next/image';
import {useEffect, useId, useRef, useState} from 'react';

export type HomeNewsPopupCard = {
  id: string;
  category: string;
  categoryLabel: string;
  date: string;
  title: string;
  image: string;
  hasImage: boolean;
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setActiveCard(card)}
            className="group grid h-full cursor-pointer grid-rows-[auto_1fr] bg-bg p-3 text-left shadow-[0_16px_54px_rgba(16,29,48,0.055)] transition duration-hover ease-brand hover:-translate-y-1 hover:shadow-[0_24px_78px_rgba(16,29,48,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <div className="hover-zoom">
              <div className="hover-zoom-media">
                <NewsImage card={card} />
              </div>
            </div>
            <div className="grid min-h-[166px] grid-rows-[auto_1fr_auto] gap-3 px-1 py-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[10px] font-semibold uppercase tracking-[0.15em] text-subtext">
                <span className="text-accent">{card.categoryLabel}</span>
                <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                <span>{card.date}</span>
              </p>
              <h3 className="font-heading text-[clamp(18px,1.35vw,22px)] font-semibold leading-tight text-primary">
                {card.title}
              </h3>
              <span className="w-fit border-b border-primary/30 pb-1 [font-family:'Pretendard',sans-serif] text-[13px] font-normal leading-none text-primary transition duration-hover ease-brand group-hover:border-accent group-hover:text-accent">
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
              className="relative grid max-h-[calc(100dvh-64px)] w-full max-w-[920px] overflow-y-auto bg-white p-4 shadow-[0_32px_120px_rgba(16,29,48,0.22)] md:grid-cols-[0.9fr_1fr] md:p-6"
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

              <NewsImage card={activeCard} priority fillFrame fallbackLabel={text.fallback} />

              <div className="flex flex-col justify-start gap-6 px-2 pb-2 pt-14 md:px-8 md:py-10">
                <div className="space-y-4">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-subtext">
                    <span className="text-accent">{activeCard.categoryLabel}</span>
                    <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                    <span>{activeCard.date}</span>
                  </p>
                  <h3
                    id={titleId}
                    className="font-heading text-[clamp(22px,2.6vw,32px)] font-semibold leading-tight text-primary"
                  >
                    {activeCard.title}
                  </h3>
                </div>
                <p className="font-body text-[13px] leading-7 text-text">
                  {text.body}
                </p>
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
  fallbackLabel
}: {
  card: HomeNewsPopupCard;
  priority?: boolean;
  fillFrame?: boolean;
  fallbackLabel?: string;
}) {
  if (!card.hasImage) {
    return (
      <div
        className={`flex w-full items-center justify-center break-all border border-hairline bg-white p-5 text-center font-body text-xs font-semibold leading-5 tracking-[0.08em] text-subtext ${
          fillFrame ? 'min-h-[260px] md:min-h-[360px]' : 'aspect-[3/4]'
        }`}
        role="img"
        aria-label={card.image}
      >
        {fallbackLabel ?? card.image}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-bg ${fillFrame ? 'min-h-[260px] md:min-h-[360px]' : 'aspect-[3/4]'}`}>
      <Image
        src={`/images/${card.image}`}
        alt={`${card.categoryLabel} ${card.title}`}
        fill
        priority={priority}
        sizes="(min-width: 1280px) 290px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
