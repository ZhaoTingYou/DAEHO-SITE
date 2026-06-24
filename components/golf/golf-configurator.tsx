'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';

type GolfImageRef = {
  image: string;
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
    requestEstimate: string;
    quoteText: string;
    braceletTitle: string;
    braceletBody: string;
    shaftTitle: string;
    previousShaft: string;
    nextShaft: string;
    styleOptions: string[];
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
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  const selectedHead = useMemo(
    () => content.heads.items.find((item) => item.id === selectedHeadId) ?? content.heads.items[0],
    [content.heads.items, selectedHeadId]
  );
  const selectedShaft = content.shafts.items[0];
  const heroSlides = useMemo(
    () => [
      {
        src: '/images/golf/golf1.png',
        alt: content.hero.subtitle,
        imageClass: 'object-contain object-center origin-center scale-[1.12]'
      },
      {
        src: '/images/golf/\u1111\u1165\u1110\u1165.png',
        alt: 'Putter golf bracelet',
        imageClass: 'object-contain object-center origin-center scale-[0.88]'
      },
      {
        src: '/images/golf/\u1103\u1173\u1105\u1161\u110b\u1175\u1107\u1165.png',
        alt: 'Driver golf bracelet',
        imageClass: 'object-contain object-center origin-center scale-[0.92]'
      }
    ],
    [content.hero.subtitle]
  );
  const activeHeroSlide = heroSlides[heroSlideIndex] ?? heroSlides[0];
  const engravingSample = 'JUDY KIM 2026.05.03';
  const inquiryHref = `/${locale}/golf/inquiry?head=${selectedHead?.id ?? ''}&shaft=${selectedShaft?.id ?? ''}&engraving=${encodeURIComponent(engravingSample)}`;
  const labels = content.labels;
  const process = content.process;
  const styleOptions = labels.styleOptions?.length ? labels.styleOptions : ['BASIC', 'COLOUR'];
  const engravingLeadLines =
    locale === 'ko'
      ? [content.engraving.eyebrow, content.engraving.body]
      : [content.engraving.eyebrow, content.engraving.title];
  const engravingRecordLine = locale === 'ko' ? content.engraving.title : content.engraving.body;
  const heroSubtitleLines =
    locale === 'ko'
      ? ['골프이 구조를', '하나의 오브젝트로 재해석하다']
      : content.hero.subtitle.split('\n');
  const changeHeroSlide = (direction: 1 | -1) => {
    setHeroSlideIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  return (
    <main className="bg-white text-[#f8f6f2]">
      <section className="relative overflow-hidden bg-black pt-28">
        <div className="mx-auto max-w-[1240px] px-container pb-0">
          <motion.p
            initial={false}
            animate={{opacity: 1, y: 0}}
            transition={{duration: prefersReducedMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1]}}
            className="text-center [font-family:'Cormorant_Garamond',serif] text-[18px] font-bold uppercase tracking-[0.08em] text-white/72"
          >
            {content.hero.eyebrow}
          </motion.p>

          <div className="relative mt-[clamp(30px,4vw,58px)] min-h-[clamp(300px,48vw,610px)]">
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
              key={activeHeroSlide.src}
              initial={{opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: prefersReducedMotion ? 0 : 0.56, ease: [0.16, 1, 0.3, 1]}}
              className="absolute left-1/2 top-0 h-full w-[min(82vw,920px)] -translate-x-1/2"
            >
              <GolfStaticImage
                src={activeHeroSlide.src}
                alt={activeHeroSlide.alt}
                className={activeHeroSlide.imageClass}
                priority={heroSlideIndex === 0}
              />
            </motion.div>
          </div>

          <div className="relative left-1/2 mt-[clamp(42px,5vw,72px)] min-h-[clamp(520px,35vw,680px)] w-screen -translate-x-1/2 overflow-hidden bg-white">
            <Reveal className="relative z-10 flex min-h-[clamp(520px,35vw,680px)] max-w-[520px] flex-col justify-center space-y-5 px-container pb-[clamp(210px,62vw,340px)] pt-16 md:py-20 lg:ml-[clamp(84px,12.5vw,240px)] lg:px-0">
              <h1 className="font-heading text-[clamp(64px,6.4vw,112px)] font-semibold uppercase leading-[0.82] text-primary">
                {content.hero.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="max-w-[380px] font-body text-[15px] font-medium leading-[1.35] text-primary/60">
                {heroSubtitleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </Reveal>

            <Reveal className="pointer-events-none absolute bottom-[clamp(22px,7vw,56px)] right-[-34vw] h-[clamp(220px,60vw,360px)] w-[clamp(430px,120vw,700px)] overflow-hidden sm:right-[-18vw] md:bottom-auto md:right-0 md:top-1/2 md:h-[clamp(360px,33vw,650px)] md:w-[clamp(620px,56vw,1080px)] md:-translate-y-1/2">
              <div className="absolute inset-0">
                <GolfStaticImage
                  src={`/images/${content.statement.image}`}
                  alt={content.statement.body}
                  className="object-contain object-right"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white pb-[clamp(108px,13.5vw,198px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(46px,6vw,72px)] px-container">
          <Reveal className="mx-auto max-w-[360px] space-y-3 text-center">
            <h2 className="font-heading text-[clamp(20px,2vw,27px)] font-semibold leading-tight text-primary">
              {content.heads.title}
            </h2>
            <p className="font-body text-[18px] leading-[1.3] text-primary/60">
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
                  className="group min-h-11 bg-white p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <GolfImage
                      filename={item.image}
                      alt={item.caption}
                      assets={assets}
                      className={`object-cover ${golfHeadVisuals[item.id] ?? ''}`}
                    />
                  </div>
                  <p className="px-1 pt-3 font-body text-[18px] font-semibold uppercase tracking-[0.02em] text-primary/70">
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid items-center gap-8 pt-[clamp(26px,5vw,58px)] md:grid-cols-[0.75fr_1.25fr]">
            <Reveal className="space-y-2">
              <p className="font-heading text-[clamp(18px,2vw,26px)] font-semibold text-primary">
                {labels.braceletTitle}
              </p>
              <p className="font-body text-[18px] leading-[1.3] text-primary/55">
                {labels.braceletBody}
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {styleOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="relative aspect-[1.15/1] min-h-11 bg-[#d8d8d8] text-primary transition duration-hover ease-brand hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <span className="absolute bottom-3 right-3 font-body text-[18px] font-semibold uppercase tracking-[0.02em]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-0 pt-[clamp(108px,13.5vw,198px)] text-primary">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(70px,8vw,118px)] px-container">
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
                    <GolfStaticImage
                      src="/images/golf/Mask group.png"
                      alt={item.caption}
                      className={`scale-[1.35] object-cover ${golfShaftVisuals[item.id] ?? golfShaftVisuals.navy} mix-blend-multiply`}
                    />
                  </div>
                  <figcaption className="mt-6 font-heading text-[18px] font-semibold uppercase [letter-spacing:0] text-primary">
                    {item.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black pb-[clamp(129px,15vw,240px)]">
            <Reveal className="relative mx-auto grid max-w-[980px] gap-10 px-container py-[clamp(82px,11vw,150px)] md:min-h-[clamp(1080px,82vw,1400px)]">
              <p className="relative z-20 text-center font-heading text-[clamp(18px,1.7vw,24px)] font-semibold leading-tight text-white md:absolute md:left-1/2 md:top-[8%] md:-translate-x-1/2">
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
                    <span key={line} className="block whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="whitespace-nowrap font-body text-[clamp(14px,1.35vw,20px)] leading-[1.35] text-white/82">
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
                <GolfStaticImage
                  src={`/images/${content.engraving.imageDetail}`}
                  alt={content.engraving.body}
                  className="object-cover"
                />
              </div>

              <p className="relative z-20 whitespace-nowrap text-center font-heading text-[clamp(18px,1.7vw,24px)] font-semibold leading-tight text-white md:absolute md:bottom-[17%] md:right-[8%] md:w-[37%]">
                “{labels.quoteText}”
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-[clamp(129px,16.5vw,234px)]">
        <div className="mx-auto max-w-[900px] px-container">
          <Reveal className="relative mx-auto min-h-[clamp(680px,82vw,1120px)] w-full">
            <div className="absolute right-[12%] top-0 aspect-[0.94/1] w-[34%] overflow-hidden bg-[#111] max-md:right-0 max-md:w-[43%]">
              <GolfStaticImage
                src={`/images/${content.lifestyle.imageLifestyle}`}
                alt={content.lifestyle.closing}
                className="object-cover"
              />
            </div>
            <div className="absolute left-[4%] top-[25%] aspect-[0.82/1] w-[45%] overflow-hidden bg-[#111] max-md:left-0 max-md:top-[30%] max-md:w-[56%]">
              <GolfStaticImage
                src={`/images/${content.lifestyle.imageLifestyle}`}
                alt={content.lifestyle.body}
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-[12%] aspect-[0.94/1] w-[34%] overflow-hidden bg-[#111] max-md:right-0 max-md:w-[43%]">
              <GolfStaticImage
                src={`/images/${content.lifestyle.imageLifestyle}`}
                alt={content.lifestyle.closing}
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-[clamp(108px,13.5vw,198px)] text-primary">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(162px,21vw,288px)] px-container">
          <Reveal className="mx-auto grid aspect-[1.8/1] w-full place-items-center bg-[#d8d8d8]">
            <p className="font-body text-[18px] font-semibold tracking-[0.04em] text-primary/70">
              {process.packageImageLabel}
            </p>
          </Reveal>

          <div className="space-y-8">
            <h2 className="text-center font-heading text-[clamp(20px,2vw,28px)] font-semibold">
              {process.title}
            </h2>
            <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-3">
              {process.steps.map((step) => (
                <Reveal key={step.id}>
                  <div className="grid aspect-[1.2/1] place-items-center bg-[#202020] px-5 py-6 text-center text-white">
                    <div className="space-y-2">
                      <p className="font-numeric text-[15px] font-semibold tracking-[0.08em]">
                        {step.id}
                      </p>
                      <h3 className="font-heading text-[clamp(15px,1.4vw,20px)] font-semibold leading-tight">
                        {step.title}
                      </h3>
                      {step.lines.length > 0 ? (
                        <div className="space-y-1 font-body text-[18px] leading-[1.25] text-white/52">
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

      <section className="bg-white px-container pb-[clamp(225px,27vw,390px)] pt-[clamp(90px,10.5vw,138px)] text-center text-primary">
        <Link
          href={inquiryHref}
          className="link-sweep inline-flex min-h-12 items-center bg-white font-heading text-[clamp(21px,2vw,30px)] font-semibold"
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

function GolfStaticImage({
  alt,
  className,
  priority = false,
  src
}: {
  alt: string;
  className?: string;
  priority?: boolean;
  src: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes="(min-width: 1280px) 920px, (min-width: 768px) 72vw, 100vw"
      className={className}
    />
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
      src={`/images/${filename}`}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes="(min-width: 1280px) 760px, (min-width: 768px) 60vw, 100vw"
      className={className}
    />
  );
}
