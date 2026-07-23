import Image from 'next/image';

import {imageSrc} from '@/lib/image-src';

export type AchievementFirstRecord = {
  title: string;
  image: string;
};

type AchievementRecordGalleryProps = {
  records: AchievementFirstRecord[];
  imageAltPrefix: string;
};

export function AchievementRecordGallery({records, imageAltPrefix}: AchievementRecordGalleryProps) {
  return (
    <div className="achievement-record-gallery mx-auto grid w-full max-w-[1240px] gap-6 px-container md:grid-cols-2 lg:px-0">
      {records.slice(0, 4).map((record, index) => (
        <div
          key={`${record.image}-${index}`}
          className="achievement-record-gallery__item"
        >
          <p className="achievement-record-gallery__title min-h-[3.5rem] line-clamp-2 text-left text-[15px] leading-7 text-primary md:text-base">
            {record.title}
          </p>
          <figure className="relative aspect-video overflow-hidden bg-[#d8d8d8]">
            <Image
              src={imageSrc(record.image)}
              alt={record.title || `${imageAltPrefix} ${index + 1}`}
              fill
              sizes="(min-width: 1024px) 600px, (min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </figure>
        </div>
      ))}
    </div>
  );
}
