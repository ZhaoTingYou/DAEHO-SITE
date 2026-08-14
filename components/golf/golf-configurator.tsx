'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';
import {appendCmsQuery, resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {imageSrc} from '@/lib/image-src';

type GolfImageRef = {
  image: string;
};

type GolfHeroSlide = GolfImageRef & {
  alt?: string;
};

export type GolfHeadOption = GolfImageRef & {
  id: string;
  label: string;
  kicker: string;
  caption: string;
};

export type GolfShaftOption = GolfImageRef & {
  id: string;
  label: string;
  caption: string;
};

export type GolfConfiguratorContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    image: string;
    specLabel: string;
    gallery?: GolfHeroSlide[];
  };
  statement: {
    titleLines: string[];
    body: string;
    image: string;
  };
  heads: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: GolfHeadOption[];
  };
  shafts: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: GolfShaftOption[];
  };
  engraving: {
    eyebrow: string;
    title: string;
    body: string;
    imagePrimary: string;
    imageDetail: string;
    specs: string[];
  };
  lifestyle: {
    eyebrow: string;
    title: string;
    body: string;
    imageBox: string;
    imageLifestyle: string;
    closing: string;
  };
  labels: {
    selectedHead: string;
    selectedShaft: string;
    headGroup: string;
    shaftGroup: string;
    inquiryCta: string;
    inquiryHref: string;
    requestEstimate: string;
    quoteText: string;
    braceletTitle: string;
    braceletBody: string;
    shaftTitle: string;
    previousShaft: string;
    nextShaft: string;
    styleOptions: string[];
    engravingSample: string;
  };
  process: {
    packageImageLabel: string;
    title: string;
    steps: Array<{
      id: string;
      title: string;
      lines: string[];
    }>;
  };
};

type GolfConfiguratorProps = {
  assets: Record<string, boolean>;
  content: GolfConfiguratorContent;
  locale: Locale;
};

const golfShaftVisuals: Record<string, string> = {
  black: 'object-[9%_50%]',
  white: 'object-[38%_50%]',
  burgundy: 'object-[66%_50%]',
  navy: 'object-[93%_50%]'
};

const golfHeadVisuals: Record<string, string> = {
  ball: '[clip-path:inset(0_29%_0_0)]'
};

