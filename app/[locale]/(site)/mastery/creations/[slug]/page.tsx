import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Reveal} from '@/components/motion/reveal';
import {HistoryBackButton} from '@/components/navigation/history-back-button';
import {SafeImage} from '@/components/safe-image';
import {CollectionDetailGallery} from '@/components/specialty/collection-detail-gallery';
import type {Locale} from '@/i18n/routing';
import {
  getCollectionItemForSite,
  getCollectionItemsForSite
} from '@/lib/cms/public-content';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {imageExists} from '@/lib/image-exists';
import {imageSrc} from '@/lib/image-src';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getDetailMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale; slug: string}>;
};

export const dynamic = 'force-dynamic';

const fallbackGalleryImages = [
  'collection_detail_01.png',
  'collection_detail_02.png',
  'collection_detail_03.png',
  'collection_detail_04.png',
  'collection_detail_05.png'
];

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, slug} = await params;
  const item = await getCollectionItemForSite(locale, slug);

  if (!item) {
    return getDetailMetadata(locale, '/mastery/creations', 'COLLECTION', '');
  }

  return getDetailMetadata(
    locale,
    `/mastery/creations/${slug}`,
    item.seoTitle,
    item.seoDescription,
    imageSrc(item.ogImagePath)
  );
}

export default async function CollectionDetailPage({params}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const item = await getCollectionItemForSite(locale, slug);

  if (!item) {
    notFound();
  }

  const text = messages.collectionUi.detail;
  const galleryImages = item.gallery.length > 0 ? item.gallery : [item.image, ...fallbackGalleryImages];
  const images = galleryImages.map((filename) => ({
    filename,
    alt: `${item.title} ${item.caption}`,
    hasImage: imageExists(filename)
  }));
  const related = (await getCollectionItemsForSite(locale)).filter((entry) => entry.id !== slug).slice(0, 4);
  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="bg-bg pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+20px)] md:pt-28">
        <div className="mx-auto max-w-[1280px] px-[var(--mobile-page-gutter)] pb-section pt-6 md:px-container md:pt-[clamp(40px,5vw,72px)]">
          <HistoryBackButton
            fallbackHref={resolveCmsHref(locale, text.backHref, '/mastery/creations')}
            ariaLabel={text.back}
            className="mobile-tap-target link-sweep no-underline inline-flex items-center justify-center border-0 bg-transparent p-0 font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent"
          />
          <h1 className="sr-only">{item.title}</h1>
          <div className="mt-8 md:mt-[clamp(40px,5vw,64px)]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.72fr)] lg:items-start lg:gap-16">
              <Reveal>
                <CollectionDetailGallery
                  images={images}
                  thumbnailLabel={text.thumbnailLabel}
                  previousLabel={text.previousImage}
                  nextLabel={text.nextImage}
                />
              </Reveal>
              <Reveal className="lg:sticky lg:top-32">
                <aside>
                  <div className="space-y-3.5 border-l-2 border-accent bg-white px-5 py-5 lg:px-6">
                    <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-accent">
                      {text.story}
                    </p>
                    <p className="mobile-copy break-words whitespace-pre-line font-body text-text lg:text-[14px] lg:leading-7">{item.story || item.caption}</p>
                  </div>
                </aside>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-[1280px] space-y-[clamp(48px,5vw,72px)] px-[var(--mobile-page-gutter)] md:px-container">
          <Reveal className="border-y border-hairline bg-white px-6 py-12 md:px-10 md:py-16">
            <div className="mx-auto max-w-2xl space-y-7 text-center">
              <div className="space-y-4">
                <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-accent">
                  {text.commissionEyebrow}
                </p>
                <p className="font-heading text-[clamp(20px,2.2vw,28px)] font-semibold leading-[1.3] text-primary [text-wrap:balance]">
                  {text.ctaTitle}
                </p>
              </div>
              <Link
                href={resolveCmsHref(locale, text.ctaHref, '/contact?type=bespoke&source=collection&item={slug}', {slug})}
                className="consult-cta consult-cta--accent consult-cta--large mx-auto w-fit shrink-0"
              >
                <span className="consult-cta__label">{text.cta}</span>
              </Link>
            </div>
          </Reveal>
          <div className="space-y-[clamp(32px,3.5vw,48px)]">
            <Reveal>
              <h2 className="font-heading text-[clamp(22px,2.4vw,32px)] font-semibold leading-[1.2] text-primary">
                {text.related}
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.href ?? resolveCmsHref(locale, `/mastery/creations/${entry.id}`)}
                  className="group block bg-white p-3 shadow-[0_14px_50px_rgba(16,29,48,0.05)] transition duration-hover ease-brand hover:-translate-y-1"
                >
                  <SafeImage filename={entry.image} alt={entry.title} aspect="aspect-[4/5] sm:aspect-square" variant="plain" />
                  <div className="space-y-2 px-2 pb-4 pt-5">
                    <p className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      {entry.categoryLabel}
                    </p>
                    <h3 className="font-heading text-[clamp(16px,1.5vw,19px)] font-semibold leading-snug text-primary">
                      {entry.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
