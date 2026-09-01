import {ScrollText} from '@/components/motion/scroll-text';

type TechniqueIntroSectionProps = {
  title: string;
  body: string;
};

export function TechniqueIntroSection({title, body}: TechniqueIntroSectionProps) {
  if (!title && !body) {
    return null;
  }

  return (
    <section
      aria-labelledby="technique-intro-title"
      className="relative z-10 px-container py-[clamp(96px,9vw,144px)]"
    >
      <ScrollText className="mx-auto max-w-[780px] text-center">
        <h2
          id="technique-intro-title"
          className="break-words font-heading text-[clamp(40px,3.7vw,58px)] font-semibold leading-[1.24] tracking-[-0.025em] text-accent"
        >
          {title}
        </h2>
        <p className="mobile-copy mx-auto mt-6 max-w-[680px] break-words whitespace-pre-line font-body text-[16px] leading-8 text-text/76 md:text-[17px]">
          {body}
        </p>
      </ScrollText>
    </section>
  );
}
