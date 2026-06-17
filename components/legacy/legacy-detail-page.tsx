import Link from 'next/link';

import {LegacyMetricGrid, type LegacyMetricItem} from '@/components/legacy/legacy-metric-grid';
import {LegacyPartnerWall} from '@/components/legacy/legacy-partner-wall';
import {Reveal, RevealItem} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import {SectionIntro} from '@/components/section-intro';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {withLocale} from '@/lib/site-map';

type LegacyDetailContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
  };
  metrics: LegacyMetricItem[];
  statement?: string;
  partners?: {
    eyebrow: string;
    title: string;
    body: string;
    labels: string[];
  };
  gallery?: {
    eyebrow: string;
    title: string;
    items: Array<{
      title: string;
      image: string;
    }>;
  };
};

type LegacyDetailPageProps = {
  locale: Locale;
  content: LegacyDetailContent;
};

export function LegacyDetailPage({locale, content}: LegacyDetailPageProps) {
  const messages = getLocaleMessages(locale);

  return (
    <main className="bg-bg text-text">
      <section className="bg-white pt-28">
        <div className="mx-auto max-w-[1280px] px-container pb-[clamp(72px,8vw,128px)] pt-[clamp(64px,8vw,120px)]">
          <Reveal className="mx-auto max-w-3xl space-y-6 text-center">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
              {content.hero.eyebrow}
            </p>
            <h1 className="font-heading text-[clamp(28px,3.6vw,44px)] font-semibold leading-[1.12] text-primary">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-xl font-body text-[14px] leading-[1.85] text-text">
              {content.hero.subtitle}
            </p>
          </Reveal>
          <Reveal className="mx-auto mt-[clamp(48px,6vw,88px)] w-full max-w-[1180px]">
            <SafeImage
              filename={content.hero.image}
              alt={content.hero.subtitle}
              aspect="aspect-[21/9]"
              variant="plain"
              priority
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-[1180px] px-container">
          <LegacyMetricGrid
            items={content.metrics}
            locale={locale}
            variant={content.metrics.length > 2 ? 'compact' : 'monument'}
          />
          {content.statement ? (
            <Reveal className="mx-auto mt-[clamp(48px,6vw,80px)] max-w-2xl text-center font-body text-[14px] leading-[1.85] text-text">
              <p>{content.statement}</p>
            </Reveal>
          ) : null}
        </div>
      </section>

      {content.partners ? (
        <section className="bg-white py-section">
          <div className="mx-auto max-w-[1180px] space-y-[clamp(56px,6vw,88px)] px-container">
            <Reveal>
              <SectionIntro
                eyebrow={content.partners.eyebrow}
                title={content.partners.title}
                variant="legacy"
              >
                <p>{content.partners.body}</p>
              </SectionIntro>
            </Reveal>
            <LegacyPartnerWall labels={content.partners.labels} />
          </div>
        </section>
      ) : null}

      {content.gallery ? (
        <section className="bg-white py-section">
          <div className="mx-auto max-w-[1180px] space-y-[clamp(56px,6vw,88px)] px-container">
            <Reveal>
              <SectionIntro
                eyebrow={content.gallery.eyebrow}
                title={content.gallery.title}
                variant="legacy"
              />
            </Reveal>
            <Reveal className="grid gap-8 md:grid-cols-2 md:gap-10">
              {content.gallery.items.map((item) => (
                <RevealItem key={item.image}>
                  <article className="bg-bg p-3 shadow-[0_14px_50px_rgba(16,29,48,0.05)]">
                    <div className="hover-zoom">
                      <div className="hover-zoom-media">
                        <SafeImage
                          filename={item.image}
                          alt={item.title}
                          aspect="aspect-[3/2]"
                          variant="plain"
                        />
                      </div>
                    </div>
                    <h2 className="px-2 pb-3 pt-5 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext">
                      {item.title}
                    </h2>
                  </article>
                </RevealItem>
              ))}
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className="bg-bg py-section">
        <Reveal className="mx-auto max-w-3xl px-container text-center">
          <Link
            href={withLocale(locale, '/archive')}
            className="link-sweep font-body text-[12px] font-semibold uppercase tracking-[0.16em]"
          >
            {messages.legacyUi.backToLegacy}
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
