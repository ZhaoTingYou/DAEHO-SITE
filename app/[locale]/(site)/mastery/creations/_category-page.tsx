import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {SpecialtyCollectionCategory} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {getCollectionItemsForSite} from '@/lib/cms/public-content';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getCmsPageSeoOverride, getDetailMetadata} from '@/lib/seo';

export type CollectionCategoryId = 'champion' | 'appointment' | 'bespoke';

type CategoryPageProps = {
  params: Promise<{locale: Locale}>;
  categoryId: CollectionCategoryId;
};

export const dynamic = 'force-dynamic';

export async function getCollectionCategoryMetadata({
  params,
  categoryId
}: CategoryPageProps): Promise<Metadata> {
  const {locale} = await params;
  const messages = await getLocaleMessages(locale);
  const category = messages.specialtyPages.collection.gallery.filters.find((filter) => filter.id === categoryId);

  if (!category) {
    return getDetailMetadata(locale, '/mastery/creations', 'COLLECTION', '');
  }

  const seo = await getCmsPageSeoOverride(locale, `mastery-creations-${categoryId}`);

  return getDetailMetadata(
    locale,
    `/mastery/creations/${categoryId}`,
    seo.title || category.label,
    seo.description || category.description || '',
    seo.image || undefined
  );
}

export async function CollectionCategoryPage({params, categoryId}: CategoryPageProps) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const content = messages.specialtyPages.collection;
  const text = messages.collectionUi;
  const filters = content.gallery.filters.map((filter) => ({
    ...filter,
    hasImage: Boolean(filter.image && imageExists(filter.image))
  }));
  const items = await getCollectionItemsForSite(locale);

  if (!filters.some((filter) => filter.id === categoryId)) {
    notFound();
  }

  return (
    <main className="bg-[#F8F6F2] pb-[clamp(84px,9vw,132px)] pt-28 text-text">
      <SpecialtyCollectionCategory
        categoryId={categoryId}
        filters={filters}
        items={items}
        empty={text.empty}
        filterLabel={text.filtersLabel}
        allLabel={text.allCategories}
        countSuffix={text.countSuffix}
        finder={text.finder}
        appointment={text.appointment}
        bespoke={text.bespoke}
        locale={locale}
      />
    </main>
  );
}
