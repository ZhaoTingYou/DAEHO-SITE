import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {NewsJournalGrid, type NewsCard} from '@/components/news/news-journal-grid';
import {Reveal} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {getNewsCardsForSite} from '@/lib/cms/public-content';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'news');
}

export default async function NewsPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = getLocaleMessages(locale);
  const content = messages.news;
  const text = messages.newsUi;
  const cards: NewsCard[] = getNewsCardsForSite(locale);

  return (
    <main className="bg-bg text-text">
      <section className="overflow-hidden bg-bg pt-[clamp(82px,8vw,104px)]">
        <div className="mx-auto max-w-[1440px] px-container pb-4 pt-4 md:pb-5 md:pt-6">
          <Reveal className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.55fr)] lg:items-end">
            <h1 className="font-heading text-[clamp(52px,9vw,112px)] font-semibold leading-[0.82] text-primary">
              {content.masthead.title}
            </h1>
            <div className="space-y-5 pb-2 text-left lg:text-right">
              <p className="font-body text-[12px] font-semibold uppercase tracking-[0.22em] text-subtext">
                {content.masthead.issue}
              </p>
              <p className="font-body text-[14px] leading-7 text-text">
                {content.masthead.body}
              </p>
            </div>
          </Reveal>

        </div>
      </section>

      <section className="bg-bg pb-[clamp(28px,3.5vw,52px)] pt-[clamp(36px,4.5vw,68px)]">
        <div className="mx-auto max-w-[1440px] px-container">
          <Reveal className="group grid gap-10 bg-white p-4 shadow-[0_24px_90px_rgba(16,29,48,0.08)] md:p-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <div className="hover-zoom relative">
              <div className="hover-zoom-media">
                <SafeImage
                  filename={content.featured.image}
                  alt={content.featured.title}
                  aspect="aspect-[16/9] lg:aspect-[4/3]"
                  variant="plain"
                />
              </div>
              <div className="news-featured-veil pointer-events-none absolute inset-0 bg-bg/62 transition duration-hover ease-brand group-hover:bg-bg/28" />
            </div>
            <div className="flex flex-col justify-between gap-12 px-1 py-3 md:px-2 lg:py-6">
              <div className="space-y-7">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="news-shine relative overflow-hidden text-accent">
                    {content.featured.eyebrow}
                  </span>
                  <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                  <span className="text-subtext">{content.featured.category}</span>
                  <span className="text-subtext">{content.featured.date}</span>
                </div>
                <h2 className="font-heading text-[clamp(30px,4.4vw,50px)] font-semibold leading-none text-primary">
                  {content.featured.title}
                </h2>
                <p className="max-w-2xl font-body text-[14px] leading-7 text-text">
                  {content.featured.body}
                </p>
              </div>
              <div className="h-px w-full bg-hairline" aria-hidden="true" />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="news-grid" className="bg-bg pb-section pt-[clamp(22px,3vw,44px)]">
        <div className="mx-auto max-w-[1440px] space-y-10 px-container">
          <Reveal>
            <NewsJournalGrid
              filters={content.grid.filters}
              cards={cards}
              empty={text.empty}
              filterLabel={text.filtersLabel}
              locale={locale}
            />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
