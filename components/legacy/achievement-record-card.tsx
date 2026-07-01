import Image from 'next/image';

import {imageSrc} from '@/lib/image-src';

export type AchievementFirstRecord = {
  image: string;
};

type AchievementRecordGalleryProps = {
  records: AchievementFirstRecord[];
  imageAltPrefix: string;
};

export function AchievementRecordGallery({records, imageAltPrefix}: AchievementRecordGalleryProps) {
  return (
    <div className="achievement-record-gallery mx-auto grid w-full max-w-[1110px] gap-6 px-container md:grid-cols-3 lg:px-0">
      {records.slice(0, 3).map((record, index) => (
        <figure
          key={`${record.image}-${index}`}
          className="achievement-record-gallery__item relative aspect-[3/4] overflow-hidden bg-[#d8d8d8]"
        >
          <Image
            src={imageSrc(record.image)}
            alt={`${imageAltPrefix} ${index + 1}`}
            fill
            sizes="(min-width: 1024px) 330px, (min-width: 768px) 30vw, 100vw"
            className="object-cover"
          />
        </figure>
      ))}
    </div>
  );
}
