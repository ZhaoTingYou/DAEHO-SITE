type SectionIntroProps = {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  align?: 'left' | 'center';
  variant?: 'default' | 'chronicle' | 'legacy' | 'news' | 'specialty' | 'specialtyPlain';
};

export function SectionIntro({
  eyebrow,
  title,
  children,
  align = 'left',
  variant = 'default'
}: SectionIntroProps) {
  const variantClass = {
    default: '',
    chronicle: 'border-l border-primary/40 pl-5 md:pl-7',
    legacy: 'mx-auto max-w-5xl text-center',
    news: 'border-b-2 border-primary pb-5',
    specialty: 'mx-auto max-w-[760px] border-y border-primary/25 py-[clamp(26px,3vw,38px)] text-center',
    specialtyPlain: 'mx-auto max-w-[760px] py-[clamp(26px,3vw,38px)] text-center'
  }[variant];
  const alignment = align === 'center' && variant === 'default' ? 'mx-auto text-center' : '';
  const titleClass =
    variant === 'legacy'
      ? 'font-heading text-[clamp(24px,2.6vw,36px)] font-semibold leading-[1.15] text-primary'
      : variant === 'specialty' || variant === 'specialtyPlain'
        ? 'font-heading text-[clamp(25px,2.4vw,34px)] font-semibold leading-[1.18] text-primary'
        : variant === 'news'
          ? 'font-heading text-[clamp(36px,5.8vw,68px)] font-bold leading-none text-primary'
          : 'font-heading text-h1 font-semibold text-primary';

  return (
    <div className={`max-w-3xl space-y-5 ${alignment} ${variantClass}`}>
      <p className="font-body text-[15px] font-medium uppercase leading-none tracking-[0.22em] text-subtext">
        {eyebrow}
      </p>
      <h2 className={titleClass}>{title}</h2>
      {children ? <div className="whitespace-pre-line font-body text-[15px] leading-[1.85] text-text">{children}</div> : null}
    </div>
  );
}
