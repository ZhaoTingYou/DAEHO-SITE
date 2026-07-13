import {Reveal} from '@/components/motion/reveal';
import {ScrollText} from '@/components/motion/scroll-text';
import {SafeImage} from '@/components/safe-image';

export type TechniqueRecord = {
  id?: string;
  number: string;
  title: string;
  scope: string;
  status: string;
  body: string;
  image: string;
};

type TechniqueRecordsSectionProps = {
  eyebrow: string;
  title: string;
  records: TechniqueRecord[];
};

export function TechniqueRecordsSection({eyebrow, title, records}: TechniqueRecordsSectionProps) {
  return (
    <section className="relative z-10 border-y border-primary/10 bg-white py-[clamp(72px,8vw,118px)]">
      <div className="mx-auto max-w-[1180px] px-container">
        <ScrollText className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="max-w-[640px]">
            <p className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.3em] text-accent">
              {eyebrow}
            </p>
            <h2 className="mt-5 font-heading text-[clamp(26px,2.7vw,38px)] font-semibold leading-[1.2] text-primary">
              {title}
            </h2>
          </div>

          <div className="flex w-full min-w-0 items-center gap-4 md:max-w-[420px]">
            <span className="h-px min-w-0 flex-1 bg-primary/18" aria-hidden="true" />
            <p className="shrink-0 font-body text-[12px] font-semibold leading-none tracking-[0.2em] text-primary/60">
              {String(records.length).padStart(2, '0')}
            </p>
          </div>
        </ScrollText>

        <div className="mt-[clamp(38px,5vw,68px)] border-t border-primary/18">
          {records.map((item, index) => {
            const mediaOrderClass = index % 2 === 0 ? 'lg:order-1' : 'lg:order-2';
            const textOrderClass = index % 2 === 0 ? 'lg:order-2' : 'lg:order-1';

            return (
              <article
                key={item.id ?? item.number}
                className="mobile-technique-record grid min-w-0 gap-6 border-b border-primary/18 py-[72px] lg:gap-[clamp(28px,5vw,72px)] lg:py-[clamp(34px,5vw,72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
              >
                <div className="order-1 flex flex-wrap items-baseline gap-x-5 gap-y-2 md:hidden">
                  <p className="font-heading text-[32px] font-semibold leading-none text-accent">{item.number}</p>
                  {item.status ? (
                    <p className="font-body text-[11px] font-medium uppercase leading-5 tracking-[0.12em] text-subtext">
                      {item.status}
                    </p>
                  ) : null}
                </div>

                <Reveal className={`order-2 min-w-0 ${mediaOrderClass}`}>
                  <SafeImage
                    filename={item.image}
                    alt={item.title}
                    aspect="aspect-[4/3]"
                    variant="plain"
                    sizes="(min-width: 1024px) 560px, 100vw"
                  />
                </Reveal>

                <ScrollText className={`order-3 min-w-0 lg:px-[clamp(12px,3vw,44px)] ${textOrderClass}`}>
                  <div className="hidden flex-wrap items-baseline gap-x-5 gap-y-2 md:flex">
                    <p className="font-heading text-[clamp(30px,3.4vw,46px)] font-semibold leading-none text-accent">
                      {item.number}
                    </p>
                    {item.status ? (
                      <p className="font-body text-[11px] font-medium uppercase leading-5 tracking-[0.12em] text-subtext">
                        {item.status}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-0 break-words font-body text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary/55 md:hidden">
                    {item.scope}
                  </p>
                  <h3 className="mt-4 break-words font-heading text-[clamp(25px,2.5vw,34px)] font-semibold leading-[1.22] text-primary md:mt-6">
                    {item.title}
                  </h3>
                  <p className="mt-4 hidden font-body text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary/55 md:block">
                    {item.scope}
                  </p>
                  <p className="mobile-copy mt-6 break-words whitespace-pre-line font-body text-[16px] leading-7 text-text md:leading-8">
                    {item.body}
                  </p>
                </ScrollText>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
