'use client';

import Lenis from 'lenis';
import {usePathname} from 'next/navigation';
import {useEffect, useRef, type ReactNode} from 'react';

import {usePrefersReducedMotion} from './reduced-motion-provider';

export function LenisProvider({children}: {children: ReactNode}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: 'auto'});
    lenisRef.current?.scrollTo(0, {immediate: true, force: true});
  }, [pathname]);

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
    lenisRef.current = lenis;

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
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  return children;
}
