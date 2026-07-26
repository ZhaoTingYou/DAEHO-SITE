'use client';

import {useState} from 'react';

import {PlaceholderImg} from './placeholder-img';
import {ResponsiveCmsImage} from './responsive-cms-image';

type SafeImageProps = {
  filename: string;
  mobileFilename?: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
  sizes?: string;
  variant?: 'spotlight' | 'plain';
};

export function SafeImage({
  filename,
  mobileFilename,
  alt,
  aspect = 'aspect-[4/3]',
  priority = false,
  sizes = '(min-width: 1024px) 520px, 100vw',
  variant = 'spotlight'
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!filename.trim() || failed) {
    return <PlaceholderImg filename={filename} aspect={aspect} />;
  }

  const frame =
    variant === 'spotlight'
      ? 'bg-white shadow-[0_24px_80px_rgba(16,29,48,0.08)]'
      : 'bg-white';

  return (
    <div className={`${aspect} ${frame} relative w-full overflow-hidden`}>
      <ResponsiveCmsImage
        filename={filename}
        mobileFilename={mobileFilename}
        alt={alt}
        priority={priority}
        sizes={sizes}
        className="object-cover"
        onDesktopError={() => setFailed(true)}
      />
    </div>
  );
}
