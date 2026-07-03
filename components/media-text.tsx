import {SafeImage} from './safe-image';

type MediaTextProps = {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
};

export function MediaText({
  eyebrow,
  title,
  body,
  image,
  imageAlt,
  reverse = false
}: MediaTextProps) {
  return (
    <article
      className={`grid items-center gap-10 md:grid-cols-2 ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}
    >
      <SafeImage filename={image} alt={imageAlt} aspect="aspect-[4/5]" />
      <div className="space-y-5">
        <p className="font-body text-eyebrow font-medium uppercase tracking-[0.22em] text-subtext">
          {eyebrow}
        </p>
        <h3 className="font-heading text-[clamp(24px,2.4vw,34px)] font-semibold leading-tight text-primary">
          {title}
        </h3>
        <p className="whitespace-pre-line font-body text-[14px] leading-7 text-text">{body}</p>
        <span className="link-sweep font-body text-sm font-semibold uppercase tracking-[0.12em]">
          Explore
        </span>
      </div>
    </article>
  );
}
