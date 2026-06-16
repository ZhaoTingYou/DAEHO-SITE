import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Reveal} from '@/components/motion/reveal';
import {NewsReadingProgress} from '@/components/news/news-reading-progress';
import {ShareLinkButton} from '@/components/news/share-link-button';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {routing} from '@/i18n/routing';
import {getNewsCardsForSite, getNewsDetailForSite} from '@/lib/cms/public-content';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getDetailMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';
import koMessages from '@/messages/ko.json';

type Props = {
  params: Promise<{locale: Locale; slug: string}>;
};

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  const slugs = koMessages.news.grid.cards.map((card) => card.id);
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({locale, slug})));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, slug} = await params;
  const detail = getNewsDetailForSite(locale, slug);

  if (!detail) {
    return getDetailMetadata(locale, '/news', 'JOURNAL', '');
  }

  return getDetailMetadata(
    locale,
    `/news/${slug}`,
    detail.seoTitle || detail.card.title,
    detail.seoDescription,
    `/images/${detail.ogImagePath}`
  );
}

export default async function NewsDetailPage({params}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const messages = getLocaleMessages(locale);
  const detail = getNewsDetailForSite(locale, slug);

  if (!detail) {
    notFound();
  }

  const text = messages.newsUi.detail;
  const card = detail.card;
  const related = getNewsCardsForSite(locale).filter((item) => item.id !== slug).slice(0, 3);

  return (
    <main className="bg-bg text-text">
      <NewsReadingProgress />
      <article className="bg-white pt-28">
        <div className="mx-auto max-w-5xl px-container py-section">
          <Link href={withLocale(locale, '/news')} className="link-sweep font-body text-sm font-semibold uppercase tracking-[0.12em]">
            {text.back}
          </Link>
          <Reveal className="mt-12 space-y-8">
            <div className="h-px w-full bg-primary" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-[12px] font-semibold uppercase tracking-[0.18em]">
              <span className="text-accent">{card.categoryLabel}</span>
              <span className="text-subtext">{card.date}</span>
              <span className="text-subtext">{text.author}</span>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.8vw,68px)] font-semibold leading-none text-primary">
              {card.title}
            </h1>
            <p className="max-w-3xl font-body text-[15px] leading-7 text-subtext">{detail.lead}</p>
          </Reveal>
          <Reveal className="mt-12">
            <SafeImage
              filename={detail.ogImagePath || card.image}
              alt={card.title}
              aspect="aspect-[16/9]"
              priority
              variant="plain"
            />
          </Reveal>
        </div>
      </article>

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-[720px] space-y-8 px-container">
          {detail.paragraphs.map((paragraph) => (
            <Reveal key={paragraph}>
              <p className="font-body text-[15px] leading-8 text-text">{paragraph}</p>
            </Reveal>
          ))}
          <Reveal>
            <blockquote className="border-l-2 border-accent bg-white px-6 py-5 font-heading text-[22px] font-semibold leading-tight text-primary">
              {detail.quote}
            </blockquote>
          </Reveal>
          <Reveal className="flex flex-wrap items-center gap-3">
            {detail.tags.map((tag) => (
              <span key={tag} className="border border-hairline bg-white px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-subtext">
                {tag}
              </span>
            ))}
            <ShareLinkButton copy={messages.newsUi.share} />
          </Reveal>
          <Reveal className="bg-white p-6 shadow-[0_20px_70px_rgba(16,29,48,0.06)]">
            <p className="font-heading text-[28px] font-semibold leading-tight text-primary">{detail.ctaTitle}</p>
            <Link href={withLocale(locale, `/contact?type=other&source=news&item=${slug}`)} className="link-sweep mt-5 inline-flex font-body text-sm font-semibold uppercase tracking-[0.12em]">
              {text.cta}
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-section">
        <div className="mx-auto max-w-[1440px] space-y-8 px-container">
          <Reveal>
            <h2 className="font-heading text-[clamp(30px,4.4vw,54px)] font-semibold leading-none text-primary">
              {text.related}
            </h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                href={withLocale(locale, `/news/${item.id}`)}
                className="group block bg-bg p-3 shadow-[0_14px_48px_rgba(16,29,48,0.05)] transition duration-hover ease-brand hover:-translate-y-1"
              >
                <SafeImage filename={item.image} alt={item.title} aspect="aspect-[3/2]" variant="plain" />
                <div className="space-y-3 px-1 py-5">
                  <p className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    {item.categoryLabel}
                  </p>
                  <h3 className="font-heading text-[22px] font-semibold leading-tight text-primary">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
