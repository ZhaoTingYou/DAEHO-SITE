'use client';

import Image from 'next/image';
import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

import {imageSrc} from '@/lib/image-src';

type DetailImage = {
  filename: string;
  alt: string;
  hasImage: boolean;
};

type CollectionDetailGalleryProps = {
  images: DetailImage[];
  thumbnailLabel: string;
};

export function CollectionDetailGallery({images, thumbnailLabel}: CollectionDetailGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex] ?? images[0];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden bg-white shadow-[0_28px_90px_rgba(16,29,48,0.08)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected?.filename}
            initial={{opacity: 0, scale: 1.015}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.99}}
            transition={{duration: 0.38, ease: [0.16, 1, 0.3, 1]}}
          >
            <GalleryImage image={selected} aspect="aspect-[4/5] lg:aspect-square" sizes="(min-width: 1024px) 720px, 100vw" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-5 gap-3" aria-label={thumbnailLabel}>
        {images.map((image, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={image.filename}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedIndex(index)}
              className={`min-h-11 overflow-hidden border bg-white p-1 transition duration-hover ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isSelected ? 'border-accent' : 'border-hairline hover:border-primary/40'
              }`}
            >
              <GalleryImage image={image} aspect="aspect-square" sizes="120px" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GalleryImage({image, aspect, sizes}: {image?: DetailImage; aspect: string; sizes: string}) {
  if (!image || !image.hasImage) {
    return (
      <div
        className={`${aspect} flex w-full items-center justify-center break-all bg-bg p-3 text-center font-body text-[10px] font-semibold leading-5 tracking-[0.04em] text-subtext`}
        role="img"
        aria-label={image?.filename ?? 'missing image'}
      >
        {image?.filename ?? 'missing image'}
      </div>
    );
  }

  return (
    <div className={`${aspect} relative w-full overflow-hidden bg-bg`}>
      <Image
        src={imageSrc(image.filename)}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
