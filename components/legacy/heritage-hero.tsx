import {Reveal} from '@/components/motion/reveal';
import {ResponsiveCmsImage} from '@/components/responsive-cms-image';

type HeritageHeroProps = {
  body?: string;
  image?: string;
  mobileImage?: string;
  imageAlt?: string;
  imagePlaceholder: string;
  label: string;
  lines?: string[];
  title: string;
};

export function HeritageHero({
  body,
  image,
  mobileImage,
  imageAlt = '',
  imagePlaceholder,
  label,
  lines,
  title
}: HeritageHeroProps) {
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const bodyTextClass = "[font-family:'Pretendard',sans-serif] font-normal";
  const contentLines = lines?.length ? lines : body ? [body] : [];
  const mobileTitleTextClass = image ? 'max-md:text-white' : '';
  const mobileSupportingTextClass = image ? 'max-md:text-white/90' : '';

  return (
    <section className="sticky top-0 z-0 grid min-h-[100svh] place-items-center overflow-hidden bg-[#f4f1ee] px-container py-[clamp(118px,14vw,188px)] max-md:relative max-md:top-auto max-md:min-h-[78svh] max-md:px-[var(--mobile-page-gutter)] max-md:pb-[80px] max-md:pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+80px)]">
      {image ? (
        <>
          <ResponsiveCmsImage
            filename={image}
            mobileFilename={mobileImage}
            alt={imageAlt}
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden max-md:block max-md:bg-gradient-to-b max-md:from-black/25 max-md:via-black/55 max-md:to-black/70"
          />
        </>
      ) : null}

      <Reveal className="relative z-10 w-full max-w-[680px] border border-white/18 bg-[#e5dddc] px-[clamp(30px,4.8vw,70px)] py-[clamp(54px,6vw,74px)] text-center text-[#111111] shadow-[0_28px_90px_rgba(22,10,10,0.10)] max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:py-0 max-md:shadow-none">
        <p className={`${englishTextClass} ${mobileSupportingTextClass} mb-[46px] text-[15px] uppercase leading-none tracking-[0.04em] text-accent`}>
          {label}
        </p>
        <h1 className={`${englishTextClass} ${mobileTitleTextClass} mobile-display mb-[18px] uppercase leading-none tracking-[0.015em] text-black md:text-[clamp(30px,3.05vw,42px)]`}>
          {title}
        </h1>
        <div className="mx-auto max-w-[560px] space-y-1">
          {contentLines.map((line) => (
            <p key={line} className={`${bodyTextClass} ${mobileSupportingTextClass} whitespace-pre-line text-[15px] leading-[1.8] tracking-normal mobile-copy text-[#111111]`}>
              {line}
            </p>
          ))}
        </div>
      </Reveal>
      {!image && imagePlaceholder ? (
        <p className={`${bodyTextClass} absolute bottom-5 left-5 text-[15px] leading-none text-black`}>
          {imagePlaceholder}
        </p>
      ) : null}
    </section>
  );
}
