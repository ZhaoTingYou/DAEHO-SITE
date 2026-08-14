'use client';

import {useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';

export function BackToTopButton({label}: {label: string}) {
  const [isVisible, setIsVisible] = useState(false);
  const lastPointerTriggerAt = useRef(0);
  const scrollAnimationFrame = useRef(0);

  useEffect(() => {
    let frame = 0;

    const updateVisibility = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsVisible(window.scrollY > Math.max(480, window.innerHeight * 0.66));
      });
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, {passive: true});
    window.addEventListener('resize', updateVisibility);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollAnimationFrame.current);
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    cancelAnimationFrame(scrollAnimationFrame.current);

    const startY = window.scrollY;
    if (startY <= 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0);
      return;
    }

    const startedAt = performance.now();
    const duration = Math.min(900, Math.max(400, startY * 0.35));

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, Math.round(startY * (1 - easedProgress)));

      if (progress < 1) {
        scrollAnimationFrame.current = requestAnimationFrame(animate);
      } else {
        window.scrollTo(0, 0);
      }
    };

    scrollAnimationFrame.current = requestAnimationFrame(animate);
  };

  const triggerScrollToTop = () => {
    const now = Date.now();
    if (now - lastPointerTriggerAt.current < 250) return;

    lastPointerTriggerAt.current = now;
    scrollToTop();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;

    triggerScrollToTop();
  };

  const handleTouchStart = () => {
    triggerScrollToTop();
  };

  const handleClick = () => {
    if (Date.now() - lastPointerTriggerAt.current > 500) triggerScrollToTop();
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      className={`relative grid h-12 w-12 touch-none select-none place-items-center rounded-full border border-primary/20 bg-white/95 text-primary shadow-[0_12px_32px_rgba(16,29,48,0.16)] backdrop-blur transition duration-hover ease-brand hover:-translate-y-1 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <span aria-hidden="true" className="font-body text-[24px] font-normal leading-none">
        ↑
      </span>
    </button>
  );
}
