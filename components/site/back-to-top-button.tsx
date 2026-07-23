'use client';

import {useEffect, useState} from 'react';

export function BackToTopButton({label}: {label: string}) {
  const [isVisible, setIsVisible] = useState(false);

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
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onClick={scrollToTop}
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] grid h-12 w-12 place-items-center rounded-full border border-primary/20 bg-white/95 text-primary shadow-[0_12px_32px_rgba(16,29,48,0.16)] backdrop-blur transition duration-hover ease-brand hover:-translate-y-1 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:bottom-8 md:right-8 ${
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
