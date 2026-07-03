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
import {getNewsCardsForSite, getNewsDetailForSite, type NewsBodyBlock} from '@/lib/cms/public-content';
import {imageSrc} from '@/lib/image-src';
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
  const detail = await getNewsDetailForSite(locale, slug);

  if (!detail) {
    return getDetailMetadata(locale, '/news', 'NEWS', '');
  }

  return getDetailMetadata(
    locale,
    `/news/${slug}`,
    detail.seoTitle || detail.card.title,
    detail.seoDescription,
    imageSrc(detail.ogImagePath)
  );
}

export default async function NewsDetailPage({params}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const detail = await getNewsDetailForSite(locale, slug);

  if (!detail) {
    notFound();
  }

  const text = messages.newsUi.detail;
  const card = detail.card;
  const related = (await getNewsCardsForSite(locale)).filter((item) => item.id !== slug).slice(0, 3);

  return (
    <main className="bg-bg text-text">
      <NewsReadingProgress />
      <article className="bg-bg">
        <section className="news-detail-hero border-b border-primary/10 px-container pb-16 pt-[calc(var(--header-height,80px)+48px)] md:pb-24 md:pt-[calc(var(--header-height,80px)+72px)]">
          <div className="mx-auto max-w-[1440px]">
            <Reveal className="news-detail-title-lockup mx-auto flex max-w-[1120px] flex-col items-center text-center">
              <Link
                href={withLocale(locale, '/news')}
                className="link-sweep inline-flex min-h-11 items-center justify-center font-body text-sm font-semibold text-subtext"
              >
                {text.back}
              </Link>
              <h1 className="news-detail-title mt-10 max-w-[1120px] font-body text-[34px] font-medium leading-[1.28] text-accent md:mt-12 md:text-[48px] md:leading-[1.22] lg:text-[60px]">
                {card.title}
              </h1>
            </Reveal>
          </div>
        </section>

        <section className="px-container py-[clamp(56px,8vw,112px)]">
          <div className="mx-auto max-w-[1440px]">
            <div className={detail.blocks.length > 0 ? 'space-y-0' : 'mx-auto max-w-[760px] space-y-8'}>
              {detail.blocks.length > 0 ? (
                <NewsDetailBlocks blocks={detail.blocks} />
              ) : (
                <NewsLegacyBody paragraphs={detail.paragraphs} quote={detail.quote} />
              )}
              <Reveal className="mx-auto mt-[clamp(32px,5vw,72px)] flex max-w-[760px] flex-wrap items-center gap-3 border-t border-primary/10 pt-8">
                {detail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-hairline bg-white px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-subtext"
                  >
                    {tag}
                  </span>
                ))}
                <ShareLinkButton copy={messages.newsUi.share} />
              </Reveal>
              <Reveal className="mx-auto mt-8 max-w-[760px] border-y border-primary/15 py-8">
                <p className="font-heading text-[clamp(28px,3.8vw,42px)] font-semibold leading-tight text-primary">{detail.ctaTitle}</p>
                <Link
                  href={withLocale(locale, `/contact?type=other&source=news&item=${slug}`)}
                  className="link-sweep mt-6 inline-flex min-h-11 items-center font-body text-sm font-semibold uppercase tracking-[0.12em]"
                >
                  {text.cta}
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-primary/10 bg-bg px-container py-[clamp(56px,8vw,104px)]">
          <div className="mx-auto max-w-[1440px] space-y-8">
            <Reveal>
              <h2 className="font-heading text-[clamp(30px,4.4vw,54px)] font-semibold leading-none text-primary">
                {text.related}
              </h2>
            </Reveal>
            <div className="grid gap-8 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={withLocale(locale, `/news/${item.id}`)}
                  className="group block border-t border-primary/15 pt-5 transition duration-hover ease-brand hover:border-accent"
                >
                  <SafeImage filename={item.image} alt={item.title} aspect="aspect-[3/4]" variant="plain" />
                  <div className="space-y-3 pt-5">
                    <p className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                      {item.categoryLabel}
                    </p>
                    <h3 className="font-heading text-[22px] font-semibold leading-tight text-primary transition duration-hover ease-brand group-hover:text-accent">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function NewsLegacyBody({paragraphs, quote}: {paragraphs: string[]; quote: string}) {
  return (
    <>
      {paragraphs.map((paragraph) => (
        <Reveal key={paragraph}>
          <p className="whitespace-pre-line font-body text-[15px] leading-8 text-text md:text-[16px] md:leading-9">{paragraph}</p>
        </Reveal>
      ))}
      {quote ? (
        <Reveal>
          <blockquote className="whitespace-pre-line border-y border-accent/40 py-8 font-heading text-[clamp(24px,3.2vw,36px)] font-semibold leading-tight text-primary">
            {quote}
          </blockquote>
        </Reveal>
      ) : null}
    </>
  );
}

