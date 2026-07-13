import type {Metadata} from 'next';
import Image from 'next/image';
import {setRequestLocale} from 'next-intl/server';

import {ScrollText} from '@/components/motion/scroll-text';
import {SpecialtyCollectionGallery} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {getCollectionItemsForSite} from '@/lib/cms/public-content';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'collection');
}

export default async function CollectionPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const content = messages.specialtyPages.collection;
  const text = messages.collectionUi;
  const items = await getCollectionItemsForSite(locale);
  const filters = content.gallery.filters.map((filter) => ({
    ...filter,
    hasImage: Boolean(filter.image && imageExists(filter.image))
  }));

  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="relative overflow-hidden bg-white pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+24px)] md:bg-bg md:pt-28">
        <h1 className="sr-only">
          {content.hero.title}
        </h1>
        <div className="md:hidden">
          <div className="mx-auto max-w-[520px] px-[var(--mobile-page-gutter)] pb-10 pt-6">
            <ScrollText className="space-y-5">
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                Curated Works
              </p>
              <p aria-hidden="true" className="mobile-display break-words [font-family:'Cormorant_Garamond',serif] font-bold uppercase text-primary">
                {content.hero.title}
              </p>
              <p className="max-w-[28rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.75] text-primary/82">
                {content.hero.subtitle}
              </p>
            </ScrollText>

            <figure className="mt-8 border-y border-primary/15 py-3">
              <div className="relative aspect-[4/5] overflow-hidden bg-white">
                <Image
                  src="/images/specialty_collection_hero.png"
                  alt=""
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover object-[63%_center]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_52%,rgba(255,255,255,.88)_100%)]" aria-hidden="true" />
              </div>
              <figcaption className="grid grid-cols-3 divide-x divide-primary/15 border-t border-primary/15 bg-white">
                {filters.map((filter, index) => (
                  <span key={filter.id} className="min-h-14 px-3 py-3 font-body text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.12em] text-primary/68">
                    <span className="block font-numeric text-[10px] text-accent/80">{String(index + 1).padStart(2, '0')}</span>
                    {filter.label}
                  </span>
                ))}
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="mx-auto hidden max-w-[1220px] px-container pb-[clamp(80px,8vw,132px)] pt-[clamp(70px,8vw,122px)] md:block">
          <ScrollText className="mx-auto max-w-[720px] space-y-[18px] text-center">
            <p aria-hidden="true" className="[font-family:'Cormorant_Garamond',serif] text-[clamp(40px,3.7vw,58px)] font-bold uppercase leading-none tracking-[0.04em] text-accent">
              {content.hero.title}
            </p>
            <p className="mx-auto max-w-xl whitespace-pre-line font-heading text-[15px] font-semibold leading-[1.85] text-primary">
              {content.hero.subtitle}
            </p>
          </ScrollText>
        </div>
      </section>

      <section>
        <SpecialtyCollectionGallery
          filters={filters}
          items={items}
          chooseLabel={text.chooseLabel}
          countSuffix={text.countSuffix}
          viewLabel={text.view}
          locale={locale}
        />
      </section>
    </main>
  );
}
