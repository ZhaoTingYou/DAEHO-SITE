import type {Metadata} from 'next';
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
  const messages = getLocaleMessages(locale);
  const content = messages.specialtyPages.collection;
  const text = messages.collectionUi;
  const items = getCollectionItemsForSite(locale);
  const filters = content.gallery.filters.map((filter) => ({
    ...filter,
    hasImage: Boolean(filter.image && imageExists(filter.image))
  }));

  return (
    <main className="bg-bg text-text">
      <section className="pt-28">
        <div className="mx-auto max-w-[1180px] px-container pb-[clamp(44px,5vw,80px)] pt-[clamp(64px,7vw,112px)]">
          <ScrollText className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
              {content.hero.eyebrow}
            </p>
            <h1 className="font-heading text-[clamp(30px,3.4vw,44px)] font-semibold leading-[1.12] text-primary">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-2xl font-body text-[14px] leading-[1.85] text-text">
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
