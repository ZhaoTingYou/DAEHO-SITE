'use client';

import {motion, type Variants} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

import {HeroMedia} from './hero-media';

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  poster: string;
  videoPoster?: string;
  videoSrc?: string;
  webmSrc?: string;
};

export function HomeHero({
  eyebrow,
  title,
  subtitle,
  poster,
  videoPoster,
  videoSrc,
  webmSrc
}: HomeHeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const titleLines = title.split('\n');
  const isNumericWord = (word: string) => /^[\d,]+$/.test(word);
  const titleVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12
      }
    }
  };
  const wordVariants: Variants = {
    hidden: {opacity: 0, y: prefersReducedMotion ? 0 : 40},
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.18 : 0.9,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };
  const copyVariants: Variants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0.18 : 0.65,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-bg">
      <HeroMedia
        poster={poster}
        videoPoster={videoPoster}
        videoSrc={videoSrc}
        webmSrc={webmSrc}
        priority
        className="absolute inset-0 h-[110%] w-full"
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] items-end px-container pb-24 pt-32 md:pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-5xl space-y-4 text-white [text-shadow:0_2px_20px_rgba(16,29,48,.34)]"
        >
          <motion.p
            variants={copyVariants}
            className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em]"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            variants={titleVariants}
            className="flex flex-col gap-4 font-heading text-hero font-bold leading-none tracking-normal"
          >
            {titleLines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`} className="block overflow-hidden">
                {line.split(' ').map((word, wordIndex, words) => (
                  <span key={`${word}-${lineIndex}-${wordIndex}`} className="inline-block overflow-hidden">
                    <motion.span variants={wordVariants} className="inline-block">
                      <span className={isNumericWord(word) ? 'home-hero__number' : undefined}>
                        {word}
                      </span>
                      {wordIndex < words.length - 1 ? '\u00A0' : ''}
                    </motion.span>
                  </span>
                ))}
              </span>
            ))}
          </motion.h1>
          <motion.p
            variants={copyVariants}
            className="max-w-2xl -mt-1 whitespace-pre-line font-body text-body leading-[1.7]"
          >
            {subtitle}
          </motion.p>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center pb-[env(safe-area-inset-bottom)]" aria-hidden="true">
        <div className="home-scroll-hint flex flex-col items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-white [text-shadow:0_1px_14px_rgba(16,29,48,.38)]">
          <span>Scroll</span>
          <span className="h-10 w-px bg-white/70" />
        </div>
      </div>
    </section>
  );
}
