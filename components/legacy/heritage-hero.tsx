import {Reveal} from '@/components/motion/reveal';
import type {Locale} from '@/i18n/routing';

type HeritageHeroProps = {
  body?: string;
  imagePlaceholder: string;
  label: string;
  lines?: string[];
  locale: Locale;
  title: string;
};

export function HeritageHero({
  body,
  imagePlaceholder,
  label,
  lines,
  locale,
  title
}: HeritageHeroProps) {
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const bodyTextClass =
    locale === 'ko'
      ? "[font-family:'MaruBuri',serif] font-semibold"
      : englishTextClass;
  const contentLines = lines?.length ? lines : body ? [body] : [];

  return (
    <section className="sticky top-0 z-0 grid min-h-[100svh] place-items-center overflow-hidden bg-[#653433] px-container py-[clamp(118px,14vw,188px)]">
      <Reveal className="w-full max-w-[680px] border border-white/18 bg-[#e5dddc] px-[clamp(30px,4.8vw,70px)] py-[clamp(54px,6vw,74px)] text-center text-[#111111] shadow-[0_28px_90px_rgba(22,10,10,0.10)]">
        <p className={`${englishTextClass} mb-[46px] text-[15px] uppercase leading-none tracking-[0.04em] text-accent`}>
          {label}
        </p>
        <h1 className={`${englishTextClass} mb-[18px] text-[clamp(30px,3.05vw,42px)] uppercase leading-none tracking-[0.015em] text-black`}>
          {title}
        </h1>
        <div className="mx-auto max-w-[560px] space-y-1">
          {contentLines.map((line) => (
            <p key={line} className={`${bodyTextClass} text-[15px] leading-[1.8] tracking-[-0.01em] text-[#111111]`}>
              {line}
            </p>
          ))}
        </div>
      </Reveal>
      <p className={`${bodyTextClass} absolute bottom-5 left-5 text-[15px] leading-none text-black`}>
        {imagePlaceholder}
      </p>
    </section>
  );
}
