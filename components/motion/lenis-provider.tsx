'use client';

import Lenis from 'lenis';
import {useEffect, type ReactNode} from 'react';

import {usePrefersReducedMotion} from './reduced-motion-provider';

export function LenisProvider({children}: {children: ReactNode}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (prefersReducedMotion || isTouch) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      touchMultiplier: 1,
      prevent: (node) => node instanceof Element && Boolean(node.closest('[data-lenis-prevent]'))
    });

    let frame = 0;
    const stopLenis = () => lenis.stop();
    const startLenis = () => lenis.start();

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);
    window.addEventListener('daeho:lenis-stop', stopLenis);
    window.addEventListener('daeho:lenis-start', startLenis);

    return () => {
      window.removeEventListener('daeho:lenis-stop', stopLenis);
      window.removeEventListener('daeho:lenis-start', startLenis);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return children;
}