export function GolfConfigurator({assets, content, locale}: GolfConfiguratorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedHeadId, setSelectedHeadId] = useState(content.heads.items[0]?.id ?? '');
  const [selectedStyleOption, setSelectedStyleOption] = useState(
    content.labels.styleOptions[0] ?? ''
  );
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  const selectedHead = useMemo(
    () => content.heads.items.find((item) => item.id === selectedHeadId) ?? content.heads.items[0],
    [content.heads.items, selectedHeadId]
  );
  const selectedShaft = content.shafts.items[0];
  const heroSlides = useMemo(
    () => {
      const gallery = Array.isArray(content.hero.gallery) ? content.hero.gallery : [];

      return [
        {
          filename: content.hero.image,
          alt: content.hero.subtitle,
          imageClass: 'object-contain object-center origin-center scale-100'
        },
        ...gallery.map((item, index) => ({
          filename: item.image,
          alt: item.alt || content.hero.subtitle,
          imageClass:
            index === 0
              ? 'object-contain object-center origin-center scale-[0.80]'
              : 'object-contain object-center origin-center scale-[0.84]'
        }))
      ].filter((item) => item.filename);
    },
    [content.hero.gallery, content.hero.image, content.hero.subtitle]
  );
  const activeHeroSlide = heroSlides[heroSlideIndex] ?? {
    filename: content.hero.image,
    alt: content.hero.subtitle,
    imageClass: 'object-contain object-center origin-center scale-100'
  };
  const engravingSample = content.labels.engravingSample;
  const inquiryHref = appendCmsQuery(
    resolveCmsHref(locale, content.labels.inquiryHref, '/golf/inquiry'),
    {
      head: selectedHead?.id ?? '',
      shaft: selectedShaft?.id ?? '',
      style: selectedStyleOption,
      engraving: engravingSample
    }
  );
  const labels = content.labels;
  const process = content.process;
  const styleOptions = labels.styleOptions;
  const lifestyleImages = [
    content.lifestyle.imageBox,
    content.lifestyle.imageLifestyle,
    content.lifestyle.imageBox
  ].filter(Boolean);
  const engravingLeadLines =
    locale === 'ko'
      ? [content.engraving.eyebrow, content.engraving.body]
      : [content.engraving.eyebrow, content.engraving.title];
  const engravingRecordLine = locale === 'ko' ? content.engraving.title : content.engraving.body;
  const heroSubtitleLines = content.hero.subtitle.split('\n');
  const changeHeroSlide = (direction: 1 | -1) => {
    if (heroSlides.length === 0) {
      return;
    }

    setHeroSlideIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  return (
    <main className="mobile-page-shell bg-white text-white">
      <section className="relative overflow-hidden bg-black pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+28px)] md:pt-28">
        <div className="mx-auto max-w-[1240px] px-[var(--mobile-page-gutter)] pb-0 md:px-container">
          <motion.p
            initial={false}
            animate={{opacity: 1, y: 0}}
            transition={{duration: prefersReducedMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1]}}
            className="text-center [font-family:'Cormorant_Garamond',serif] text-[16px] font-bold uppercase tracking-[0.08em] text-white/72 md:text-[18px]"
          >
            {content.hero.eyebrow}
          </motion.p>

          <div className="relative mt-7 min-h-[300px] md:mt-[clamp(30px,4vw,58px)] md:min-h-[clamp(300px,48vw,610px)]">
            <button
              type="button"
              onClick={() => changeHeroSlide(-1)}
              className="absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={locale === 'ko' ? '이전 이미지' : 'Previous image'}
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => changeHeroSlide(1)}
              className="absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={locale === 'ko' ? '다음 이미지' : 'Next image'}
            >
              <ChevronIcon direction="right" />
            </button>

            <motion.div
              key={activeHeroSlide.filename}
              initial={{opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: prefersReducedMotion ? 0 : 0.82, ease: [0.16, 1, 0.3, 1]}}
              className="absolute left-1/2 top-0 h-full w-[min(76vw,840px)] -translate-x-1/2"
            >
              <GolfImage
                filename={activeHeroSlide.filename}
                alt={activeHeroSlide.alt}
                assets={assets}
                className={activeHeroSlide.imageClass}
                priority={heroSlideIndex === 0}
              />
            </motion.div>
          </div>

          <div className="relative left-1/2 mt-10 min-h-[520px] w-screen -translate-x-1/2 overflow-hidden bg-white md:mt-[clamp(42px,5vw,72px)] md:min-h-[clamp(520px,35vw,680px)]">
            <Reveal className="relative z-10 flex min-h-[500px] max-w-[520px] flex-col justify-center space-y-5 px-[var(--mobile-page-gutter)] pb-[190px] pt-14 md:min-h-[clamp(520px,35vw,680px)] md:px-container md:py-20 lg:ml-[clamp(84px,12.5vw,240px)] lg:px-0">
              <h1 className="mobile-display font-heading font-semibold uppercase text-primary md:text-[clamp(64px,6.4vw,112px)] md:leading-[0.82]">
                {content.hero.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mobile-copy max-w-[380px] break-words font-body font-medium text-primary/60 md:text-[15px] md:leading-[1.35]">
                {heroSubtitleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </Reveal>

            <Reveal className="pointer-events-none absolute bottom-[clamp(22px,7vw,56px)] right-[-28vw] h-[clamp(210px,55vw,330px)] w-[clamp(360px,104vw,620px)] overflow-hidden sm:right-[-16vw] md:bottom-auto md:right-0 md:top-1/2 md:h-[clamp(360px,33vw,650px)] md:w-[clamp(620px,56vw,1080px)] md:-translate-y-1/2">
              <div className="absolute inset-0">
                <GolfImage
                  filename={content.statement.image}
                  alt={content.statement.body}
                  assets={assets}
                  className="object-contain object-right"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-[var(--mobile-section-space)] md:pb-[clamp(81px,10vw,149px)] md:pt-[clamp(96px,11vw,160px)]">
        <div className="mx-auto max-w-[1240px] space-y-10 px-[var(--mobile-page-gutter)] md:space-y-[clamp(46px,6vw,72px)] md:px-container">
          <Reveal className="mx-auto max-w-[360px] space-y-3 text-center">
            <h2 className="font-heading text-[clamp(20px,2vw,27px)] font-semibold leading-tight text-primary">
              {content.heads.title}
            </h2>
            <p className="mobile-copy break-words whitespace-pre-line font-body text-primary/60 md:text-[18px] md:leading-[1.3]">
              {content.heads.subtitle}
            </p>
          </Reveal>

          <div
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label={content.labels.headGroup}
          >
            {content.heads.items.map((item) => {
              const isSelected = item.id === selectedHead?.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedHeadId(item.id)}
                  className={`group min-h-11 border p-2 text-left transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
                    isSelected ? 'border-2 border-primary bg-primary/5' : 'border-primary/20 bg-white hover:border-primary/60'
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <GolfImage
                      filename={item.image}
                      alt={item.caption}
                      assets={assets}
                      className={`object-cover ${golfHeadVisuals[item.id] ?? ''}`}
                    />
                  </div>
                  <p className="px-1 pt-3 font-body text-[16px] font-semibold uppercase tracking-[0.02em] text-primary/70 md:text-[18px]">
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid items-center gap-8 pt-[clamp(26px,5vw,58px)] md:grid-cols-[0.75fr_1.25fr]">
            <Reveal className="space-y-2">
              <p className="font-heading text-[20px] font-semibold text-primary md:text-[clamp(18px,2vw,26px)]">
                {labels.braceletTitle}
              </p>
              <p className="mobile-copy break-words whitespace-pre-line font-body text-primary/55 md:text-[18px] md:leading-[1.3]">
                {labels.braceletBody}
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {styleOptions.map((label) => {
                const isSelected = label === selectedStyleOption;

                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStyleOption(label)}
                    className={`relative aspect-[1.15/1] min-h-11 transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
                      isSelected ? 'bg-primary text-white hover:bg-primary/90' : 'bg-[#d8d8d8] text-primary hover:bg-white'
                    }`}
                  >
                    <span className="absolute bottom-3 right-3 font-body text-[16px] font-semibold uppercase tracking-[0.02em] md:text-[18px]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-0 pt-[var(--mobile-section-space)] text-primary md:pt-[clamp(108px,13.5vw,198px)]">
        <div className="mx-auto max-w-[1120px] space-y-[var(--mobile-section-space)] px-[var(--mobile-page-gutter)] md:space-y-[clamp(105px,12vw,177px)] md:px-container">
          <div className="mx-auto max-w-[900px] space-y-[clamp(34px,4vw,44px)]">
            <Reveal className="text-center">
              <h2
                className={`text-[clamp(24px,2.5vw,36px)] leading-tight text-primary ${
                  locale === 'ko'
                    ? "[font-family:'MaruBuri',serif] font-semibold"
                    : "[font-family:'Cormorant_Garamond',serif] font-bold uppercase tracking-normal"
                }`}
              >
                {labels.shaftTitle}
              </h2>
            </Reveal>

            <div
              className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 md:gap-x-9"
              aria-label={content.labels.shaftGroup}
            >
              {content.shafts.items.map((item) => (
                <figure key={item.id} className="text-center">
                  <div className="relative mx-auto aspect-[0.68/1] w-full max-w-[178px] overflow-hidden bg-white">
                    <GolfImage
                      filename={item.image}
                      alt={item.caption}
                      assets={assets}
                      className={`scale-[1.35] object-cover ${golfShaftVisuals[item.id] ?? golfShaftVisuals.navy} mix-blend-multiply`}
                    />
                  </div>
                  <figcaption className="mt-5 font-heading text-[16px] font-semibold uppercase [letter-spacing:0] text-primary md:mt-6 md:text-[18px]">
                    {item.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black pb-[clamp(129px,15vw,240px)]">
            <Reveal className="relative mx-auto grid max-w-[980px] gap-8 px-[var(--mobile-page-gutter)] py-[var(--mobile-section-space)] md:gap-10 md:px-container md:py-[clamp(82px,11vw,150px)] md:min-h-[clamp(1080px,82vw,1400px)]">
              <p className="relative z-20 break-words whitespace-pre-line text-center font-heading text-[18px] font-semibold leading-tight text-white md:absolute md:left-1/2 md:top-[8%] md:-translate-x-1/2 md:text-[clamp(18px,1.7vw,24px)]">
                “{labels.quoteText}”
              </p>

              <div className="relative z-20 space-y-[12px] text-left md:absolute md:left-[6%] md:top-[30%] md:w-[34%]">
                <h2
                  className={`text-[clamp(20px,1.65vw,25px)] font-semibold leading-[1.45] text-white ${
                    locale === 'ko'
                      ? "[font-family:'MaruBuri',serif]"
                      : "[font-family:'Cormorant_Garamond',serif]"
                  }`}
                >
                  {engravingLeadLines.map((line) => (
                    <span key={line} className="block whitespace-pre-line">
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="mobile-copy break-words whitespace-pre-line font-body text-white/82 md:text-[clamp(14px,1.35vw,20px)] md:leading-[1.35]">
                  {engravingRecordLine}
                </p>
              </div>

              <div className="relative aspect-[0.74/1] w-full overflow-hidden bg-[#f2f0ec] md:absolute md:right-[10%] md:top-[20%] md:w-[39%]">
                <GolfImage
                  filename={content.engraving.imagePrimary}
                  alt={content.engraving.title}
                  assets={assets}
                  className="object-cover"
                />
              </div>

              <div className="relative aspect-[1.36/1] w-full overflow-hidden bg-[#f2f0ec] md:absolute md:bottom-[4%] md:left-[3%] md:w-[43%]">
                <GolfImage
                  filename={content.engraving.imageDetail}
                  alt={content.engraving.body}
                  assets={assets}
                  className="object-cover"
                />
              </div>

              <p className="relative z-20 break-words whitespace-pre-line text-center font-heading text-[18px] font-semibold leading-tight text-white md:absolute md:bottom-[17%] md:right-[8%] md:w-[37%] md:text-[clamp(18px,1.7vw,24px)]">
                “{labels.quoteText}”
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-[var(--mobile-section-space)] md:py-[clamp(129px,16.5vw,234px)]">
        <div className="mx-auto max-w-[900px] px-[var(--mobile-page-gutter)] md:px-container">
          <Reveal className="relative mx-auto min-h-[520px] w-full md:min-h-[clamp(680px,82vw,1120px)]">
            <div className="absolute right-[12%] top-0 aspect-[0.94/1] w-[34%] overflow-hidden bg-[#111] max-md:right-0 max-md:w-[43%]">
              <GolfImage
                filename={lifestyleImages[0] ?? content.lifestyle.imageLifestyle}
                alt={content.lifestyle.title}
                assets={assets}
                className="object-cover"
              />
            </div>
            <div className="absolute left-[4%] top-[25%] aspect-[0.82/1] w-[45%] overflow-hidden bg-[#111] max-md:left-0 max-md:top-[30%] max-md:w-[56%]">
              <GolfImage
                filename={lifestyleImages[1] ?? content.lifestyle.imageLifestyle}
                alt={content.lifestyle.body}
                assets={assets}
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-[12%] aspect-[0.94/1] w-[34%] overflow-hidden bg-[#111] max-md:right-0 max-md:w-[43%]">
              <GolfImage
                filename={lifestyleImages[2] ?? content.lifestyle.imageLifestyle}
                alt={content.lifestyle.closing}
                assets={assets}
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-[var(--mobile-section-space)] text-primary md:py-[clamp(108px,13.5vw,198px)]">
        <div className="mx-auto max-w-[1120px] space-y-[var(--mobile-section-space)] px-[var(--mobile-page-gutter)] md:space-y-[clamp(162px,21vw,288px)] md:px-container">
          <Reveal className="mx-auto grid aspect-[1.8/1] w-full place-items-center bg-[#d8d8d8]">
            <p className="font-body text-[16px] font-semibold tracking-[0.04em] text-primary/70 md:text-[18px]">
              {process.packageImageLabel}
            </p>
          </Reveal>

          <div className="space-y-8">
            <h2 className="text-center font-heading text-[clamp(20px,2vw,28px)] font-semibold">
              {process.title}
            </h2>
            <div className="mx-auto grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {process.steps.map((step) => (
                <Reveal key={step.id}>
                  <div className="grid place-items-center bg-[#202020] px-5 py-6 text-center text-white md:aspect-[1.2/1]">
                    <div className="space-y-2">
                      <p className="font-numeric text-[15px] font-semibold tracking-[0.08em]">
                        {step.id}
                      </p>
                      <h3 className="font-heading text-[clamp(15px,1.4vw,20px)] font-semibold leading-tight">
                        {step.title}
                      </h3>
                      {step.lines.length > 0 ? (
                        <div className="space-y-1 font-body text-[16px] leading-[1.35] text-white/52 md:text-[18px] md:leading-[1.25]">
                          {step.lines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-[var(--mobile-page-gutter)] pb-[calc(var(--mobile-section-space)+env(safe-area-inset-bottom))] pt-10 text-center text-primary md:px-container md:pb-[clamp(150px,18vw,260px)] md:pt-[clamp(60px,7vw,92px)]">
        <Link
          href={inquiryHref}
          className="link-sweep flex min-h-[52px] w-full items-center justify-center bg-white font-heading text-[21px] font-semibold md:inline-flex md:min-h-12 md:w-auto md:text-[clamp(21px,2vw,30px)]"
        >
          {labels.requestEstimate}
        </Link>
      </section>
    </main>
  );
}

function ChevronIcon({direction}: {direction: 'left' | 'right'}) {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'left' ? <path d="M15 5 8 12l7 7" /> : <path d="m9 5 7 7-7 7" />}
    </svg>
  );
}

function GolfImage({
  assets,
  alt,
  className,
  filename,
  priority = false
}: {
  assets: Record<string, boolean>;
  alt: string;
  className?: string;
  filename: string;
  priority?: boolean;
}) {
  if (!assets[filename]) {
    return (
      <div
        className="grid h-full min-h-44 w-full place-items-center break-all border border-hairline bg-bg p-5 text-center font-body text-xs font-semibold leading-5 tracking-[0.06em] text-subtext"
        role="img"
        aria-label={filename}
      >
        {filename}
      </div>
    );
  }

  return (
    <Image
      src={imageSrc(filename)}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes="(min-width: 1280px) 760px, (min-width: 768px) 60vw, 100vw"
      className={className}
    />
  );
}
