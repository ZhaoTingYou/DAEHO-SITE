import Image from 'next/image';

import {imageExists} from '@/lib/image-exists';
import {imageSrc} from '@/lib/image-src';
import {PlaceholderImg} from './placeholder-img';

type SafeImageProps = {
  filename: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
  variant?: 'spotlight' | 'plain';
};

export function SafeImage({
  filename,
  alt,
  aspect = 'aspect-[4/3]',
  priority = false,
  variant = 'spotlight'
}: SafeImageProps) {
  if (!imageExists(filename)) {
    return <PlaceholderImg filename={filename} aspect={aspect} />;
  }

  const frame =
    variant === 'spotlight'
      ? 'bg-white shadow-[0_24px_80px_rgba(16,29,48,0.08)]'
      : 'bg-white';

  return (
    <div className={`${aspect} ${frame} relative w-full overflow-hidden`}>
      <Image
        src={imageSrc(filename)}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 520px, 100vw"
        className="object-cover"
      />
    </div>
  );
}
