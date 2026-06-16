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
  };
};

type GolfConfiguratorProps = {
  assets: Record<string, boolean>;
  content: GolfConfiguratorContent;
  locale: Locale;
};

const golfShaftVisuals: Record<string, string> = {
  black: '/images/golf_shaft_black.png',
  white: '/images/golf_shaft_white.png',
  burgundy: '/images/golf_shaft_burgundy.png',
  navy: '/images/golf_shaft_navy.png'
};

const golfProcessSteps = [
  {id: '01', ko: '헤드 선택', en: 'Choose head', lines: ['아이언', '퍼터', '우드']},
  {id: '02', ko: '컬러 선택', en: 'Choose color', lines: ['블랙', '화이트', '네이비']},
  {id: '03', ko: '샤프트 색상 선택', en: 'Select shaft', lines: ['블랙', '화이트', '버건디', '네이비']},
  {id: '04', ko: '개인 문구 각인 선택', en: 'Engraving', lines: ['이름', '날짜']},
  {id: '05', ko: '상담 문의', en: 'Inquiry', lines: ['수량', '일정']},
  {id: '06', ko: '제작 진행', en: 'Production', lines: ['시안 확인', '제작 완료']}
];

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
  const requestLabel = locale === 'ko' ? '견적 문의하러 가기' : 'Request an estimate';
  const quoteText = locale === 'ko' ? '순간을 영원히 기억하세요.' : 'Remember the moment, permanently.';
  const changeShaft = (direction: 1 | -1) => {
    const items = content.shafts.items;

    if (items.length === 0) {
      return;
    }

    const nextIndex = (selectedShaftIndex + direction + items.length) % items.length;
    setSelectedShaftId(items[nextIndex].id);
  };

  return (
    <main className="bg-black text-[#f8f6f2]">
      <section className="relative overflow-hidden bg-black pt-28">
        <div className="mx-auto max-w-[1240px] px-container pb-[clamp(62px,8vw,110px)]">
          <motion.p
            initial={{opacity: 0, y: prefersReducedMotion ? 0 : 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: prefersReducedMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1]}}
            className="text-center font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-white/72"
          >
            {content.hero.eyebrow}
          </motion.p>

          <div className="relative mt-[clamp(30px,4vw,58px)] min-h-[clamp(300px,48vw,610px)]">
            <button
              type="button"
              onClick={() => changeShaft(-1)}
              className="absolute left-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label="Previous shaft color"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => changeShaft(1)}
              className="absolute right-0 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/62 transition duration-hover ease-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label="Next shaft color"
            >
              <ChevronIcon direction="right" />
            </button>

            <motion.div
              key={selectedShaft?.id ?? 'hero'}
              initial={{opacity: 0, y: prefersReducedMotion ? 0 : 18}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: prefersReducedMotion ? 0 : 0.56, ease: [0.16, 1, 0.3, 1]}}
              className="absolute left-1/2 top-0 h-full w-[min(82vw,920px)] -translate-x-1/2"
            >
              <GolfStaticImage
                src="/images/golf/golf-night-hero-product.jpg"
                alt={content.hero.subtitle}
                className="object-contain"
                priority
              />
            </motion.div>
          </div>

          <div className="mt-[clamp(42px,5vw,72px)] grid items-end gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal className="max-w-[390px] space-y-4">
              <h1 className="font-heading text-[clamp(48px,7vw,80px)] font-semibold uppercase leading-[0.82] text-white">
                {content.hero.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="max-w-[260px] font-body text-[13px] font-semibold leading-6 text-white/76">
                {content.hero.subtitle}
              </p>
            </Reveal>

            <Reveal className="relative min-h-[210px] overflow-hidden lg:min-h-[270px]">
              <div className="absolute inset-y-0 right-[-12%] w-[92%]">
                <GolfStaticImage
                  src="/images/golf/golf-day-statement-product.jpg"
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
            <p className="font-body text-[12px] leading-5 text-white/55">
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
                  <div className="relative aspect-square overflow-hidden bg-[#f8f6f2]">
                    <GolfImage
                      filename={item.image}
                      alt={item.caption}
                      assets={assets}
                      className="object-cover"
                    />
                  </div>
                  <p className="px-1 pt-3 font-body text-[10px] font-semibold uppercase tracking-[0.08em] text-primary/70">
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid items-center gap-8 pt-[clamp(26px,5vw,58px)] md:grid-cols-[0.75fr_1.25fr]">
            <Reveal className="space-y-2">
              <p className="font-heading text-[clamp(18px,2vw,26px)] font-semibold text-white">
                {locale === 'ko' ? '나만의 방식 선택하기' : 'Choose your own direction'}
              </p>
              <p className="font-body text-[11px] leading-5 text-white/42">
                {content.labels.selectedHead}: {selectedHead?.label}
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {['BASIC', 'COLOUR'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="relative aspect-[1.15/1] min-h-11 bg-[#d8d8d8] text-primary transition duration-hover ease-brand hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <span className="absolute bottom-3 right-3 font-body text-[10px] font-semibold uppercase tracking-[0.1em]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-[clamp(72px,9vw,132px)] text-primary">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(70px,8vw,118px)] px-container">
          <div className="mx-auto max-w-[900px] space-y-[clamp(34px,4vw,44px)]">
            <Reveal className="text-center">
              <h2 className="font-body text-[clamp(18px,1.8vw,24px)] font-semibold tracking-[0.02em]">
                {locale === 'ko' ? '샤프트 색상' : 'Shaft Color'}
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
                      src={golfShaftVisuals[item.id] ?? golfShaftVisuals.navy}
                      alt={item.caption}
                      className="scale-[1.55] object-cover object-[50%_25%] mix-blend-multiply"
                    />
                  </div>
                  <figcaption className="mt-6 font-heading text-[14px] font-semibold uppercase [letter-spacing:0] text-primary">
                    {item.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="grid items-center gap-[clamp(34px,5vw,70px)] pt-[clamp(22px,4vw,42px)] lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal className="space-y-7">
              <p className="font-body text-[12px] font-semibold text-primary/52">
                {content.engraving.eyebrow}
              </p>
              <div className="space-y-3">
                <h2 className="font-heading text-[clamp(24px,3.4vw,38px)] font-semibold leading-tight">
                  {content.engraving.title}
                </h2>
                <p className="font-body text-[13px] leading-7 text-text">
                  {content.engraving.body}
                </p>
              </div>
              <div className="relative aspect-[1.45/1] w-full max-w-[480px] overflow-hidden bg-[#f2f0ec]">
                <GolfStaticImage
                  src="/images/golf/golf-day-crafted-engraving.jpg"
                  alt={content.engraving.body}
                  className="object-cover"
                />
              </div>
            </Reveal>

            <Reveal className="space-y-8">
              <div className="relative aspect-[3/4] w-full max-w-[430px] overflow-hidden bg-[#f2f0ec] lg:ml-auto">
                <GolfImage
                  filename={content.engraving.imagePrimary}
                  alt={content.engraving.title}
                  assets={assets}
                  className="object-cover"
                />
              </div>
              <p className="max-w-[360px] font-heading text-[clamp(20px,2.4vw,30px)] font-semibold leading-tight text-primary lg:ml-auto">
                “{quoteText}”
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-black py-[clamp(72px,9vw,132px)]">
        <div className="mx-auto max-w-[1120px] px-container">
          <Reveal className="relative mx-auto aspect-[1.54/1] w-full max-w-[920px] overflow-hidden">
            <GolfStaticImage
              src="/images/golf/golf-night-statement.jpg"
              alt={content.lifestyle.body}
              className="object-cover"
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-[clamp(72px,9vw,132px)] text-primary">
        <div className="mx-auto max-w-[1120px] space-y-[clamp(54px,7vw,96px)] px-container">
          <Reveal className="mx-auto grid aspect-[1.8/1] w-full max-w-[860px] place-items-center bg-[#d8d8d8]">
            <p className="font-body text-[12px] font-semibold tracking-[0.08em] text-primary/70">
              {locale === 'ko' ? '패키지 사진' : 'Package image'}
            </p>
          </Reveal>

          <div className="space-y-8">
            <h2 className="text-center font-heading text-[clamp(20px,2vw,28px)] font-semibold">
              {locale === 'ko' ? '주문 방법' : 'Order process'}
            </h2>
            <div className="mx-auto grid max-w-[760px] grid-cols-2 gap-4 md:grid-cols-3">
              {golfProcessSteps.map((step) => (
                <Reveal key={step.id}>
                  <div className="grid aspect-[1.2/1] place-items-center bg-[#202020] px-5 py-6 text-center text-white">
                    <div className="space-y-2">
                      <p className="font-numeric text-[15px] font-semibold tracking-[0.08em]">
                        {step.id}
                      </p>
                      <h3 className="font-heading text-[clamp(15px,1.4vw,20px)] font-semibold leading-tight">
                        {locale === 'ko' ? step.ko : step.en}
                      </h3>
                      <p className="font-body text-[10px] leading-4 text-white/52">
                        {step.lines.join(' · ')}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8F6F2] px-container py-[clamp(60px,7vw,92px)] text-center text-primary">
        <Link
          href={inquiryHref}
          className="link-sweep inline-flex min-h-12 items-center font-heading text-[clamp(21px,2vw,30px)] font-semibold"
        >
          {requestLabel}
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
      priority={priority}
      sizes="(min-width: 1280px) 760px, (min-width: 768px) 60vw, 100vw"
      className={className}
    />
  );
}
