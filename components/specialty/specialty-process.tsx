'use client';

import Image from 'next/image';
import {useRef} from 'react';
import {motion, useScroll, useTransform, type MotionValue} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {imageSrc} from '@/lib/image-src';

export type SpecialtyProcessStep = {
  number: string;
  label: string;
  title: string;
  body: string;
  image: string;
  hasImage: boolean;
};

type SpecialtyProcessProps = {
  steps: SpecialtyProcessStep[];
};

export function SpecialtyProcess({steps}: SpecialtyProcessProps) {
  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-[1120px] px-container py-[clamp(48px,6vw,86px)]">
        <div className="space-y-[clamp(34px,5vw,66px)]">
          {steps.map((step) => (
            <ProcessChapter key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessChapter({step}: {step: SpecialtyProcessStep}) {
  const ref = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });
  const parallax = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [38, -38]);
  const textOpacity = useTransform(scrollYProgress, [0.12, 0.4], prefersReducedMotion ? [1, 1] : [0, 1]);
  const textY = useTransform(scrollYProgress, [0.12, 0.4], prefersReducedMotion ? [0, 0] : [48, 0]);

  return (
    <section
      ref={ref}
      aria-label={`${step.number} ${step.title}`}
      className="grid items-center gap-[clamp(28px,4vw,62px)] border-t border-primary/18 pt-[clamp(34px,4.5vw,58px)] lg:grid-cols-[minmax(0,0.53fr)_minmax(280px,0.47fr)]"
    >
      <div>
        <ProcessMedia step={step} parallax={parallax} />
      </div>

      <motion.div
        className="max-w-[430px]"
        style={{opacity: textOpacity, y: textY}}
      >
        <p className="font-body text-[15px] font-semibold uppercase leading-none tracking-[0.24em] text-accent">
          {step.number} / {step.label}
        </p>
        <h2 className="mt-[18px] font-heading text-[clamp(28px,2.7vw,38px)] font-semibold leading-[1.24] text-primary">
          {step.title.split('\n').map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p className="mt-[22px] font-body text-[15px] leading-[1.9] text-text">{step.body}</p>
      </motion.div>
    </section>
  );
}

function ProcessMedia({
  step,
  parallax
}: {
  step: SpecialtyProcessStep;
  parallax: MotionValue<number>;
}) {
  if (!step.hasImage) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center break-all border border-primary/12 bg-bg p-5 text-center font-body text-[15px] font-medium leading-5 tracking-[0.04em] text-subtext"
        role="img"
        aria-label={step.image}
      >
        {step.image}
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden border border-primary/10 bg-bg">
      <motion.div className="absolute inset-0 will-change-transform" style={{y: parallax, scale: 1.14}}>
        <Image
          src={imageSrc(step.image)}
          alt={`${step.number} ${step.title}`}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}
