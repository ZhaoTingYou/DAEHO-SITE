'use client';

import Image from 'next/image';
import {useRef} from 'react';
import {motion, useScroll, useTransform, type MotionValue} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

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
      <div className="mx-auto max-w-[1180px] px-container py-[clamp(48px,6vw,96px)]">
        <div className="space-y-[clamp(96px,13vw,200px)]">
          {steps.map((step, index) => (
            <ProcessChapter key={step.number} step={step} reversed={index % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessChapter({step, reversed}: {step: SpecialtyProcessStep; reversed: boolean}) {
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
      className="grid items-center gap-[clamp(32px,4vw,72px)] lg:grid-cols-2"
    >
      <div className={reversed ? 'lg:order-2' : ''}>
        <ProcessMedia step={step} parallax={parallax} />
      </div>

      <motion.div
        className={`max-w-md ${reversed ? 'lg:order-1 lg:justify-self-end' : ''}`}
        style={{opacity: textOpacity, y: textY}}
      >
        <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-accent">
          {step.number} / {step.label}
        </p>
        <h2 className="mt-5 font-heading text-[clamp(22px,2.4vw,32px)] font-semibold leading-[1.22] text-primary">
          {step.title}
        </h2>
        <p className="mt-6 font-body text-[14px] leading-[1.9] text-text">{step.body}</p>
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
        className="flex aspect-[4/3] w-full items-center justify-center break-all bg-bg p-5 text-center font-body text-xs font-medium leading-5 tracking-[0.04em] text-subtext"
        role="img"
        aria-label={step.image}
      >
        {step.image}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg">
      <motion.div className="absolute inset-0 will-change-transform" style={{y: parallax, scale: 1.14}}>
        <Image
          src={`/images/${step.image}`}
          alt={`${step.number} ${step.title}`}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}
