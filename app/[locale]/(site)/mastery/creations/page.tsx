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
        <div className="mx-auto max-w-[1220px] px-container pb-[clamp(80px,8vw,132px)] pt-[clamp(70px,8vw,122px)]">
          <ScrollText className="mx-auto max-w-[720px] space-y-[18px] text-center">
            <h1 className="[font-family:'Cormorant_Garamond',serif] text-[clamp(40px,3.7vw,58px)] font-bold uppercase leading-none tracking-[0.04em] text-accent">
              {content.hero.title}
            </h1>
            <p className="mx-auto max-w-xl font-heading text-[15px] font-semibold leading-[1.85] text-primary">
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
