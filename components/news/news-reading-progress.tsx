'use client';

import {motion, useScroll, useSpring} from 'framer-motion';

export function NewsReadingProgress() {
  const {scrollYProgress} = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 32,
    restDelta: 0.001
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-[calc(var(--mobile-header-height)+env(safe-area-inset-top))] z-[80] h-[2px] origin-left bg-accent md:top-0"
      style={{scaleX}}
    />
  );
}
