import {SafeImage} from './safe-image';

type HeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
};

export function Hero({eyebrow, title, subtitle, image, imageAlt}: HeroProps) {
  return (
    <section className="mx-auto grid min-h-[88vh] w-full max-w-[1440px] items-center gap-12 px-container py-section lg:grid-cols-[1fr_minmax(360px,520px)]">
      <div className="space-y-8">
        <p className="font-body text-eyebrow font-medium uppercase tracking-[0.22em] text-subtext">
          {eyebrow}
        </p>
        <h1 className="max-w-5xl font-heading text-hero font-bold leading-none tracking-normal text-primary">
          {title}
        </h1>
        <p className="max-w-2xl whitespace-pre-line font-body text-body text-text">{subtitle}</p>
      </div>
      <SafeImage filename={image} alt={imageAlt} aspect="aspect-square" priority />
    </section>
  );
}
