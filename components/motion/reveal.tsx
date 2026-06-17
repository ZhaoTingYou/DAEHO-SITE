'use client';

import {motion, type HTMLMotionProps, type Variants} from 'framer-motion';

import {usePrefersReducedMotion} from './reduced-motion-provider';

const revealVariants: Variants = {
  hidden: {opacity: 0, y: 28},
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const instantVariants: Variants = {
  hidden: {opacity: 0, y: 0},
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      staggerChildren: 0
    }
  }
};

type RevealProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
};

export function Reveal({children, className, ...props}: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial={false}
      whileInView="visible"
      viewport={{once: true, amount: 0.2}}
      variants={prefersReducedMotion ? instantVariants : revealVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({children, className, ...props}: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? instantVariants : revealVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
