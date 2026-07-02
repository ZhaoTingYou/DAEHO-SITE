import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Reveal} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import {CollectionDetailGallery} from '@/components/specialty/collection-detail-gallery';
import type {Locale} from '@/i18n/routing';
import {routing} from '@/i18n/routing';
import {
  getCollectionItemForSite,
  getCollectionItemsForSite
} from '@/lib/cms/public-content';
import {imageExists} from '@/lib/image-exists';
import {imageSrc} from '@/lib/image-src';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getDetailMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';
import koMessages from '@/messages/ko.json';

type Props = {
  params: Promise<{locale: Locale; slug: string}>;
};

export const dynamic = 'force-dynamic';

const detailImages = [
  'collection_detail_01.png',
  'collection_detail_02.png',
  'collection_detail_03.png',
  'collection_detail_04.png',
  'collection_detail_05.png'
];

export function generateStaticParams() {
  const slugs = koMessages.specialtyPages.collection.gallery.items.map((item) => item.id);
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({locale, slug})));
}

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
  const galleryImages = item.gallery.length > 0 ? item.gallery : [item.image, ...detailImages];
  const images = galleryImages.map((filename) => ({
    filename,
    alt: `${item.title} ${item.caption}`,
    hasImage: imageExists(filename)
  }));
  const related = (await getCollectionItemsForSite(locale)).filter((entry) => entry.id !== slug).slice(0, 4);
  const specs = [
    [text.material, text.placeholder],
    [text.stones, text.placeholder],
    [text.year, item.year || '20XX'],
    [text.madeFor, text.placeholder],
    [text.specs, item.categoryLabel]
  ];

  return (
    <main className="bg-bg text-text">
      <section className="bg-bg pt-28">
        <div className="mx-auto max-w-[1280px] px-container pb-section pt-[clamp(40px,5vw,72px)]">
          <Link
            href={withLocale(locale, '/mastery/creations')}
            aria-label={text.back}
            className="link-sweep no-underline font-body text-[20px] font-semibold leading-none text-primary transition duration-hover ease-brand hover:text-accent"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="mt-[clamp(40px,5vw,64px)] grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.72fr)] lg:items-start lg:gap-16">
            <Reveal>
              <CollectionDetailGallery images={images} thumbnailLabel={text.thumbnailLabel} />
            </Reveal>
            <Reveal className="lg:sticky lg:top-32">
              <aside className="space-y-9 bg-bg p-6 shadow-[0_18px_70px_rgba(16,29,48,0.06)] md:p-9">
                <div className="space-y-4">
                  <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-accent">
                    {item.categoryLabel}
                  </p>
                  <h1 className="font-heading text-[clamp(24px,2.8vw,36px)] font-semibold leading-[1.15] text-primary">
                    {item.title}
                  </h1>
                  <p className="font-body text-[14px] leading-7 text-text">{item.caption}</p>
                </div>
                <div className="space-y-1">
                  {specs.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[0.8fr_1.2fr] gap-5 border-t border-hairline py-4 font-body text-[15px]">
                      <span className="font-semibold uppercase tracking-[0.16em] text-subtext">{label}</span>
                      <span className="text-right text-primary">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3.5 border-l-2 border-accent bg-white px-6 py-5">
                  <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-accent">
                    {text.story}
                  </p>
                  <p className="font-body text-[14px] leading-7 text-text">{item.story || item.caption}</p>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-[1280px] space-y-[clamp(40px,4vw,56px)] px-container">
          <Reveal>
            <h2 className="font-heading text-[clamp(22px,2.4vw,32px)] font-semibold leading-[1.2] text-primary">
              {text.detailStrip}
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {galleryImages.slice(1, 4).map((filename) => (
              <Reveal key={filename}>
                <div className="hover-zoom">
                  <div className="hover-zoom-media">
                    <SafeImage filename={filename} alt={text.detailStrip} aspect="aspect-square" variant="plain" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg py-section">
        <Reveal className="mx-auto max-w-3xl space-y-7 px-container text-center">
          <p className="font-heading text-[clamp(22px,2.4vw,32px)] font-semibold leading-[1.25] text-primary">
            {text.processTitle}
          </p>
          <Link href={withLocale(locale, '/mastery/making')} className="link-sweep inline-flex font-body text-[12px] font-semibold uppercase tracking-[0.16em]">
            {text.processCta}
          </Link>
        </Reveal>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto max-w-[1280px] space-y-[clamp(48px,5vw,72px)] px-container">
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
                href={withLocale(locale, `/contact?type=bespoke&source=collection&item=${slug}`)}
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
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-8">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={withLocale(locale, `/mastery/creations/${entry.id}`)}
                  className="group block bg-white p-3 shadow-[0_14px_50px_rgba(16,29,48,0.05)] transition duration-hover ease-brand hover:-translate-y-1"
                >
                  <SafeImage filename={entry.image} alt={entry.title} aspect="aspect-square" variant="plain" />
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
