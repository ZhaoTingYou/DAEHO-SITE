'use client';

import type {Locale} from '@/i18n/routing';

import {HeroMedia} from './hero-media';

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  poster: string;
  videoPoster?: string;
  videoSrc?: string;
  webmSrc?: string;
  locale: Locale;
};

export function HomeHero({
  eyebrow,
  title,
  subtitle,
  poster,
  videoPoster,
  videoSrc,
  webmSrc,
  locale
}: HomeHeroProps) {
  const titleLines = title.split('\n');
  const titleWeightClass = locale === 'ko' ? 'font-semibold' : 'font-bold';
  const titleSizeClass = locale === 'ko' ? 'text-[clamp(15px,2.7vw,39px)]' : 'text-[clamp(36px,4.8vw,64px)]';

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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] items-end px-[clamp(16px,2.6vw,42px)] pb-[clamp(84px,9vh,116px)] pt-32">
        <div className="flex max-w-[920px] flex-col items-start gap-[clamp(12px,1.5vw,20px)] text-left text-white [text-shadow:0_2px_20px_rgba(16,29,48,.34)]">
          <p className="font-body text-[clamp(9px,0.7vw,11px)] font-medium uppercase leading-[1.35] tracking-[0.2em]">
            {eyebrow}
          </p>
          <h1 className={`flex max-w-full flex-col items-start gap-[clamp(8px,1vw,14px)] font-heading ${titleSizeClass} ${titleWeightClass} leading-[1.08] tracking-[0.01em]`}>
            {titleLines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`} className="block max-w-full overflow-visible whitespace-nowrap">
                {line}
              </span>
            ))}
          </h1>
          <p className="max-w-[880px] whitespace-pre-line [font-family:'Cormorant_Garamond',serif] text-[clamp(12px,1.17vw,18px)] font-bold uppercase leading-[1.35] tracking-[0.12em]">
            {subtitle}
          </p>
        </div>
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
