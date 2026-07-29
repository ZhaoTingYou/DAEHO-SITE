'use client';

import {motion} from 'framer-motion';
import Image from 'next/image';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {imageSrc} from '@/lib/image-src';

type LegacyPartnerWallProps = {
  labels: string[];
};

export function LegacyPartnerWall({labels}: LegacyPartnerWallProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {labels.map((label, index) => {
        const row = Math.floor(index / 6);
        const col = index % 6;

        return (
          <motion.div
            key={`${label}-${index}`}
            initial={prefersReducedMotion ? {opacity: 1, y: 0} : {opacity: 0, y: 16}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true, amount: 0.35}}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.55,
              delay: prefersReducedMotion ? 0 : (row + col) * 0.045,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="relative grid aspect-square place-items-center overflow-hidden border border-hairline bg-white/80 p-3 shadow-[0_14px_40px_rgba(16,29,48,0.04)]"
          >
            <Image
              src={imageSrc('legacy_partner_placeholder.png')}
              alt=""
              fill
              sizes="(min-width: 1024px) 160px, 33vw"
              className="object-cover opacity-30"
            />
            <span className="relative z-10 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
