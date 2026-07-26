'use client';

import {getImageProps} from 'next/image';
import {useMemo, useState, type SyntheticEvent} from 'react';

import {imageSrc} from '@/lib/image-src';

type ResponsiveCmsImageProps = {
  filename: string;
  mobileFilename?: string;
  alt: string;
  sizes?: string;
  mobileSizes?: string;
  className?: string;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onDesktopError?: () => void;
};

export function ResponsiveCmsImage({
  filename,
  mobileFilename,
  alt,
  sizes = '100vw',
  mobileSizes = '100vw',
  className = 'object-cover',
  priority = false,
  loading = 'lazy',
  onLoad,
  onDesktopError
}: ResponsiveCmsImageProps) {
  const [mobileFailed, setMobileFailed] = useState(false);
  const desktopSource = imageSrc(filename);
  const mobileSource = imageSrc(mobileFilename ?? '');
  const desktopProps = useMemo(
    () =>
      getImageProps({
        src: desktopSource,
        alt,
        fill: true,
        sizes,
        className,
        ...(priority ? {priority: true} : {loading})
      }).props,
    [alt, className, desktopSource, loading, priority, sizes]
  );
  const mobileSrcSet = useMemo(() => {
    if (!mobileSource || mobileFailed) {
      return '';
    }

    return getImageProps({
      src: mobileSource,
      alt,
      fill: true,
      sizes: mobileSizes,
      className,
      ...(priority ? {priority: true} : {loading})
    }).props.srcSet;
  }, [alt, className, loading, mobileFailed, mobileSizes, mobileSource, priority]);

  if (!desktopSource) {
    return null;
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const currentSrc = event.currentTarget.currentSrc;
    const mobileRequestFailed =
      Boolean(mobileSrcSet) &&
      !mobileFailed &&
      (currentSrc.includes(encodeURIComponent(mobileSource)) ||
        currentSrc.includes(mobileSource) ||
        window.matchMedia('(max-width: 767px)').matches);

    if (mobileRequestFailed) {
      setMobileFailed(true);
      return;
    }

    onDesktopError?.();
  };

  return (
    <picture key={mobileFailed ? 'desktop-fallback' : mobileSource || 'desktop-only'}>
      {mobileSrcSet ? (
        <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes={mobileSizes} />
      ) : null}
      <img
        {...desktopProps}
        alt={alt}
        onError={handleError}
        onLoad={onLoad}
      />
    </picture>
  );
}
