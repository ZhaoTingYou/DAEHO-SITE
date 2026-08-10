import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {NewsJournalGrid, type NewsCard} from '@/components/news/news-journal-grid';
import {Reveal} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {getNewsCardsForSite} from '@/lib/cms/public-content';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'news');
}

export default async function NewsPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getPublicLocaleMessages(locale, ['news']);
  const content = messages.news;
  const text = messages.newsUi;
  const cards: NewsCard[] = await getNewsCardsForSite(locale);
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const titleTextClass = locale === 'ko' ? "[font-family:'MaruBuri',serif] font-semibold" : englishTextClass;

  return (
    <main className="mobile-page-shell bg-white text-text">
      <section className="overflow-hidden bg-white pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+32px)] md:pt-[clamp(100px,10vw,148px)]">
        <div className="mx-auto max-w-[1240px] px-container pb-8 pt-0 md:pb-[clamp(34px,3.5vw,56px)] md:pt-5">
          <Reveal>
            <h1 className={`${englishTextClass} mobile-display text-primary md:text-[clamp(56px,8vw,104px)] md:leading-[0.86] md:tracking-[0.025em]`}>
              {content.masthead.title}
            </h1>
          </Reveal>
          <div className="mt-6 h-px w-full bg-black md:mt-[clamp(32px,3.8vw,54px)]" aria-hidden="true" />
        </div>
      </section>

      <section className="bg-white pb-12 pt-6 md:pb-[clamp(58px,6vw,96px)] md:pt-[clamp(28px,3.5vw,48px)]">
        <div className="mx-auto max-w-[1240px] px-container">
          <Reveal className="group grid gap-6 border-y border-primary/20 bg-bg px-0 py-5 md:gap-[clamp(28px,4vw,58px)] md:px-[clamp(18px,2vw,32px)] md:py-[clamp(20px,2.6vw,34px)] lg:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)] lg:items-stretch">
            <div>
              <SafeImage
                filename={content.featured.image}
                alt={content.featured.title}
                aspect="aspect-[4/3]"
                variant="plain"
              />
            </div>
            <div className="flex flex-col justify-between gap-6 px-0 py-0 md:gap-[clamp(34px,4vw,56px)] md:px-2 md:py-1 lg:py-4">
              <div>
                <div className={`${englishTextClass} mobile-copy flex flex-wrap items-center gap-x-3 gap-y-2 uppercase leading-none tracking-[0.12em] md:gap-x-4 md:text-[15px] md:tracking-[0.2em]`}>
                  <span className="text-accent">
                    {content.featured.eyebrow}
                  </span>
                  <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                  <span className="text-subtext">{content.featured.category}</span>
                  <span className="text-subtext">{content.featured.date}</span>
                </div>
                <h2 className={`${titleTextClass} mt-4 break-words text-[24px] leading-[1.24] text-primary md:mt-[18px] md:text-[clamp(30px,3.2vw,44px)] md:leading-[1.18]`}>
                  {content.featured.title}
                </h2>
              </div>
              <div className="h-px w-full bg-hairline" aria-hidden="true" />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="news-grid" className="bg-white pb-[var(--mobile-section-space)] pt-2 md:pb-section md:pt-[clamp(10px,2vw,24px)]">
        <div className="mx-auto max-w-[1240px] space-y-8 px-container md:space-y-[clamp(34px,4vw,52px)]">
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
