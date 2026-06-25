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
  const englishTextClass = "[font-family:'Cormorant_Garamond',serif] font-bold";
  const titleTextClass = locale === 'ko' ? "[font-family:'MaruBuri',serif] font-semibold" : englishTextClass;
  const bodyTextClass = "[font-family:'Pretendard',sans-serif] font-normal";
  const mastheadBodyLines =
    locale === 'ko'
      ? ['프로젝트 스토리와 제작 현장, 언론/피처, 협업 소식을', '한곳에 모읍니다']
      : content.masthead.body.split('\n').filter(Boolean);

  return (
    <main className="bg-white text-text">
      <section className="overflow-hidden bg-white pt-[clamp(100px,10vw,148px)]">
        <div className="mx-auto max-w-[1240px] px-container pb-[clamp(34px,3.5vw,56px)] pt-5">
          <Reveal className="grid gap-[clamp(32px,4vw,58px)] lg:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.48fr)] lg:items-end">
            <h1 className={`${englishTextClass} text-[clamp(56px,8vw,104px)] leading-[0.86] tracking-[0.025em] text-primary`}>
              {content.masthead.title}
            </h1>
            <div className="space-y-[15px] pb-1 text-right">
              <p className={`${bodyTextClass} text-[15px] leading-[1.86] text-text`}>
                {mastheadBodyLines.map((line, index) => (
                  <span key={`${line}-${index}`} className="block sm:whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </Reveal>
          <div className="mt-[clamp(32px,3.8vw,54px)] h-px w-full bg-black" aria-hidden="true" />
        </div>
      </section>

      <section className="bg-white pb-[clamp(58px,6vw,96px)] pt-[clamp(28px,3.5vw,48px)]">
        <div className="mx-auto max-w-[1240px] px-container">
          <Reveal className="group grid gap-[clamp(28px,4vw,58px)] border-y border-primary/20 bg-bg px-[clamp(18px,2vw,32px)] py-[clamp(20px,2.6vw,34px)] lg:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)] lg:items-stretch">
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
            <div className="flex flex-col justify-between gap-[clamp(34px,4vw,56px)] px-1 py-1 md:px-2 lg:py-4">
              <div>
                <div className={`${englishTextClass} flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] uppercase leading-none tracking-[0.2em]`}>
                  <span className="news-shine relative overflow-hidden text-accent">
                    {content.featured.eyebrow}
                  </span>
                  <span className="h-3 w-px bg-hairline" aria-hidden="true" />
                  <span className="text-subtext">{content.featured.category}</span>
                  <span className="text-subtext">{content.featured.date}</span>
                </div>
                <h2 className={`${titleTextClass} mt-[18px] text-[clamp(30px,3.2vw,44px)] leading-[1.18] text-primary`}>
                  {content.featured.title}
                </h2>
                <p className={`${bodyTextClass} mt-[18px] max-w-2xl text-[15px] leading-[1.86] text-text`}>
                  {content.featured.body}
                </p>
              </div>
              <div className="h-px w-full bg-hairline" aria-hidden="true" />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="news-grid" className="bg-white pb-section pt-[clamp(10px,2vw,24px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(34px,4vw,52px)] px-container">
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