function NewsDetailBlocks({blocks}: {blocks: NewsBodyBlock[]}) {
  return (
    <div className="space-y-0">
      {blocks.map((block, index) => (
        <Reveal key={`${block.type}-${block.image}-${block.title}-${index}`} className={newsBlockSpacingClass(block.spacing)}>
          <NewsDetailBlock block={block} />
        </Reveal>
      ))}
    </div>
  );
}

function NewsDetailBlock({block}: {block: NewsBodyBlock}) {
  if (block.type === 'imageFull') {
    return (
      <section className={`${newsBlockWidthClass(block.width)} space-y-5`}>
        {block.image ? (
          <SafeImage
            filename={block.image}
            alt={block.title || block.body || 'News image'}
            aspect="aspect-[4/3] md:aspect-[16/9]"
            sizes="(min-width: 1440px) 1280px, calc(100vw - 48px)"
            variant="plain"
          />
        ) : null}
        <NewsBlockCopy block={block} align="center" />
      </section>
    );
  }

  if (block.type === 'imageText') {
    const image = block.image ? (
      <SafeImage
        filename={block.image}
        alt={block.title || block.body || 'News image'}
        aspect="aspect-[4/3]"
        sizes="(min-width: 1024px) 520px, calc(100vw - 48px)"
        variant="plain"
      />
    ) : null;
    const copy = <NewsBlockCopy block={block} align="left" />;

    return (
      <section className={`${newsBlockWidthClass(block.width)} grid gap-[clamp(28px,4vw,64px)] lg:grid-cols-2 lg:items-center`}>
        {block.layout === 'imageRight' ? (
          <>
            <div>{copy}</div>
            <div>{image}</div>
          </>
        ) : (
          <>
            <div>{image}</div>
            <div>{copy}</div>
          </>
        )}
      </section>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className={`${newsBlockWidthClass(block.width)} whitespace-pre-line border-y border-accent/40 py-8 font-heading text-[clamp(24px,3.2vw,36px)] font-semibold leading-tight text-primary`}>
        {block.body || block.title}
      </blockquote>
    );
  }

  return (
    <section className={`${newsBlockWidthClass(block.width)} space-y-4`}>
      <NewsBlockCopy block={block} align="left" />
    </section>
  );
}

function NewsBlockCopy({block, align}: {block: NewsBodyBlock; align: 'left' | 'center'}) {
  if (!block.title && !block.body) {
    return null;
  }

  return (
    <div className={`space-y-5 ${align === 'center' ? 'mx-auto max-w-[760px] text-center' : ''}`}>
      {block.title ? (
        <h2 className="font-heading text-[clamp(30px,4.4vw,54px)] font-semibold leading-tight text-accent">
          {block.title}
        </h2>
      ) : null}
      {block.body ? (
        <div className="space-y-4">
          {block.body.split(/\n\s*\n|\n/).filter(Boolean).map((paragraph) => (
            <p key={paragraph} className="whitespace-pre-line font-body text-[15px] leading-8 text-text md:text-[16px] md:leading-9">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function newsBlockWidthClass(width: NewsBodyBlock['width']) {
  if (width === 'wide') {
    return 'relative left-1/2 w-screen max-w-[1440px] -translate-x-1/2';
  }

  if (width === 'narrow') {
    return 'mx-auto max-w-[680px]';
  }

  return 'mx-auto max-w-[1120px]';
}

function newsBlockSpacingClass(spacing: NewsBodyBlock['spacing']) {
  if (spacing === 'compact') {
    return 'py-[clamp(24px,4vw,48px)]';
  }

  if (spacing === 'loose') {
    return 'py-[clamp(72px,9vw,132px)]';
  }

  return 'py-[clamp(44px,6vw,84px)]';
}
