import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  body: string;
  cta?: string;
  href?: string;
};

export function EmptyState({title, body, cta, href}: EmptyStateProps) {
  return (
    <div className="border border-hairline bg-white px-5 py-12 text-center shadow-[0_16px_52px_rgba(16,29,48,0.05)]">
      <p className="font-heading text-[clamp(24px,3.4vw,38px)] font-semibold leading-tight text-primary">{title}</p>
      <p className="mx-auto mt-4 max-w-lg whitespace-pre-line font-body text-base leading-7 text-subtext">{body}</p>
      {cta && href ? (
        <Link href={href} className="link-sweep mt-6 inline-flex font-body text-sm font-semibold uppercase tracking-[0.12em]">
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
