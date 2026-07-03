import {SafeImage} from './safe-image';

type TimelineEntryProps = {
  year: string;
  title: string;
  body: string;
  image: string;
  first?: boolean;
  firstLabel?: string;
};

export function TimelineEntry({
  year,
  title,
  body,
  image,
  first = false,
  firstLabel
}: TimelineEntryProps) {
  return (
    <article className="grid gap-6 border-l border-hairline pl-6 md:grid-cols-[160px_1fr_220px] md:border-l-0 md:pl-0">
      <div className="font-numeric text-2xl font-semibold text-primary">{year}</div>
      <div className="space-y-3">
        {first && firstLabel ? (
          <span className="inline-flex border border-accent px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {firstLabel}
          </span>
        ) : null}
        <h3 className="font-heading text-2xl font-semibold text-primary">{title}</h3>
        <p className="whitespace-pre-line font-body text-sm leading-6 text-subtext">{body}</p>
      </div>
      <SafeImage filename={image} alt={title} aspect="aspect-[3/2]" />
    </article>
  );
}
