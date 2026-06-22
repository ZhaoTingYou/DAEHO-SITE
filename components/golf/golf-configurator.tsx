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

export function GolfConfigurator({assets, content, locale}: GolfConfiguratorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedHeadId, setSelectedHeadId] = useState(content.heads.items[0]?.id ?? '');
  const [selectedShaftId, setSelectedShaftId] = useState(content.shafts.items[0]?.id ?? '');

  const selectedHead = useMemo(
    () => content.heads.items.find((item) => item.id === selectedHeadId) ?? content.heads.items[0],
    [content.heads.items, selectedHeadId]
  );
  const selectedShaft = useMemo(
    () =>
      content.shafts.items.find((item) => item.id === selectedShaftId) ??
      content.shafts.items[0],
    [content.shafts.items, selectedShaftId]
  );
  const selectedShaftIndex = Math.max(
    0,
    content.shafts.items.findIndex((item) => item.id === selectedShaft?.id)
  );
  const engravingSample = 'JUDY KIM 2026.05.03';
  const inquiryHref = `/${locale}/golf/inquiry?head=${selectedHead?.id ?? ''}&shaft=${selectedShaft?.id ?? ''}&engraving=${encodeURIComponent(engravingSample)}`;
  const labels = content.labels;
  const process = content.process;
  const styleOptions = labels.styleOptions?.length ? labels.styleOptions : ['BASIC', 'COLOUR'];
  const engravingTitleLines =
    locale === 'ko' ? [content.engraving.eyebrow, content.engraving.body] : [content.engraving.title];
  const engravingDetail = locale === 'ko' ? content.engraving.title : content.engraving.body;
  const changeShaft = (direction: 1 | -1) => {
    const items = content.shafts.items;

    if (items.length === 0) {
      return;
    }

    const nextIndex = (selectedShaftIndex + direction + items.length) % items.length;
    setSelectedShaftId(items[nextIndex].id);
  };

  return (
    <main className="bg-white text-[#f8f6f2]">
      <section className="relative overflow-hidden bg-black pt-28">
        <div className="mx-auto max-w-[1240px] px-container pb-[clamp(62px,8vw,110px)]">
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
              onClick={() => changeShaft(-1)}
              className="absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={labels.previousShaft}
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => changeShaft(1)}
              className="absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={labels.nextShaft}
            >
              <ChevronIcon direction="right" />
            </button>

            <motion.div
              key={selectedShaft?.id ?? 'hero'}
              initial={false}
              animate={{opacity: 1, y: 0}}
              transition={{duration: prefersReducedMotion ? 0 : 0.56, ease: [0.16, 1, 0.3, 1]}}
              className="absolute left-1/2 top-0 h-full w-[min(82vw,920px)] -translate-x-1/2"
            >
              <GolfStaticImage
                src="/images/golf/golf1.png"
                alt={content.hero.subtitle}
                className="object-contain"
                priority
              />
            </motion.div>
          </div>

          <div className="relative left-1/2 mt-[clamp(42px,5vw,72px)] min-h-[clamp(520px,35vw,680px)] w-screen -translate-x-1/2 overflow-hidden bg-black">
            <Reveal className="relative z-10 flex min-h-[clamp(520px,35vw,680px)] max-w-[520px] flex-col justify-center space-y-5 px-container pb-[clamp(210px,62vw,340px)] pt-16 md:py-20 lg:ml-[clamp(84px,12.5vw,240px)] lg:px-0">
              <h1 className="font-heading text-[clamp(64px,6.4vw,112px)] font-semibold uppercase leading-[0.82] text-white">
                {content.hero.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="max-w-[380px] font-body text-[15px] font-medium leading-[1.35] text-white/58">
                {content.hero.subtitle}
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

      <section className="bg-black pb-[clamp(72px,9vw,132px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(46px,6vw,72px)] px-container">
          <Reveal className="mx-auto max-w-[360px] space-y-3 text-center">
            <h2 className="font-heading text-[clamp(20px,2vw,27px)] font-semibold leading-tight text-white">
              {content.heads.title}
            </h2>
            <p className="font-body text-[18px] leading-[1.3] text-white/55">
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
                  className={`group min-h-11 bg-white p-2 text-left transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                    isSelected ? 'ring-2 ring-white/80' : 'hover:-translate-y-1'
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <GolfImage
                      filename={item.image}
                      alt={item.caption}
                      assets={assets}
                      className="object-cover"
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
              <p className="font-heading text-[clamp(18px,2vw,26px)] font-semibold text-white">
                {labels.braceletTitle}
              </p>
              <p className="font-body text-[18px] leading-[1.3] text-white/42">
                {labels.braceletBody}
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {styleOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="relative aspect-[1.15/1] min-h-11 bg-[#d8d8d8] text-primary transition duration-hover ease-brand hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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

      <section className="bg-white pb-0 pt-[clamp(72px,9vw,132px)] text-primary">
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

          <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
            <Reveal className="relative mx-auto grid max-w-[900px] gap-8 px-container py-[clamp(90px,11vw,150px)] md:min-h-[clamp(900px,76vw,1180px)]">
              <div className="relative z-20 space-y-[12px] text-left md:absolute md:left-[8%] md:top-[39%] md:w-[28%]">
                <h2
                  className={`text-[clamp(22px,2vw,28px)] font-semibold leading-[1.32] text-white ${
                    locale === 'ko'
                      ? "[font-family:'MaruBuri',serif]"
                      : "[font-family:'Cormorant_Garamond',serif]"
                  }`}
                >
                  {engravingTitleLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="font-body text-[15px] leading-[1.45] text-white/78">
                  {engravingDetail}
                </p>
              </div>

              <div className="relative aspect-[0.74/1] w-full overflow-hidden bg-[#f2f0ec] md:absolute md:right-[7%] md:top-[17%] md:w-[44%]">
                <GolfImage
                  filename={content.engraving.imagePrimary}
                  alt={content.engraving.title}
                  assets={assets}
                  className="object-cover"
                />
              </div>

              <div className="relative aspect-[1.36/1] w-full overflow-hidden bg-[#f2f0ec] md:absolute md:bottom-[11%] md:left-[4%] md:w-[48%]">
                <GolfStaticImage
                  src={`/images/${content.engraving.imageDetail}`}
                  alt={content.engraving.body}
                  className="object-cover"
                />
              </div>

              <p className="relative z-20 whitespace-nowrap text-center font-heading text-[clamp(20px,1.8vw,28px)] font-semibold leading-tight text-white md:absolute md:bottom-[22%] md:right-[7%] md:w-[39%]">
                “{labels.quoteText}”
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-black py-[clamp(72px,9vw,132px)]">
        <div className="mx-auto max-w-[1120px] px-container">
          <Reveal className="mx-auto w-full max-w-[1040px]">
            <div className="relative ml-auto aspect-[1.34/1] w-full overflow-hidden md:w-[68%]">
              <GolfStaticImage
                src={`/images/${content.lifestyle.imageBox}`}
                alt={content.lifestyle.body}
                className="object-cover"
              />
            </div>
            <div className="relative mt-[clamp(22px,3.5vw,48px)] aspect-[1.44/1] w-full overflow-hidden md:ml-[8%] md:w-[58%]">
              <GolfStaticImage
                src={`/images/${content.lifestyle.imageLifestyle}`}
                alt={content.lifestyle.closing}
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-[clamp(72px,9vw,132px)] text-primary">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(54px,7vw,96px)] px-container">
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

      <section className="bg-white px-container pb-[clamp(150px,18vw,260px)] pt-[clamp(60px,7vw,92px)] text-center text-primary">
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
