'use client';

import Link from 'next/link';
import {useState} from 'react';

import {ResponsiveCmsImage} from '@/components/responsive-cms-image';
import type {ChronicleHorizontalSlide} from './chronicle-horizontal';

type ChronicleMobileProps = {
  slides: ChronicleHorizontalSlide[];
  yearNavAriaLabel: string;
  endNav: {
    label: string;
    title: string;
    href: string;
  };
};

export function ChronicleMobile({slides, yearNavAriaLabel, endNav}: ChronicleMobileProps) {
  return (
    <main className="mobile-page-shell bg-bg pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+24px)]">
      <nav
        aria-label={yearNavAriaLabel}
        className="sticky top-[calc(var(--mobile-header-height)+env(safe-area-inset-top))] z-20 flex gap-5 overflow-x-auto border-y border-primary/15 bg-bg/95 px-[var(--mobile-page-gutter)] py-4 backdrop-blur"
      >
        {slides.map((slide, index) => {
          const anchorId = `archive-year-${index}`;

          return (
            <a key={anchorId} href={`#${anchorId}`} className="mobile-tap-target shrink-0">
              {slide.year}
            </a>
          );
        })}
      </nav>
      <ol className="space-y-20 px-[var(--mobile-page-gutter)] py-16">
        {slides.map((slide, index) => {
          const Heading = index === 0 ? 'h1' : 'h2';
          const anchorId = `archive-year-${index}`;

          return (
            <li id={anchorId} key={anchorId} className="scroll-mt-32 border-t border-primary/15 pt-8">
              <p className="font-numeric text-[18px] text-accent">{slide.year}</p>
              <div className="relative mt-5 aspect-[4/3] overflow-hidden bg-muted">
                <ChronicleMobileSlideImage
                  key={`${slide.image}-${slide.fallbackImage}`}
                  image={slide.image}
                  mobileImage={slide.mobileImage}
                  fallbackImage={slide.fallbackImage}
                  alt={slide.title}
                />
              </div>
              <p className="mt-6 font-body text-[12px] font-semibold uppercase text-accent">{slide.label}</p>
              <Heading className="mt-3 font-heading text-[32px] font-semibold leading-[1.15] text-primary">
                {slide.title}
              </Heading>
              <p className="mobile-copy mt-4 whitespace-pre-line text-text">{slide.desc}</p>
            </li>
          );
        })}
      </ol>
      <Link
        href={endNav.href}
        className="mobile-tap-target mx-[var(--mobile-page-gutter)] mb-20 block border-y border-primary/15 py-6"
      >
        <span className="block text-[12px] uppercase text-accent">{endNav.label}</span>
        <span className="mt-2 block font-heading text-[28px] text-primary">{endNav.title}</span>
      </Link>
    </main>
  );
}

function ChronicleMobileSlideImage({
  image,
  mobileImage,
  fallbackImage,
  alt
}: {
  image: string;
  mobileImage: string;
  fallbackImage: string;
  alt: string;
}) {
  const [source, setSource] = useState(image || fallbackImage);
  const [failed, setFailed] = useState(false);

  if (!source || failed) {
    return null;
  }

  return (
    <ResponsiveCmsImage
      filename={source}
      mobileFilename={mobileImage}
      alt={alt}
      sizes="100vw"
      className="object-cover"
      onDesktopError={() => {
        if (source !== fallbackImage) {
          setSource(fallbackImage);
          return;
        }

        setFailed(true);
      }}
    />
  );
}
